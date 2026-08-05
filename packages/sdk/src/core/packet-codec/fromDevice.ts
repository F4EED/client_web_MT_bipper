import type { DeviceOutput } from "../transport/Transport.ts";

/** Max FromRadio / ToRadio protobuf payload (PhoneAPI.h). */
const MAX_TO_FROM_RADIO_SIZE = 512;
const START1 = 0x94;
const START2 = 0xc3;

/**
 * Transforms a raw byte stream from the device into typed DeviceOutput chunks
 * by parsing the 0x94 0xC3 framing header and length prefix.
 *
 * Tolerates boot-console ASCII and other garbage (common on USB/CH340 after
 * reset): scans for START1/START2, rejects lengths > 512, and resyncs on
 * false START1 bytes instead of stalling the parser.
 */
export const fromDeviceStream: () => TransformStream<
  Uint8Array,
  DeviceOutput
> = () => {
  let byteBuffer = new Uint8Array(0);
  const textDecoder = new TextDecoder();

  const emitDebug = (
    controller: TransformStreamDefaultController<DeviceOutput>,
    bytes: Uint8Array,
  ): void => {
    if (bytes.length === 0) return;
    controller.enqueue({
      type: "debug",
      data: textDecoder.decode(bytes),
    });
  };

  return new TransformStream<Uint8Array, DeviceOutput>({
    transform(chunk: Uint8Array, controller): void {
      const merged = new Uint8Array(byteBuffer.length + chunk.length);
      merged.set(byteBuffer);
      merged.set(chunk, byteBuffer.length);
      byteBuffer = merged;

      while (byteBuffer.length > 0) {
        const framingIndex = byteBuffer.indexOf(START1);

        if (framingIndex === -1) {
          // No START1 yet — treat everything as debug console output.
          emitDebug(controller, byteBuffer);
          byteBuffer = new Uint8Array(0);
          return;
        }

        if (framingIndex > 0) {
          emitDebug(controller, byteBuffer.subarray(0, framingIndex));
          byteBuffer = byteBuffer.subarray(framingIndex);
        }

        // Need at least START1 + START2
        if (byteBuffer.length < 2) return;

        if (byteBuffer[1] !== START2) {
          // Lone/false START1 — skip it and keep scanning (do not stall).
          emitDebug(controller, byteBuffer.subarray(0, 1));
          byteBuffer = byteBuffer.subarray(1);
          continue;
        }

        // Need full 4-byte header
        if (byteBuffer.length < 4) return;

        const length = ((byteBuffer[2] ?? 0) << 8) | (byteBuffer[3] ?? 0);
        if (length > MAX_TO_FROM_RADIO_SIZE) {
          // Bogus length — resync past this START1.
          emitDebug(controller, byteBuffer.subarray(0, 1));
          byteBuffer = byteBuffer.subarray(1);
          continue;
        }

        const frameTotal = 4 + length;
        if (byteBuffer.length < frameTotal) return;

        const packet = byteBuffer.subarray(4, frameTotal);
        byteBuffer = byteBuffer.subarray(frameTotal);
        controller.enqueue({
          type: "packet",
          data: packet,
        });
      }
    },
  });
};
