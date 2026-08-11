import { describe, expect, it } from "vitest";
import { MeshClient } from "../../core/client/MeshClient.ts";
import { createFakeTransport } from "../../core/testing/createFakeTransport.ts";
import { ChannelNumber } from "../../core/types.ts";

describe("ChatClient cross-channel packet-id dedupe", () => {
  it("does not append the same packet id into a second channel bucket", () => {
    const { transport } = createFakeTransport();
    const client = new MeshClient({ transport });
    const s0 = client.chat.messages(ChannelNumber.Primary);
    const s1 = client.chat.messages(ChannelNumber.Channel1);

    client.events.onMessagePacket.dispatch({
      id: 99,
      from: 7,
      to: 0xffffffff,
      channel: ChannelNumber.Primary,
      type: "broadcast",
      rxTime: new Date(1000),
      data: "once",
    });
    // Same id, different channel (firmware echo / mis-tag) must be ignored.
    client.events.onMessagePacket.dispatch({
      id: 99,
      from: 7,
      to: 0xffffffff,
      channel: ChannelNumber.Channel1,
      type: "broadcast",
      rxTime: new Date(1000),
      data: "once",
    });

    expect(s0.value.map((m) => m.text)).toEqual(["once"]);
    expect(s1.value).toEqual([]);
  });
});
