import { describe, expect, it } from "vitest";
import { isPagerAckText, parsePagerAck } from "./parsePagerAck.ts";

describe("parsePagerAck v1.12", () => {
  it("parses ACK with id, text and GPS", () => {
    expect(
      parsePagerAck(
        "Pager ACK alerte #42 31/07 10:30 — incendie hall | 45.12345N 4.56789E",
      ),
    ).toEqual({
      alertId: 42,
      timeLabel: "31/07 10:30",
      snippet: "incendie hall",
      lat: 45.12345,
      lon: 4.56789,
      raw: "Pager ACK alerte #42 31/07 10:30 — incendie hall | 45.12345N 4.56789E",
    });
  });

  it("parses ACK without id", () => {
    expect(parsePagerAck("Pager ACK alerte 31/07 10:30 — renfort")).toEqual({
      alertId: undefined,
      timeLabel: "31/07 10:30",
      snippet: "renfort",
      raw: "Pager ACK alerte 31/07 10:30 — renfort",
    });
  });

  it("parses ACK with id and time only", () => {
    expect(parsePagerAck("Pager ACK alerte #7 01/01 00:01")).toEqual({
      alertId: 7,
      timeLabel: "01/01 00:01",
      snippet: undefined,
      raw: "Pager ACK alerte #7 01/01 00:01",
    });
  });

  it("parses southern / western hemispheres as negative", () => {
    const parsed = parsePagerAck(
      "Pager ACK alerte #1 15/03 12:00 — poi | 33.5S 70.6W",
    );
    expect(parsed?.lat).toBeCloseTo(-33.5);
    expect(parsed?.lon).toBeCloseTo(-70.6);
  });

  it("rejects non-ACK text", () => {
    expect(parsePagerAck("Pager OK tag=…")).toBeNull();
    expect(parsePagerAck("#alerte 1 test")).toBeNull();
    expect(isPagerAckText("Pager ACK alerte 01/01 00:00")).toBe(true);
    expect(isPagerAckText("hello")).toBe(false);
  });
});
