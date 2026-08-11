import { ChannelNumber, type Message, MessageState } from "@meshtastic/sdk";
import { describe, expect, it, beforeEach } from "vitest";
import type { SqlocalDb } from "../db.ts";
import { createMemoryDb } from "../testing/createMemoryDb.ts";
import { SqlocalMessageRepository } from "./SqlocalMessageRepository.ts";
import { messages } from "../schema/chat.ts";

function msg(id: number, channel: ChannelNumber, text: string): Message {
  return {
    id,
    from: 1,
    to: 0xffffffff,
    channel,
    rxTime: new Date(1000 + id),
    type: "broadcast",
    text,
    state: MessageState.Ack,
  };
}

describe("SqlocalMessageRepository channel isolation", () => {
  let db: SqlocalDb;
  let repo: SqlocalMessageRepository;

  beforeEach(async () => {
    db = await createMemoryDb();
    repo = new SqlocalMessageRepository(db, { deviceId: 1 });
  });

  it("does not return channel 0 messages when loading channel 1", async () => {
    await repo.append(msg(1, ChannelNumber.Primary, "on-0"));
    await repo.append(msg(2, ChannelNumber.Channel1, "on-1"));
    await repo.append(msg(3, ChannelNumber.Channel2, "on-2"));

    const c0 = await repo.loadRecent(
      { kind: "channel", channel: ChannelNumber.Primary },
      10,
    );
    const c1 = await repo.loadRecent(
      { kind: "channel", channel: ChannelNumber.Channel1 },
      10,
    );
    const c2 = await repo.loadRecent(
      { kind: "channel", channel: ChannelNumber.Channel2 },
      10,
    );

    expect(c0.map((m) => m.text)).toEqual(["on-0"]);
    expect(c1.map((m) => m.text)).toEqual(["on-1"]);
    expect(c2.map((m) => m.text)).toEqual(["on-2"]);
  });

  it("onConflictDoNothing with real PK keeps a single row per packet id", async () => {
    const same = msg(42, ChannelNumber.Primary, "hello");
    await repo.append(same);
    await repo.append({ ...same, channel: ChannelNumber.Channel1 });

    const all = await db.select().from(messages);
    const c0 = await repo.loadRecent(
      { kind: "channel", channel: ChannelNumber.Primary },
      10,
    );
    const c1 = await repo.loadRecent(
      { kind: "channel", channel: ChannelNumber.Channel1 },
      10,
    );
    // First write wins — second insert is ignored by PRIMARY KEY (device_id, id).
    expect(all).toHaveLength(1);
    expect(c0.map((m) => m.text)).toEqual(["hello"]);
    expect(c1).toHaveLength(0);
  });
});
