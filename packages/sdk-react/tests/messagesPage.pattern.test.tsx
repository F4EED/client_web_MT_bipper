import { act, renderHook } from "@testing-library/react";
import { MeshClient, ChannelNumber } from "@meshtastic/sdk";
import { createFakeTransport } from "@meshtastic/sdk/testing";
import { describe, expect, it } from "vitest";
import { MeshProvider, useChat, useDirectChat } from "../mod.ts";

/**
 * Mirrors apps/web Messages.tsx calling useChatAsLegacyMessages TWICE
 * (broadcast + direct) on every render.
 */
function useMessagesPagePattern(channelId: number, isBroadcast: boolean) {
  // call 1: always "broadcast" params in Messages.tsx
  const broadcastHook = useChat(channelId as ChannelNumber);
  const _direct0 = useDirectChat(0);
  // call 2: always "direct" params in Messages.tsx
  const _broadcast0 = useChat(0 as ChannelNumber);
  const directHook = useDirectChat(channelId);

  return isBroadcast ? broadcastHook.messages : directHook.messages;
}

function setup() {
  const handle = createFakeTransport();
  const client = new MeshClient({ transport: handle.transport });
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <MeshProvider client={client}>{children}</MeshProvider>
  );
  return { client, handle, wrapper };
}

describe("Messages.tsx double-hook pattern", () => {
  it("does not leak channel 0 messages into channel 1/2 tabs", () => {
    const { client, wrapper } = setup();

    act(() => {
      client.events.onMessagePacket.dispatch({
        id: 1,
        from: 7,
        to: 0xffffffff,
        channel: ChannelNumber.Primary,
        type: "broadcast",
        rxTime: new Date(1000),
        data: "hello-balise",
      });
    });

    const { result, rerender } = renderHook(
      ({ ch }) => useMessagesPagePattern(ch, true),
      { wrapper, initialProps: { ch: 0 } },
    );
    expect(result.current.map((m) => m.text)).toEqual(["hello-balise"]);

    rerender({ ch: 1 });
    expect(result.current.map((m) => m.text)).toEqual([]);

    rerender({ ch: 2 });
    expect(result.current.map((m) => m.text)).toEqual([]);

    rerender({ ch: 0 });
    expect(result.current.map((m) => m.text)).toEqual(["hello-balise"]);
  });
});
