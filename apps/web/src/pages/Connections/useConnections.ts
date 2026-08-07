import {
  startConfigHeartbeat,
  startMaintenanceHeartbeat,
  stopHeartbeat,
} from "@app/core/connections/heartbeat.ts";
import { buildMeshDevice } from "@app/core/connections/sdkClient.ts";
import {
  closeTransport,
  openTransport,
  probeConnection,
} from "@app/core/connections/transports.ts";
import { createLogger, DeviceStatusEnum } from "@meshtastic/sdk";

const log = createLogger("useConnections");
import type {
  Connection,
  ConnectionId,
  ConnectionStatus,
  NewConnection,
} from "@app/core/stores/deviceStore/types";
import { createConnectionFromInput } from "@app/pages/Connections/utils";
import { meshRegistry } from "@core/meshRegistry.ts";
import { useAppStore, useDeviceStore } from "@core/stores";
import { subscribeAll } from "@core/subscriptions.ts";
import { randId } from "@core/utils/randId.ts";
import { useCallback } from "react";

// Per-connection out-of-band handles tracked outside Zustand:
//   - cachedTransports: held BT device / serial port for reconnect + cleanup.
//   - configSubscriptions: onConfigComplete unsubscribers.
const cachedTransports = new Map<ConnectionId, BluetoothDevice | SerialPort>();
const configSubscriptions = new Map<ConnectionId, () => void>();

