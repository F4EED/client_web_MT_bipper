import { describe, expect, it } from "vitest";
import {
  EMPTY_SERVICE_TAG_VALUES,
  formatTagSetCommand,
  parseServiceTagValues,
} from "./serviceTags.ts";

describe("serviceTags v1.11", () => {
  it("parse T3 T4 and T10 from status tag line", () => {
    const values = parseServiceTagValues(
      "T1=SDIS42,T3=Ricamarie,T4=ligerien,T10=UDIOM42",
    );
    expect(values[1]).toBe("SDIS42");
    expect(values[3]).toBe("Ricamarie");
    expect(values[4]).toBe("ligerien");
    expect(values[10]).toBe("UDIOM42");
  });

  it("formatTagSetCommand includes all ten slots", () => {
    const cmd = formatTagSetCommand({
      ...EMPTY_SERVICE_TAG_VALUES,
      3: "Ricamarie",
      10: "UDIOM42",
    });
    expect(cmd).toBe(
      "#tagset T1=,T2=,T3=Ricamarie,T4=,T5=,T6=,T7=,T8=,T9=,T10=UDIOM42",
    );
  });

  it("round-trips T10", () => {
    const source = { ...EMPTY_SERVICE_TAG_VALUES, 10: "UDIOM42" };
    const body = formatTagSetCommand(source).replace(/^#tagset\s+/, "");
    expect(parseServiceTagValues(body)[10]).toBe("UDIOM42");
  });
});
