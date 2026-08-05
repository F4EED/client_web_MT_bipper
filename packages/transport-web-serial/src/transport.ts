import {
  createLogger,
  DeviceStatusEnum,
  type DeviceOutput,
  fromDeviceStream,
  toDeviceStream,
  type Transport,
} from "@meshtastic/sdk";
import { Result, type ResultType } from "better-result";

const log = createLogger("TransportWebSerial");

/**
 * Typed error produced when preparing a `SerialPort` for use fails. `kind`
 * lets callers distinguish recoverable cases (port held briefly during
 * USB re-enumeration) from fatal ones (another tab or process owns the
 * port). `userMessage` is a human-readable, actionable string ready for
 * UI without further interpretation.
 */
export class SerialConnectError extends Error {
  public readonly kind: "in-use" | "busy" | "unavailable";
  public readonly userMessage: string;

  constructor(
    kind: SerialConnectError["kind"],
    userMessage: string,
    options?: { cause?: unknown },
  ) {
    super(userMessage, options);
    this.name = "SerialConnectError";
    this.kind = kind;
    this.userMessage = userMessage;
  }
}

const PORT_OPEN_RETRY_DELAYS_MS = [250, 500, 750] as const;
const POST_CLOSE_DELAY_MS = 300;
/** ESP32 USB/CH340 often resets on port.open() (DTR/RTS); wait before first ToRadio. */
const POST_OPEN_SETTLE_MS =
  typeof process !== "undefined" && process.env?.VITEST === "true" ? 5 : 5000;
/** Protocol: 4× START1 wakes / resyncs the firmware StreamAPI framer. */
const SERIAL_WAKE_BYTES = new Uint8Array([0x94, 0x94, 0x94, 0x94]);

function isPortBusyError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  if ((err as DOMException).name === "InvalidStateError") return true;
  return /already open|failed to open serial port|access is denied/i.test(
    err.message,
  );
}

async function releaseModemLines(port: SerialPort): Promise<void> {
  // Deassert DTR/RTS ASAP. Cannot prevent the brief assert during open()
  // (Web Serial / Windows limitation) but avoids holding the MCU in reset.
  try {
    await port.setSignals?.({
      dataTerminalReady: false,
      requestToSend: false,
    });
  } catch {
    /* optional */
  }
}

async function writeWakeBytes(port: SerialPort): Promise<void> {
  if (!port.writable) return;
  const writer = port.writable.getWriter();
  try {
    await writer.write(SERIAL_WAKE_BYTES);
    log.debug("writeWakeBytes: sent 4× START1");
  } catch (cause) {
    const err = cause as Error;
    log.warn("writeWakeBytes: failed", {
      name: err?.name,
      message: err?.message,
    });
  } finally {
    try {
      writer.releaseLock();
    } catch {
      /* ignore */
    }
  }
}

/**
 * Provides Web Serial transport for Meshtastic devices.
 *
 * Implements the {@link Transport} contract using the Web Serial API.
 * Use {@link TransportWebSerial.create} or {@link TransportWebSerial.createFromPort}
 * to construct an instance.
 *
 * Each connect force-closes then reopens the port (ESP32/CH340 always resets
 * once) so boot garbage and zombie stream locks cannot strand the handshake.
 * Call {@link TransportWebSerial.releasePort} to fully close the port.
 */
export class TransportWebSerial implements Transport {
  private _toDevice: WritableStream<Uint8Array>;
  private _fromDevice: ReadableStream<DeviceOutput>;
  private fromDeviceController?: ReadableStreamDefaultController<DeviceOutput>;
  private connection: SerialPort;
  private pipePromise: Promise<void> | null = null;
  private portWriter: WritableStreamDefaultWriter<Uint8Array> | null = null;
  private portReader: ReadableStreamDefaultReader<Uint8Array> | null = null;
  private writePumpActive = false;

  private lastStatus: DeviceStatusEnum = DeviceStatusEnum.DeviceDisconnected;
  private closingByUser = false;

  /**
   * Prompt the user to pick a serial port and open a transport on it.
   * Returns `Err` on permission denial or open failure rather than
   * throwing — callers don't need a try/catch.
   */
  public static async create(
    baudRate?: number,
  ): Promise<ResultType<TransportWebSerial, SerialConnectError>> {
    let port: SerialPort;
    try {
      port = await navigator.serial.requestPort();
    } catch (cause) {
      return Result.err(
        new SerialConnectError("unavailable", "Serial port not selected.", {
          cause,
        }),
      );
    }
    return TransportWebSerial.createFromPort(port, baudRate);
  }

  /**
   * Open a transport on an already-known {@link SerialPort}.
   * Always closes + reopens so ESP32 boot settles cleanly (no zombie reuse).
   */
  public static async createFromPort(
    port: SerialPort,
    baudRate?: number,
  ): Promise<ResultType<TransportWebSerial, SerialConnectError>> {
    const prep = await TransportWebSerial.preparePort(port, baudRate ?? 115200);
    if (Result.isError(prep)) return Result.err(prep.error);
    try {
      return Result.ok(new TransportWebSerial(port));
    } catch (cause) {
      return Result.err(
        new SerialConnectError(
          "unavailable",
          "Serial port opened but its read / write streams are not accessible. Re-plug the device and try again.",
          { cause },
        ),
      );
    }
  }

