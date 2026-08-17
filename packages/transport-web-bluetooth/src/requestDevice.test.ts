import { describe, expect, it } from "vitest";
import {
  MESHTASTIC_GATT_SERVICE_UUID,
  buildBluetoothRequestOptions,
  isFirefoxBrowser,
  isLinuxDesktop,
  needsAcceptAllBluetoothDevices,
} from "./requestDevice.ts";

const UA = {
  chromeLinux:
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
  firefoxLinux:
    "Mozilla/5.0 (X11; Linux x86_64; rv:128.0) Gecko/20100101 Firefox/128.0",
  firefoxWindows:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:128.0) Gecko/20100101 Firefox/128.0",
  chromeWindows:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
  chromeAndroid:
    "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36",
  chromeMac:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
};

describe("Web Bluetooth Linux / Firefox request options", () => {
  it("treats desktop Linux as needing acceptAllDevices", () => {
    expect(isLinuxDesktop(UA.chromeLinux)).toBe(true);
    expect(isLinuxDesktop(UA.firefoxLinux)).toBe(true);
    expect(isLinuxDesktop(UA.chromeAndroid)).toBe(false);
    expect(isLinuxDesktop(UA.chromeWindows)).toBe(false);
  });

  it("detects Firefox on any OS", () => {
    expect(isFirefoxBrowser(UA.firefoxLinux)).toBe(true);
    expect(isFirefoxBrowser(UA.firefoxWindows)).toBe(true);
    expect(isFirefoxBrowser(UA.chromeLinux)).toBe(false);
  });

  it("uses acceptAllDevices on Linux and Firefox, not on Chrome Windows/macOS/Android", () => {
    expect(needsAcceptAllBluetoothDevices(UA.chromeLinux)).toBe(true);
    expect(needsAcceptAllBluetoothDevices(UA.firefoxLinux)).toBe(true);
    expect(needsAcceptAllBluetoothDevices(UA.firefoxWindows)).toBe(true);
    expect(needsAcceptAllBluetoothDevices(UA.chromeWindows)).toBe(false);
    expect(needsAcceptAllBluetoothDevices(UA.chromeMac)).toBe(false);
    expect(needsAcceptAllBluetoothDevices(UA.chromeAndroid)).toBe(false);
  });

  it("never combines acceptAllDevices with filters (Web Bluetooth spec)", () => {
    const linux = buildBluetoothRequestOptions(MESHTASTIC_GATT_SERVICE_UUID, {
      userAgent: UA.chromeLinux,
    });
    expect(linux).toEqual({
      acceptAllDevices: true,
      optionalServices: [MESHTASTIC_GATT_SERVICE_UUID],
    });
    expect("filters" in linux).toBe(false);

    const win = buildBluetoothRequestOptions(MESHTASTIC_GATT_SERVICE_UUID, {
      userAgent: UA.chromeWindows,
    });
    expect(win.acceptAllDevices).toBeUndefined();
    expect(win.filters).toEqual([{ services: [MESHTASTIC_GATT_SERVICE_UUID] }]);
    expect(win.optionalServices).toEqual([MESHTASTIC_GATT_SERVICE_UUID]);
  });

  it("honours an explicit acceptAllDevices override", () => {
    const forced = buildBluetoothRequestOptions(undefined, {
      acceptAllDevices: true,
      userAgent: UA.chromeWindows,
    });
    expect(forced.acceptAllDevices).toBe(true);
    expect("filters" in forced).toBe(false);

    const filtered = buildBluetoothRequestOptions(undefined, {
      acceptAllDevices: false,
      userAgent: UA.chromeLinux,
    });
    expect(filtered.acceptAllDevices).toBeUndefined();
    expect(filtered.filters).toBeDefined();
  });
});
