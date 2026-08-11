import { act, renderHook } from "@testing-library/react";
import { createStore } from "@meshtastic/sdk";
import { describe, expect, it } from "vitest";
import { useSignal } from "../src/adapters/useSignal.ts";

describe("useSignal channel switch", () => {
  it("returns the new signal value when sig identity changes", () => {
    const ch0 = createStore<string[]>(["msg-on-0"]);
    const ch1 = createStore<string[]>([]);

    const { result, rerender } = renderHook(({ sig }) => useSignal(sig), {
      initialProps: { sig: ch0.read },
    });
    expect(result.current).toEqual(["msg-on-0"]);

    rerender({ sig: ch1.read });
    expect(result.current).toEqual([]);

    act(() => {
      ch1.write.value = ["msg-on-1"];
    });
    expect(result.current).toEqual(["msg-on-1"]);

    rerender({ sig: ch0.read });
    expect(result.current).toEqual(["msg-on-0"]);
  });

  it("updates after switch when old store also fires", () => {
    const ch0 = createStore<string[]>(["a"]);
    const ch1 = createStore<string[]>(["b"]);

    const { result, rerender } = renderHook(({ sig }) => useSignal(sig), {
      initialProps: { sig: ch0.read },
    });
    expect(result.current).toEqual(["a"]);

    rerender({ sig: ch1.read });
    expect(result.current).toEqual(["b"]);

    act(() => {
      ch0.write.value = ["a2"];
    });
    // still subscribed to ch1 — must not flip back to ch0
    expect(result.current).toEqual(["b"]);
  });
});
