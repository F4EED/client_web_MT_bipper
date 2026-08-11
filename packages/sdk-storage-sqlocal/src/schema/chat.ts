import {
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";

export const messages = sqliteTable(
  "messages",
  {
    /**
     * Packet IDs are unique per device. A single mesh packet must live in
     * exactly one conversation — PRIMARY KEY (device_id, id) enforces that
     * so `onConflictDoNothing` actually dedupes instead of silently
     * inserting the same id under multiple conversation_key values.
     */
    id: integer("id").notNull(),
    deviceId: integer("device_id").notNull(),
    conversationKey: text("conversation_key").notNull(),
    fromNode: integer("from_node").notNull(),
    toNode: integer("to_node").notNull(),
    channel: integer("channel").notNull(),
    rxTime: integer("rx_time").notNull(),
    type: text("type", { enum: ["broadcast", "direct"] }).notNull(),
    text: text("text").notNull(),
    state: text("state", { enum: ["pending", "ack", "failed"] }).notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.deviceId, t.id] }),
    convRxTime: index("idx_messages_conv_rxtime").on(
      t.deviceId,
      t.conversationKey,
      t.rxTime,
    ),
    pending: index("idx_messages_pending").on(t.deviceId, t.state),
  }),
);

export type MessageRow = typeof messages.$inferSelect;
export type MessageInsert = typeof messages.$inferInsert;
