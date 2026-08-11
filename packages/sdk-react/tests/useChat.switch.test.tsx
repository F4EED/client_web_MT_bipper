import { act, renderHook, waitFor } from "@testing-library/react";
import { MeshClient, ChannelNumber } from "@meshtastic/sdk";
import { createFakeTransport } from "@meshtastic/sdk/testing";
import { describe, expect, it } from "vitest";
import { MeshProvider, useChat } from "../mod.ts";

function setup() {
  const handle = createFakeTransport();
  const client = new MeshClient({ transport: handle.transport });
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <MeshProvider client={client}>{children}</MeshProvider>
  );
  return { client, handle, wrapper };
}

describe("useChat channel switch", () => {
  it("shows different buckets when channel prop changes", () => {
    const { client, wrapper } = setup();

    client.events.onMessagePacket.dispatch({
      id: 1,
      from: 7,
      to: 0xffffffff,
      channel: ChannelNumber.Primary,
      type: "broadcast",
      rxTime: new Date(1000),
      data: "on-0",
    });

    const { result, rerender } = renderHook(({ ch }) => useChat(ch), {
      wrapper,
      initialProps: { ch: ChannelNumber.Primary },
    });
    expect(result.current.messages.map((m) => m.text)).toEqual(["on-0"]);

    rerender({ ch: ChannelNumber.Channel1 });
    expect(result.current.messages.map((m) => m.text)).toEqual([]);

    act(() => {
      client.events.onMessagePacket.dispatch({
        id: 2,
        from: 7,
        to: 0xffffffff,
        channel: ChannelNumber.Channel1,
        type: "broadcast",
        rxTime: new Date(2000),
        data: "on-1",
      });
    });
    expect(result.current.messages.map((m) => m.text)).toEqual(["on-1"]);

    rerender({ ch: ChannelNumber.Primary });
    expect(result.current.messages.map((m) => m.text)).toEqual(["on-0"]);
  });
});