export function useConnections() {
  const connections = useDeviceStore((s) => s.savedConnections);
  const addSavedConnection = useDeviceStore((s) => s.addSavedConnection);
  const updateSavedConnection = useDeviceStore((s) => s.updateSavedConnection);
  const removeSavedConnectionFromStore = useDeviceStore(
    (s) => s.removeSavedConnection,
  );
  const setActiveConnectionId = useDeviceStore((s) => s.setActiveConnectionId);
  const { addDevice } = useDeviceStore();
  const { setSelectedDevice } = useAppStore();
  const selectedDeviceId = useAppStore((s) => s.selectedDeviceId);

  const updateStatus = useCallback(
    (id: ConnectionId, status: ConnectionStatus, error?: string) => {
      updateSavedConnection(id, {
        status,
        error: error || undefined,
        ...(status === "disconnected" ? { lastConnectedAt: Date.now() } : {}),
      });
    },
    [updateSavedConnection],
  );

  const teardown = useCallback(
    async (
      id: ConnectionId,
      conn?: Connection,
      opts: { releaseSerial?: boolean } = {},
    ) => {
      log.debug("teardown: enter", {
        id,
        releaseSerial: !!opts.releaseSerial,
      });
      stopHeartbeat(id);
      configSubscriptions.get(id)?.();
      configSubscriptions.delete(id);

      if (conn?.meshDeviceId) {
        const device = useDeviceStore.getState().getDevice(conn.meshDeviceId);
        try {
          // Soft disconnect keeps the SerialPort open so reconnect does not
          // pulse DTR/RTS (ESP32/CH340 auto-reset). Hard-release only when
          // removing the saved connection.
          const transport = device?.connection as
            | {
                disconnect?: () => Promise<void>;
                releasePort?: () => Promise<void>;
              }
            | undefined;
          if (opts.releaseSerial && transport?.releasePort) {
            await transport.releasePort();
          } else {
            await transport?.disconnect?.();
          }
          log.debug("teardown: transport disconnect awaited");
        } catch (e) {
          const err = e as Error;
          log.warn("teardown: transport disconnect threw", {
            name: err?.name,
            message: err?.message,
          });
        }
      }

      const cached = cachedTransports.get(id);
      if (opts.releaseSerial) {
        closeTransport(cached, { releaseSerial: true });
        cachedTransports.delete(id);
      } else if (cached && "gatt" in cached) {
        // Drop BT GATT only; keep SerialPort handle for reset-free reconnect.
        closeTransport(cached);
        cachedTransports.delete(id);
      }
      log.debug("teardown: done", { id });
    },
    [],
  );

  const removeConnection = useCallback(
    async (id: ConnectionId) => {
      const conn = connections.find((c) => c.id === id);
      await teardown(id, conn, { releaseSerial: true });
      if (conn?.meshDeviceId) {
        try {
          useDeviceStore.getState().removeDevice(conn.meshDeviceId);
        } catch {}
      }
      meshRegistry.unregister(id);
      removeSavedConnectionFromStore(id);
    },
    [connections, removeSavedConnectionFromStore, teardown],
  );

  const setDefaultConnection = useCallback(
    (id: ConnectionId) => {
      const conn = connections.find((c) => c.id === id);
      if (!conn) return;
      updateSavedConnection(id, { isDefault: !conn.isDefault });
    },
    [connections, updateSavedConnection],
  );

  const setupMeshDevice = useCallback(
    async (
      id: ConnectionId,
      transport: Awaited<ReturnType<typeof openTransport>>["transport"],
      bluetoothDevice?: BluetoothDevice,
      serialPort?: SerialPort,
    ): Promise<number> => {
      // Reuse existing meshDeviceId if the device entry still exists; otherwise mint a new one.
      const conn = connections.find((c) => c.id === id);
      let deviceId = conn?.meshDeviceId;
      if (deviceId && !useDeviceStore.getState().getDevice(deviceId)) {
        deviceId = undefined;
      }
      deviceId = deviceId ?? randId();

      const device = addDevice(deviceId);

      // Flip status to "configuring" up front. buildMeshDevice awaits the
      // OPFS DB open which can take a beat (or stall under multi-tab
      // contention); we don't want the UI looking stuck at "connecting"
      // while persistence is spinning up.
      device.setConnectionPhase("configuring");
      updateStatus(id, "configuring");
      log.debug("setupMeshDevice: building MeshDevice", { id, deviceId });

      const meshDevice = await buildMeshDevice(id, deviceId, transport);
      log.debug("setupMeshDevice: MeshDevice built", { id });

      if (!meshRegistry.has(id)) {
        meshRegistry.register(id, meshDevice.meshClient);
      }
      meshRegistry.setActive(id);

      setSelectedDevice(deviceId);
      device.addConnection(meshDevice);
      subscribeAll(device, meshDevice);

      const cached = bluetoothDevice ?? serialPort;
      if (cached) cachedTransports.set(id, cached);

      setActiveConnectionId(id);
      device.setConnectionId(id);

      // Two paths drive the "configured" transition:
      //   1. The `onConfigComplete` event from the firmware. The handler is
      //      attached AFTER buildMeshDevice, which means MeshClient already
      //      started piping fromDevice → decodePacket. If the serial port
      //      had a buffered configCompleteId from a prior session, the
      //      dispatch happens synchronously before this subscribe and we
      //      miss it.
      //   2. The MeshClient.device.status signal. decodePacket flips the
      //      signal to DeviceConfigured on the same configCompleteId, and
      //      signals replay their current value to new subscribers — so we
      //      catch the case the event missed.
      // Either path may fire first; `markConfigured` is idempotent.
      let configuredHandled = false;
      let handshakeTimer: ReturnType<typeof setTimeout> | undefined;
      const markConfigured = (source: string): void => {
        if (configuredHandled) return;
        configuredHandled = true;
        if (handshakeTimer !== undefined) clearTimeout(handshakeTimer);
        log.info("connect transitioned to configured", { id, source });
        device.setConnectionPhase("configured");
        updateStatus(id, "configured");
        startMaintenanceHeartbeat(id, meshDevice);
        // Force radio RTC from PC clock once the config handshake is done
        // (same timing as Android MeshConnectionManager.onNodeDbReady).
        void meshDevice.setTimeOnly().then(
          () => log.info("setTimeOnly ok — radio clock synced from PC", { id }),
          (error) =>
            log.warn("setTimeOnly failed", {
              id,
              message: error instanceof Error ? error.message : String(error),
            }),
        );
      };

      const unsubConfigComplete = meshDevice.events.onConfigComplete.subscribe(
        () => markConfigured("onConfigComplete"),
      );
      const unsubStatusSignal = meshDevice.meshClient.device.status.subscribe(
        (s) => {
          if (s === DeviceStatusEnum.DeviceConfigured)
            markConfigured("device.status");
        },
      );
      // Catch-up: signal subscribe doesn't fire for the current value, so
      // check synchronously if the device is already past the gate.
      if (
        meshDevice.meshClient.device.status.value ===
        DeviceStatusEnum.DeviceConfigured
      ) {
        markConfigured("initial-check");
      }

      // Reboot: firmware emits `rebooted` after a soft reset (config write,
      // OTA, manual reboot). The SDK re-runs configure() so MeshClient state
      // re-streams, but the saved-connection status is already "configured"
      // — so the overlay would stay hidden. Flip status back to "configuring"
      // and reset `configuredHandled` so the next onConfigComplete re-marks.
      // Maintenance heartbeat is stopped here so the reconfigure handshake
      // isn't racing pings; markConfigured() restarts it.
      const unsubRebooted = meshDevice.events.onRebooted.subscribe(() => {
        log.info("device rebooted — re-entering configuring", { id });
        stopHeartbeat(id);
        configuredHandled = false;
        device.setConnectionPhase("configuring");
        updateStatus(id, "configuring");
      });

      configSubscriptions.set(id, () => {
        unsubConfigComplete();
        unsubStatusSignal();
        unsubRebooted();
      });

      // Do not wait for configure() to resolve before starting retries:
      // wantConfigId sits in the SDK queue for up to 60s without a radio ACK,
      // and ESP32 often reboots on serial open so the first packet is lost.
      log.debug("setupMeshDevice: calling configure() + handshake retries", {
        id,
      });
      meshDevice.configure().catch((error) => {
        const e = error as Error;
        log.error("setupMeshDevice: configure() rejected", {
          id,
          name: e?.name,
          message: e?.message,
        });
        if (!configuredHandled) {
          updateStatus(id, "error", error?.message ?? String(error));
        }
      });
      startConfigHeartbeat(id, meshDevice);

      const HANDSHAKE_TIMEOUT_MS = 45_000;
      handshakeTimer = setTimeout(() => {
        if (configuredHandled) return;
        log.error("setupMeshDevice: config handshake timed out", { id });
        stopHeartbeat(id);
        // Hard-release serial: soft-reuse after a failed handshake leaves a
        // zombie port (streams torn down, MCU never finished config).
        const live = useDeviceStore
          .getState()
          .savedConnections.find((c) => c.id === id);
        void teardown(id, live, { releaseSerial: true }).finally(() => {
          updateStatus(
            id,
            "error",
            "Configuration handshake timed out. Unplug the radio, close other serial apps, then reconnect.",
          );
        });
      }, HANDSHAKE_TIMEOUT_MS);

      const prevUnsub = configSubscriptions.get(id);
      configSubscriptions.set(id, () => {
        if (handshakeTimer !== undefined) clearTimeout(handshakeTimer);
        prevUnsub?.();
      });

      updateSavedConnection(id, { meshDeviceId: deviceId });
      return deviceId;
    },
    [
      connections,
      addDevice,
      setSelectedDevice,
      setActiveConnectionId,
      updateSavedConnection,
      updateStatus,
      teardown,
    ],
  );

  const connect = useCallback(
    async (id: ConnectionId, opts?: { allowPrompt?: boolean }) => {
      // Read from the live store, not the memoized `connections` closure: callers
      // such as addConnectionAndConnect() add a connection and connect to it in the
      // same tick, before this hook re-renders, so the closure would be stale.
      const conn = useDeviceStore
        .getState()
        .savedConnections.find((c) => c.id === id);
      if (!conn) {
        log.warn("connect: unknown connection id", { id });
        return false;
      }
      if (conn.status === "configured" || conn.status === "connected") {
        log.debug("connect: already connected", { id, status: conn.status });
        return true;
      }

      log.info("connect: enter", {
        id,
        type: conn.type,
        allowPrompt: !!opts?.allowPrompt,
      });
      updateStatus(id, "connecting");
      try {
        const cached = cachedTransports.get(id);
        const result = await openTransport(conn, {
          allowPrompt: opts?.allowPrompt,
          cachedBluetoothDevice:
            conn.type === "bluetooth"
              ? (cached as BluetoothDevice | undefined)
              : undefined,
          cachedSerialPort:
            conn.type === "serial"
              ? (cached as SerialPort | undefined)
              : undefined,
        });
        log.debug("connect: openTransport ok", { id });
        await setupMeshDevice(
          id,
          result.transport,
          result.bluetoothDevice,
          result.serialPort,
        );
        log.info(
          "connect: setupMeshDevice resolved, awaiting onConfigComplete",
          { id },
        );

        // BT-specific: catch device-side disconnect to flip status.
        result.bluetoothDevice?.addEventListener(
          "gattserverdisconnected",
          () => {
            log.warn("BT gattserverdisconnected", { id });
            updateStatus(id, "disconnected");
          },
        );
        return true;
      } catch (err) {
        const e = err as Error;
        log.error("connect: failed", {
          id,
          name: e?.name,
          message: e?.message,
        });
        const message = err instanceof Error ? err.message : String(err);
        updateStatus(id, "error", message);
        return false;
      }
    },
    [updateStatus, setupMeshDevice],
  );

  const disconnect = useCallback(
    async (id: ConnectionId) => {
      const conn = connections.find((c) => c.id === id);
      if (!conn) return;
      // Serial: always hard-close. Transport force-reopens on next connect
      // anyway (ESP32 settle); keeping the port open only left zombie locks.
      try {
        await teardown(id, conn, {
          releaseSerial: conn.type === "serial",
        });
        if (conn.meshDeviceId) {
          const device = useDeviceStore.getState().getDevice(conn.meshDeviceId);
          if (device) {
            device.setConnectionId(null);
            device.setConnectionPhase("disconnected");
          }
        }
      } finally {
        updateSavedConnection(id, { status: "disconnected", error: undefined });
      }
    },
    [connections, updateSavedConnection, teardown],
  );

  const addConnection = useCallback(
    (input: NewConnection) => {
      const conn = createConnectionFromInput(input);
      addSavedConnection(conn);
      return conn;
    },
    [addSavedConnection],
  );

  const addConnectionAndConnect = useCallback(
    async (input: NewConnection, btDevice?: BluetoothDevice) => {
      const conn = addConnection(input);
      if (btDevice && conn.type === "bluetooth")
        cachedTransports.set(conn.id, btDevice);
      await connect(conn.id, { allowPrompt: true });
      return conn;
    },
    [addConnection, connect],
  );

  const refreshStatuses = useCallback(async () => {
    const candidates = connections.filter(
      (c) =>
        c.status !== "connected" &&
        c.status !== "configured" &&
        c.status !== "configuring",
    );
    await Promise.all(
      candidates.map(async (c) => {
        const status = await probeConnection(c);
        updateSavedConnection(c.id, { status });
      }),
    );
  }, [connections, updateSavedConnection]);

  const syncConnectionStatuses = useCallback(() => {
    const activeConnection = connections.find(
      (c) => c.meshDeviceId === selectedDeviceId,
    );
    connections.forEach((conn) => {
      const shouldBeConnected = activeConnection?.id === conn.id;
      const isConnectedState =
        conn.status === "connected" ||
        conn.status === "configured" ||
        conn.status === "configuring";
      if (!shouldBeConnected && isConnectedState) {
        updateSavedConnection(conn.id, { status: "disconnected" });
      }
    });
  }, [connections, selectedDeviceId, updateSavedConnection]);

  return {
    connections,
    addConnection,
    addConnectionAndConnect,
    connect,
    disconnect,
    removeConnection,
    setDefaultConnection,
    refreshStatuses,
    syncConnectionStatuses,
  };
}
