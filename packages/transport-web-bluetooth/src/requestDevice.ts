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
  if (typeof navigator === "undefined" || !("bluetooth" in navigator)) {
    throw new Error("Web Bluetooth not supported");
  }
  return navigator.bluetooth.requestDevice(
    buildBluetoothRequestOptions(serviceUuid, options),
  );
}
