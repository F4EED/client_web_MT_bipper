import type { ReadonlySignal } from "@meshtastic/sdk";
import { useCallback, useSyncExternalStore } from "react";

/**
 * Subscribes a component to a SDK ReadonlySignal and returns the current value.
 *
 * Uses useSyncExternalStore so concurrent-mode renders see a consistent
 * snapshot. subscribe / getSnapshot are memoized on `sig` identity so
 * switching conversation buckets (channel 0 → 1 → 2) reliably tears down
 * the old subscription and reads the new signal's value.
 */
export function useSignal<T>(sig: ReadonlySignal<T>): T {
  const subscribe = useCallback(
    (onStoreChange: () => void) => sig.subscribe(onStoreChange),
    [sig],
  );
  const getSnapshot = useCallback(() => sig.value, [sig]);
  const getServerSnapshot = useCallback(() => sig.peek(), [sig]);
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
