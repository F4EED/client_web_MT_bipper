import { useCallback, useSyncExternalStore } from "react";
import type { ReadonlySignal } from "../core/index.ts";

/**
 * Subscribes a component to a `ReadonlySignal` and returns its current value.
 *
 * Uses `useSyncExternalStore` so concurrent-mode renders see a consistent
 * snapshot. Mirrors `@meshtastic/sdk-react`'s `useSignal` (PR #1050).
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
