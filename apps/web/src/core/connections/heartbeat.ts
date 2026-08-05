import type { ConnectionId } from "@core/stores/deviceStore/types";
import type { MeshDevice } from "@meshtastic/sdk";

const HEARTBEAT_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes (post-config)
/** Re-send wantConfigId while configuring — heartbeats alone do not restart a lost handshake. */
const CONFIG_HANDSHAKE_RETRY_MS = 4_000;

const heartbeats = new Map<ConnectionId, ReturnType<typeof setInterval>>();

/**
 * Stops + clears any active heartbeat for the connection. Safe to call when
 * no heartbeat is running.
 */
export function stopHeartbeat(id: ConnectionId): void {
  const h = heartbeats.get(id);
  if (!h) return;
  clearInterval(h);
  heartbeats.delete(id);
}

/**
 * Fast-cadence handshake retry used while the device is in `configuring`.
 * ESP32 USB/CH340 often reboots on `port.open()`; the first `wantConfigId`
 * can be lost. Re-issuing `configure()` recovers without waiting for the
 * 60s queue timeout on the initial packet.
 */
export function startConfigHeartbeat(
  id: ConnectionId,
  meshDevice: MeshDevice,
): void {
  stopHeartbeat(id);
  const intervalId = setInterval(() => {
    meshDevice.configure().catch((error) => {
      console.warn("[heartbeat] config handshake retry failed:", error);
    });
  }, CONFIG_HANDSHAKE_RETRY_MS);
  heartbeats.set(id, intervalId);
}

/**
 * Slow-cadence keep-alive used after configuration completes.
 */
export function startMaintenanceHeartbeat(
  id: ConnectionId,
  meshDevice: MeshDevice,
): void {
  stopHeartbeat(id);
  const intervalId = setInterval(() => {
    meshDevice.heartbeat().catch((error) => {
      console.warn("[heartbeat] maintenance heartbeat failed:", error);
    });
  }, HEARTBEAT_INTERVAL_MS);
  heartbeats.set(id, intervalId);
}
