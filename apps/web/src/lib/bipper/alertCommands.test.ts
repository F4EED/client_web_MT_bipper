import { describe, expect, it } from "vitest";
import {
  formatPagerAlertCommand,
  parsePagerAlertCommand,
} from "./alertCommands.ts";

describe("alertCommands", () => {
  it("formats alerte with text and affiliation", () => {
    expect(
      formatPagerAlertCommand({
        kind: "alerte",
        text: "mise en alerte structure",
        affiliation: "test",
      }),
    ).toBe("#alerte mise en alerte structure #test");
  });

  it("formats without affiliation as broadcast", () => {
    expect(
      formatPagerAlertCommand({ kind: "secours", text: "renfort nord" }),
    ).toBe("#secours renfort nord");
  });

  it("formats fin with optional affiliation", () => {
    expect(formatPagerAlertCommand({ kind: "fin" })).toBe("#fin");
    expect(formatPagerAlertCommand({ kind: "fin", affiliation: "test" })).toBe(
      "#fin #test",
    );
  });

  it("formats vigilance with text and affiliation", () => {
    expect(
      formatPagerAlertCommand({
        kind: "vigilance",
        text: "niveau orange",
        affiliation: "SDIS42",
      }),
    ).toBe("#vigilance niveau orange #SDIS42");
  });

  it("parses trailing affiliation only", () => {
    expect(parsePagerAlertCommand("#info exercice #SDIS42")).toEqual({
      kind: "info",
      text: "exercice",
      affiliation: "SDIS42",
    });
  });
});