  private static async preparePort(
    port: SerialPort,
    baudRate: number,
  ): Promise<ResultType<true, SerialConnectError>> {
    log.debug("preparePort: enter", {
      readable: !!port.readable,
      writable: !!port.writable,
      baudRate,
    });

    // Always force-close first. Soft-reuse left zombie locks / half-open ports
    // after failed handshakes and Vite HMR, which looks like "connects then void".
    if (port.readable || port.writable) {
      log.debug("preparePort: closing before fresh open");
      try {
        await port.close();
        log.debug("preparePort: close() ok");
      } catch (cause) {
        const err = cause as Error;
        log.warn("preparePort: close() threw", {
          name: err?.name,
          message: err?.message,
        });
        // Still try open() below — some browsers reject close on already-closed.
      }
      await new Promise((r) => setTimeout(r, POST_CLOSE_DELAY_MS));
    }

    let lastErr: unknown;
    for (
      let attempt = 0;
      attempt <= PORT_OPEN_RETRY_DELAYS_MS.length;
      attempt++
    ) {
      try {
        log.debug("preparePort: open() attempt", { attempt });
        await port.open({ baudRate });
        // First open always pulses DTR/RTS on Windows — release immediately.
        await releaseModemLines(port);
        log.debug("preparePort: open() ok, settling", {
          attempt,
          settleMs: POST_OPEN_SETTLE_MS,
        });
        await new Promise((r) => setTimeout(r, POST_OPEN_SETTLE_MS));
        await writeWakeBytes(port);
        return Result.ok(true);
      } catch (err) {
        lastErr = err;
        const e = err as Error;
        log.warn("preparePort: open() threw", {
          attempt,
          name: e?.name,
          message: e?.message,
          willRetry:
            isPortBusyError(err) && attempt < PORT_OPEN_RETRY_DELAYS_MS.length,
        });
        if (
          !isPortBusyError(err) ||
          attempt === PORT_OPEN_RETRY_DELAYS_MS.length
        )
          break;
        // If "already open", try close again before retry.
        try {
          await port.close();
        } catch {
          /* ignore */
        }
        await new Promise((r) =>
          setTimeout(r, PORT_OPEN_RETRY_DELAYS_MS[attempt]),
        );
      }
    }

    const e = lastErr as Error | undefined;
    log.error("preparePort: failed", { name: e?.name, message: e?.message });

    if (isPortBusyError(lastErr)) {
      return Result.err(
        new SerialConnectError(
          "in-use",
          "Serial port is busy. Another tab, terminal, or app is holding it (Arduino IDE, screen, picocom, esptool, Meshtastic CLI). Close it and try again.",
          { cause: lastErr },
        ),
      );
    }
    return Result.err(
      new SerialConnectError(
        "busy",
        "Could not open the serial port. Re-plug the device and try again.",
        { cause: lastErr },
      ),
    );
  }

  /**
   * Constructs a transport around a given {@link SerialPort}.
   * @throws If the port lacks readable or writable streams.
   */
  constructor(connection: SerialPort) {
    if (!connection.readable || !connection.writable) {
      throw new Error("Stream not accessible");
    }

    this.connection = connection;
    this.portWriter = connection.writable.getWriter();
    this.portReader = connection.readable.getReader();

    log.debug("constructor: wiring writer/reader pumps");

    const toDeviceTransform = toDeviceStream();
    this._toDevice = toDeviceTransform.writable;
    this.writePumpActive = true;
    const writer = this.portWriter;
    this.pipePromise = (async () => {
      const reader = toDeviceTransform.readable.getReader();
      try {
        while (this.writePumpActive) {
          const { value, done } = await reader.read();
          if (done) break;
          if (value) await writer.write(value);
        }
      } catch (err) {
        if (!this.closingByUser) {
          const e = err as Error;
          log.error("toDevice pump rejected", {
            name: e?.name,
            message: e?.message,
          });
          this.emitStatus(DeviceStatusEnum.DeviceDisconnected, "write-error");
        } else {
          log.debug("toDevice pump stopped (expected)");
        }
      } finally {
        try {
          reader.releaseLock();
        } catch {
          /* ignore */
        }
      }
    })();

    const portReader = this.portReader;
    this._fromDevice = new ReadableStream<DeviceOutput>({
      start: async (ctrl) => {
        this.fromDeviceController = ctrl;

        this.emitStatus(DeviceStatusEnum.DeviceConnecting);

        const transformed = new ReadableStream<Uint8Array>({
          pull: async (c) => {
            try {
              const { value, done } = await portReader.read();
              if (done) {
                c.close();
                return;
              }
              if (value) c.enqueue(value);
            } catch (error) {
              c.error(
                error instanceof Error ? error : new Error(String(error)),
              );
            }
          },
          cancel: async () => {
            /* soft disconnect releases portReader in disconnect() */
          },
        }).pipeThrough(fromDeviceStream());

        const reader = transformed.getReader();

        const onOsDisconnect = (ev: Event) => {
          const { port } = ev as unknown as { port?: SerialPort };
          if (port && port === this.connection) {
            log.warn("OS-level disconnect event");
            this.emitStatus(
              DeviceStatusEnum.DeviceDisconnected,
              "serial-disconnected",
            );
          }
        };
        navigator.serial.addEventListener("disconnect", onOsDisconnect);

        log.debug("read loop starting");
        this.emitStatus(DeviceStatusEnum.DeviceConnected);

        try {
          while (true) {
            const { value, done } = await reader.read();
            if (done) {
              log.debug("read loop: done=true");
              break;
            }
            ctrl.enqueue(value);
          }
          ctrl.close();
        } catch (error) {
          const e = error as Error;
          log.warn("read loop threw", {
            closingByUser: this.closingByUser,
            name: e?.name,
            message: e?.message,
          });
          if (!this.closingByUser) {
            this.emitStatus(DeviceStatusEnum.DeviceDisconnected, "read-error");
          }
          ctrl.error(error instanceof Error ? error : new Error(String(error)));
        } finally {
          try {
            reader.releaseLock();
          } catch {
            /* ignore */
          }
          navigator.serial.removeEventListener("disconnect", onOsDisconnect);
          log.debug("read loop: released reader lock + listener");
        }
      },
    });
  }

