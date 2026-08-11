import { describe, expect, it } from "vitest";
import { MeshClient } from "../../core/client/MeshClient.ts";
import { createFakeTransport } from "../../core/testing/createFakeTransport.ts";
import { ChannelNumber } from "../../core/types.ts";

describe("ChatClient channel bucketing", () => {
  it("puts inbound messages only in the packet channel bucket", async () => {
    const { transport } = createFakeTransport();
    const client = new MeshClient({ transport });

    // Touch all three buckets so signals exist
    const s0 = client.chat.messages(ChannelNumber.Primary);
    const s1 = client.chat.messages(ChannelNumber.Channel1);
    const s2 = client.chat.messages(ChannelNumber.Channel2);

    client.events.onMessagePacket.dispatch({
      id: 99,
      from: 7,
      to: 0xffffffff,
      channel: ChannelNumber.Primary,
      type: "broadcast",
      rxTime: new Date(1000),
      data: "only-on-0",
    });

    expect(s0.value.map((m) => m.text)).toEqual(["only-on-0"]);
    expect(s1.value).toEqual([]);
    expect(s2.value).toEqual([]);
  });

  it("isolates channel 1 from channel 0", () => {
    const { transport } = createFakeTransport();
    const client = new MeshClient({ transport });
    const s0 = client.chat.messages(ChannelNumber.Primary);
    const s1 = client.chat.messages(ChannelNumber.Channel1);

    client.events.onMessagePacket.dispatch({
      id: 1,
      from: 7,
      to: 0xffffffff,
      channel: ChannelNumber.Channel1,
      type: "broadcast",
      rxTime: new Date(1000),
      data: "only-on-1",
    });

    expect(s0.value).toEqual([]);
    expect(s1.value.map((m) => m.text)).toEqual(["only-on-1"]);
  });
});
