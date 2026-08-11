import { describe, expect, it } from "vitest";
import { MeshClient } from "../../core/client/MeshClient.ts";
import { createFakeTransport } from "../../core/testing/createFakeTransport.ts";
import { ChannelNumber } from "../../core/types.ts";
import type { Message } from "./domain/Message.ts";
import { MessageState } from "./domain/MessageState.ts";
import { InMemoryMessageRepository } from "./infrastructure/repositories/InMemoryMessageRepository.ts";

describe("ensureHydrated cross-channel", () => {
  it("hydrating channel 1 must not copy channel 0 history", async () => {
    const repository = new InMemoryMessageRepository();
    const msg: Message = {
      id: 1,
      from: 7,
      to: 0xffffffff,
      channel: ChannelNumber.Primary,
      rxTime: new Date(1000),
      type: "broadcast",
      text: "only-ch0",
      state: MessageState.Ack,
    };
    await repository.append(msg);

    const { transport } = createFakeTransport();
    const client = new MeshClient({
      transport,
      chat: { repository, initialLoadLimit: 50 },
    });

    // Visit ch0 then ch1 then ch2 like the UI
    const s0 = client.chat.messages(ChannelNumber.Primary);
    await new Promise((r) => setTimeout(r, 20));
    expect(s0.value.map((m) => m.text)).toEqual(["only-ch0"]);

    const s1 = client.chat.messages(ChannelNumber.Channel1);
    const s2 = client.chat.messages(ChannelNumber.Channel2);
    await new Promise((r) => setTimeout(r, 20));

    expect(s1.value).toEqual([]);
    expect(s2.value).toEqual([]);
    expect(s0.value.map((m) => m.text)).toEqual(["only-ch0"]);
  });

  it("live packet on ch0 must not appear in other buckets after visiting them", async () => {
    const { transport } = createFakeTransport();
    const client = new MeshClient({ transport });

    const s0 = client.chat.messages(ChannelNumber.Primary);
    client.events.onMessagePacket.dispatch({
      id: 5,
      from: 7,
      to: 0xffffffff,
      channel: ChannelNumber.Primary,
      type: "broadcast",
      rxTime: new Date(1000),
      data: "live-ch0",
    });

    const s1 = client.chat.messages(ChannelNumber.Channel1);
    const s2 = client.chat.messages(ChannelNumber.Channel2);

    expect(s0.value.map((m) => m.text)).toEqual(["live-ch0"]);
    expect(s1.value).toEqual([]);
    expect(s2.value).toEqual([]);
  });
});
