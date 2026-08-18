import { useEffect, useState } from "react";
import { isWebBluetoothAvailable } from "@meshtastic/transport-web-bluetooth";

export type BrowserFeature = "Web Bluetooth" | "Web Serial" | "Secure Context";

interface BrowserSupport {
  supported: BrowserFeature[];
  unsupported: BrowserFeature[];
}

function detectSupport(): BrowserSupport {
  const features: [BrowserFeature, boolean][] = [
    ["Web Bluetooth", isWebBluetoothAvailable()],
    [
      "Web Serial",
      typeof navigator !== "undefined" &&
        "serial" in navigator &&
        !!navigator.serial,
    ],
    // Prefer the browser flag — covers localhost, 127.0.0.1, ::1, and https.
    ["Secure Context", globalThis.isSecureContext === true],
  ];

  return features.reduce<BrowserSupport>(
    (acc, [feature, isSupported]) => {
      const list = isSupported ? acc.supported : acc.unsupported;
      list.push(feature);
      return acc;
    },
    { supported: [], unsupported: [] },
  );
}

export function useBrowserFeatureDetection(): BrowserSupport {
  const [support, setSupport] = useState(detectSupport);

  useEffect(() => {
    // Firefox polyfills (WebBLE / WebBT) may inject navigator.bluetooth
    // after the first paint. Poll briefly so the picker enables itself.
    if (isWebBluetoothAvailable()) {
      return;
    }
    const started = Date.now();
    const id = window.setInterval(() => {
      setSupport(detectSupport());
      if (isWebBluetoothAvailable() || Date.now() - started > 4000) {
        window.clearInterval(id);
      }
    }, 250);
    return () => window.clearInterval(id);
  }, []);

  return support;
}