  /** Writable stream of bytes to the device. */
  public get toDevice(): WritableStream<Uint8Array> {
    return this._toDevice;
  }

  /** Readable stream of {@link DeviceOutput} from the device. */
  public get fromDevice(): ReadableStream<DeviceOutput> {
    return this._fromDevice;
  }

  private emitStatus(next: DeviceStatusEnum, reason?: string): void {
    if (next === this.lastStatus) {
      return;
    }
    this.lastStatus = next;
    this.fromDeviceController?.enqueue({
      type: "status",
      data: { status: next, reason },
    });
  }

  /**
   * Soft-disconnect: stop pumps and release stream locks, but keep the OS
   * serial port open so the next connect does not reset ESP32 via DTR/RTS.
   */
  public async disconnect(): Promise<void> {
    log.debug("disconnect: enter (soft — port stays open)");
    try {
      this.closingByUser = true;
      this.writePumpActive = false;

      try {
        await this._toDevice.close();
      } catch {
        /* may already be closed */
      }
      if (this.pipePromise) {
        await this.pipePromise.catch(() => {});
        log.debug("disconnect: write pump settled");
      }

      if (this._fromDevice?.locked) {
        try {
          await this._fromDevice.cancel();
        } catch {
          /* ignore */
        }
      }

      try {
        this.portWriter?.releaseLock();
      } catch {
        /* ignore */
      }
      this.portWriter = null;

      try {
        this.portReader?.releaseLock();
      } catch {
        /* ignore */
      }
      this.portReader = null;

      await releaseModemLines(this.connection);
      log.debug("disconnect: soft complete (port still open)");
    } catch (error) {
      const e = error as Error;
      log.warn("disconnect: cleanup failed", {
        name: e?.name,
        message: e?.message,
      });
    } finally {
      this.emitStatus(DeviceStatusEnum.DeviceDisconnected, "user");
      this.closingByUser = false;
      log.debug("disconnect: done");
    }
  }

  /**
   * Fully close the underlying SerialPort (pulses DTR/RTS on next open).
   * Use when removing the connection permanently.
   */
  public async releasePort(): Promise<void> {
    log.debug("releasePort: enter");
    try {
      await this.disconnect();
    } catch {
      /* ignore */
    }
    try {
      await this.connection.close();
      log.debug("releasePort: connection.close() ok");
    } catch (error) {
      const e = error as Error;
      log.warn("releasePort: close() threw", {
        name: e?.name,
        message: e?.message,
      });
    }
  }

  /**
   * Reconnects the transport by creating a new AbortController and re-establishing
   * the pipe connection. Only call this after disconnect() or if the connection failed.
   */
  public async reconnect() {
    this.emitStatus(DeviceStatusEnum.DeviceConnecting, "reconnect");

    try {
      if (!this.connection.readable || !this.connection.writable) {
        throw new Error("Stream not accessible");
      }
      this.portWriter = this.connection.writable.getWriter();
      this.portReader = this.connection.readable.getReader();

      const toDeviceTransform = toDeviceStream();
      this._toDevice = toDeviceTransform.writable;
      this.writePumpActive = true;
      const writer = this.portWriter;
      this.pipePromise = (async () => {
        const reader = toDeviceTransform.readable.getReader();
        try {
          while (this.writePumpActive) {
            const { value, done } = await reader.read();
            if (done) break;
            if (value) await writer.write(value);
          }
        } finally {
          try {
            reader.releaseLock();
          } catch {
            /* ignore */
          }
        }
      })();

      this.emitStatus(DeviceStatusEnum.DeviceConnected, "reconnected");
    } catch (error) {
      this.emitStatus(DeviceStatusEnum.DeviceDisconnected, "reconnect-failed");
      throw error;
    }
  }
}
