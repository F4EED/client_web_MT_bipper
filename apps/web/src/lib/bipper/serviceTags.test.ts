import { describe, expect, it } from "vitest";
import {
  EMPTY_SERVICE_TAG_VALUES,
  formatTagSetCommand,
  parseServiceTagValues,
} from "./serviceTags.ts";

describe("serviceTags", () => {
  it("parse T3 and T4 from status tag line", () => {
    const values = parseServiceTagValues("T1=SDIS42,T3=Ricamarie,T4=ligerien");
    expect(values[1]).toBe("SDIS42");
    expect(values[2]).toBe("");
    expect(values[3]).toBe("Ricamarie");
    expect(values[4]).toBe("ligerien");
  });

  it("formatTagSetCommand includes all four slots for one flash write", () => {
    const cmd = formatTagSetCommand({
      ...EMPTY_SERVICE_TAG_VALUES,
      3: "Ricamarie",
      4: "ligerien",
    });
    expect(cmd).toBe("#tagset T1=,T2=,T3=Ricamarie,T4=ligerien");
  });

  it("round-trips T4 through parse after format", () => {
    const source = {
      ...EMPTY_SERVICE_TAG_VALUES,
      4: "ligerien",
    };
    const body = formatTagSetCommand(source).replace(/^#tagset\s+/, "");
    const values = parseServiceTagValues(body);
    expect(values[4]).toBe("ligerien");
  });
});
