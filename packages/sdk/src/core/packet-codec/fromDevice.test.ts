import { describe, expect, it } from "vitest";
import { fromDeviceStream } from "./fromDevice.ts";

async function collect(
  chunks: Uint8Array[],
): Promise<Array<{ type: string; data: unknown }>> {
  const ts = fromDeviceStream();
  const writer = ts.writable.getWriter();
  const out: Array<{ type: string; data: unknown }> = [];
  const reader = ts.readable.getReader();
  const readDone = (async () => {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      out.push(value as { type: string; data: unknown });
    }
  })();
  for (const c of chunks) {
    await writer.write(c);
  }
  await writer.close();
  await readDone;
  return out;
}

function frame(payload: Uint8Array): Uint8Array {
  return new Uint8Array([
    0x94,
    0xc3,
    (payload.length >> 8) & 0xff,
    payload.length & 0xff,
    ...payload,
  ]);
}

describe("fromDeviceStream", () => {
  it("extracts a framed packet", async () => {
    const payload = new Uint8Array([1, 2, 3, 4]);
    const out = await collect([frame(payload)]);
    expect(out).toEqual([{ type: "packet", data: payload }]);
  });

  it("skips boot ASCII before a frame", async () => {
    const boot = new TextEncoder().encode("INFO | Booted...\n");
    const payload = new Uint8Array([9, 9]);
    const out = await collect([boot, frame(payload)]);
    const packets = out.filter((x) => x.type === "packet");
    expect(packets).toEqual([{ type: "packet", data: payload }]);
  });

  it("does not stall on a lone 0x94 in garbage", async () => {
    const garbage = new Uint8Array([0x41, 0x94, 0x42, 0x43]); // A 0x94 B C
    const payload = new Uint8Array([7]);
    const out = await collect([garbage, frame(payload)]);
    const packets = out.filter((x) => x.type === "packet");
    expect(packets).toEqual([{ type: "packet", data: payload }]);
  });

  it("resyncs when declared length exceeds 512", async () => {
    const tooBig = new Uint8Array([0x94, 0xc3, 0x02, 0x01]); // len=513
    const payload = new Uint8Array([1]);
    const out = await collect([tooBig, frame(payload)]);
    const packets = out.filter((x) => x.type === "packet");
    expect(packets).toEqual([{ type: "packet", data: payload }]);
  });
});
