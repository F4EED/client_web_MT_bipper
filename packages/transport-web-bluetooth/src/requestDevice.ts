/**
 * Web Bluetooth `requestDevice` options that work on Linux (BlueZ) and
 * Firefox (WebBLE polyfill), not only on Windows / macOS / Android Chrome.
 *
 * Filtering by the Meshtastic GATT service UUID often yields an empty
 * picker on those platforms: advertised 128-bit UUIDs are missing from
 * scan results. The spec also forbids combining `acceptAllDevices` with
 * `filters`.
 */

export const MESHTASTIC_GATT_SERVICE_UUID =
  "6ba1b218-15a8-461f-9fa8-5dcae273eafd";

function readUserAgent(userAgent?: string): string {
  if (userAgent !== undefined) {
    return userAgent;
  }
  return typeof navigator !== "undefined" ? navigator.userAgent : "";
}

/** Desktop Linux (BlueZ), excluding Android. */
export function isLinuxDesktop(userAgent?: string): boolean {
  const ua = readUserAgent(userAgent);
  return /Linux/i.test(ua) && !/Android/i.test(ua);
}

export function isFirefoxBrowser(userAgent?: string): boolean {
  return /Firefox/i.test(readUserAgent(userAgent));
}

/** Chrome, Chromium, Edge, Brave, Opera — not Firefox, not iOS WebKit. */
export function isChromiumFamily(userAgent?: string): boolean {
  const ua = readUserAgent(userAgent);
  if (/Firefox|FxiOS|CriOS/i.test(ua)) {
    return false;
  }
  return /Chrome|Chromium|Edg\//i.test(ua);
}

/**
 * True when `requestDevice` is actually callable. `"bluetooth" in navigator`
 * is not enough: Linux Chromium without flags, and Firefox without a polyfill,
 * expose neither the object nor the method.
 */
export function isWebBluetoothAvailable(
  bluetooth?: { requestDevice?: unknown } | null,
): boolean {
  const bt =
    bluetooth !== undefined
      ? bluetooth
      : typeof navigator !== "undefined"
        ? (
            navigator as Navigator & {
              bluetooth?: { requestDevice?: unknown };
            }
          ).bluetooth
        : undefined;
  return typeof bt?.requestDevice === "function";
}

export type BluetoothUnavailableReason =
  | "secure-context"
  | "firefox"
  | "chromium-linux"
  | "unsupported";

/**
 * Why `navigator.bluetooth` is missing. Linux Chromium hides the API until
 * launched with `--enable-blink-features=WebBluetooth` (or chrome://flags).
 * Firefox never ships it natively.
 */
export function getBluetoothUnavailableReason(options?: {
  userAgent?: string;
  isSecureContext?: boolean;
  hasBluetooth?: boolean;
}): BluetoothUnavailableReason | null {
  const hasBt = options?.hasBluetooth ?? isWebBluetoothAvailable();
  if (hasBt) {
    return null;
  }

  const secure =
    options?.isSecureContext ??
    (typeof globalThis !== "undefined" && globalThis.isSecureContext === true);
  if (!secure) {
    return "secure-context";
  }

  const ua = options?.userAgent ?? readUserAgent();
  if (isFirefoxBrowser(ua)) {
    return "firefox";
  }
  if (isLinuxDesktop(ua) && isChromiumFamily(ua)) {
    return "chromium-linux";
  }
  return "unsupported";
}

/**
 * Linux/BlueZ and Firefox omit 128-bit GATT UUIDs from BLE advertisements
 * often enough that a service filter shows no devices.
 */
export function needsAcceptAllBluetoothDevices(userAgent?: string): boolean {
  const ua = readUserAgent(userAgent);
  return isLinuxDesktop(ua) || isFirefoxBrowser(ua);
}

export function buildBluetoothRequestOptions(
  serviceUuid: string = MESHTASTIC_GATT_SERVICE_UUID,
  options?: { acceptAllDevices?: boolean; userAgent?: string },
): RequestDeviceOptions {
  const acceptAll =
    options?.acceptAllDevices ??
    needsAcceptAllBluetoothDevices(options?.userAgent);

  if (acceptAll) {
    return {
      acceptAllDevices: true,
      optionalServices: [serviceUuid],
    };
  }

  return {
    filters: [{ services: [serviceUuid] }],
    optionalServices: [serviceUuid],
  };
}

export async function requestMeshtasticBluetoothDevice(
  serviceUuid: string = MESHTASTIC_GATT_SERVICE_UUID,
  options?: { acceptAllDevices?: boolean },
): Promise<BluetoothDevice> {
  if (!isWebBluetoothAvailable()) {
    throw new Error("Web Bluetooth not supported");
  }
  return navigator.bluetooth.requestDevice(
    buildBluetoothRequestOptions(serviceUuid, options),
  );
}
