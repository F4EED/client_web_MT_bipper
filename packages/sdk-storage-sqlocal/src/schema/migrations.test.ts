import { describe, expect, it } from "vitest";
import initSqlJs from "sql.js";
import { MIGRATIONS } from "./migrations.ts";

async function freshSqlite() {
  const SQL = await initSqlJs({});
  return new SQL.Database();
}

describe("MIGRATIONS", () => {
  it("first migration creates messages, nodes, telemetry, _schema", async () => {
    const db = await freshSqlite();
    for (const stmt of MIGRATIONS[0]!.sql) db.run(stmt);
    db.run("INSERT INTO _schema (version) VALUES (?)", [
      MIGRATIONS[0]!.version,
    ]);

    const tables = db
      .exec(
        "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name",
      )[0]
      ?.values.flat() as string[];
    expect(tables).toEqual(
      expect.arrayContaining(["_schema", "messages", "nodes", "telemetry"]),
    );

    const version = db.exec("SELECT MAX(version) FROM _schema")[0]
      ?.values[0]?.[0];
    expect(version).toBe(MIGRATIONS[0]!.version);
  });

  it("messages indexes are present after v1", async () => {
    const db = await freshSqlite();
    for (const stmt of MIGRATIONS[0]!.sql) db.run(stmt);
    const indexes = db
      .exec(
        "SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='messages' ORDER BY name",
      )[0]
      ?.values.flat() as string[];
    expect(indexes).toEqual(
      expect.arrayContaining([
        "idx_messages_conv_rxtime",
        "idx_messages_pending",
        "messages_pk",
      ]),
    );
  });

  it("v3 promotes messages_pk into a real PRIMARY KEY and drops duplicate ids", async () => {
    const db = await freshSqlite();
    for (const migration of MIGRATIONS) {
      if (migration.version > 2) break;
      for (const stmt of migration.sql) db.run(stmt);
      db.run("INSERT OR IGNORE INTO _schema (version) VALUES (?)", [
        migration.version,
      ]);
    }

    // Same packet id under two conversation keys (the v1 schema allowed this).
    db.run(
      `INSERT INTO messages (id, device_id, conversation_key, from_node, to_node, channel, rx_time, type, text, state)
       VALUES (42, 1, 'channel:0', 7, 4294967295, 0, 1000, 'broadcast', 'dup', 'ack')`,
    );
    db.run(
      `INSERT INTO messages (id, device_id, conversation_key, from_node, to_node, channel, rx_time, type, text, state)
       VALUES (42, 1, 'channel:1', 7, 4294967295, 1, 2000, 'broadcast', 'dup', 'ack')`,
    );

    const v3 = MIGRATIONS.find((m) => m.version === 3)!;
    for (const stmt of v3.sql) db.run(stmt);

    const rows = db.exec(
      "SELECT conversation_key, rx_time FROM messages WHERE id = 42 AND device_id = 1",
    )[0]?.values;
    expect(rows).toHaveLength(1);
    // Consistent conversation_key wins; both rows matched, so newest (channel:1).
    expect(rows![0]![0]).toBe("channel:1");

    const tableSql = db.exec(
      "SELECT sql FROM sqlite_master WHERE type='table' AND name='messages'",
    )[0]?.values[0]?.[0] as string;
    expect(tableSql.toUpperCase()).toContain("PRIMARY KEY");
  });

  it("v3 prefers conversation_key matching channel over a newer mismatch", async () => {
    const db = await freshSqlite();
    for (const migration of MIGRATIONS) {
      if (migration.version > 2) break;
      for (const stmt of migration.sql) db.run(stmt);
      db.run("INSERT OR IGNORE INTO _schema (version) VALUES (?)", [
        migration.version,
      ]);
    }

    db.run(
      `INSERT INTO messages (id, device_id, conversation_key, from_node, to_node, channel, rx_time, type, text, state)
       VALUES (7, 1, 'channel:2', 9, 4294967295, 2, 1000, 'broadcast', 'ok', 'ack')`,
    );
    db.run(
      `INSERT INTO messages (id, device_id, conversation_key, from_node, to_node, channel, rx_time, type, text, state)
       VALUES (7, 1, 'channel:0', 9, 4294967295, 2, 9000, 'broadcast', 'ok', 'ack')`,
    );

    const v3 = MIGRATIONS.find((m) => m.version === 3)!;
    for (const stmt of v3.sql) db.run(stmt);

    const rows = db.exec(
      "SELECT conversation_key FROM messages WHERE id = 7 AND device_id = 1",
    )[0]?.values;
    expect(rows).toHaveLength(1);
    expect(rows![0]![0]).toBe("channel:2");
  });

  it("re-applying v1 statements is idempotent (CREATE IF NOT EXISTS)", async () => {
    const db = await freshSqlite();
    for (const stmt of MIGRATIONS[0]!.sql) db.run(stmt);
    expect(() => {
      for (const stmt of MIGRATIONS[0]!.sql) db.run(stmt);
    }).not.toThrow();
  });
});
