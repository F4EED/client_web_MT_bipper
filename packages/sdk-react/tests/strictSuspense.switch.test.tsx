import { act, renderHook, screen, render } from "@testing-library/react";
import { MeshClient, ChannelNumber } from "@meshtastic/sdk";
import { createFakeTransport } from "@meshtastic/sdk/testing";
import { describe, expect, it } from "vitest";
import React, { StrictMode, Suspense } from "react";
import { MeshProvider, useChat } from "../mod.ts";

function setup() {
  const handle = createFakeTransport();
  const client = new MeshClient({ transport: handle.transport });
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <StrictMode>
      <MeshProvider client={client}>{children}</MeshProvider>
    </StrictMode>
  );
  return { client, handle, wrapper };
}

function ChatView({ channel }: { channel: ChannelNumber }) {
  const { messages } = useChat(channel);
  return (
    <Suspense fallback={<div>loading</div>}>
      <div data-testid="texts">
        {messages.map((m) => m.text).join("|") || "EMPTY"}
      </div>
      <ul>
        {messages.map((m) => (
          <Suspense key={m.id} fallback={<li>skel</li>}>
            <li data-testid={`msg-${m.id}`}>{m.text}</li>
          </Suspense>
        ))}
      </ul>
    </Suspense>
  );
}

describe("StrictMode+Suspense channel switch", () => {
  it("clears messages when switching to empty channel", () => {
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

    const { rerender } = render(<ChatView channel={ChannelNumber.Primary} />, {
      wrapper,
    });
    expect(screen.getByTestId("texts").textContent).toBe("hello-balise");

    rerender(<ChatView channel={ChannelNumber.Channel1} />);
    expect(screen.getByTestId("texts").textContent).toBe("EMPTY");

    rerender(<ChatView channel={ChannelNumber.Channel2} />);
    expect(screen.getByTestId("texts").textContent).toBe("EMPTY");

    rerender(<ChatView channel={ChannelNumber.Primary} />);
    expect(screen.getByTestId("texts").textContent).toBe("hello-balise");
  });
});
