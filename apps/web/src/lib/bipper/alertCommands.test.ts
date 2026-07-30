import { describe, expect, it } from "vitest";
import {
  formatPagerAlertCommand,
  parseAffiliationInput,
  parsePagerAlertCommand,
} from "./alertCommands.ts";

describe("alertCommands v1.11", () => {
  it("formats alerte with id and multi affiliations", () => {
    expect(
      formatPagerAlertCommand({
        kind: "alerte",
        alertId: 42,
        text: "incendie hall",
        affiliations: ["SDIS42", "test"],
      }),
    ).toBe("#alerte 42 incendie hall #SDIS42 #test");
  });

  it("formats fin with id", () => {
    expect(formatPagerAlertCommand({ kind: "fin", alertId: 42 })).toBe(
      "#fin 42",
    );
    expect(
      formatPagerAlertCommand({
        kind: "fin",
        alertId: 42,
        affiliations: ["SDIS42"],
      }),
    ).toBe("#fin 42 #SDIS42");
  });

  it("keeps legacy single affiliation", () => {
    expect(
      formatPagerAlertCommand({
        kind: "secours",
        text: "renfort",
        affiliation: "DEPT42",
      }),
    ).toBe("#secours renfort #DEPT42");
  });

  it("parses id and multi tags", () => {
    expect(
      parsePagerAlertCommand("#alerte 42 incendie hall #SDIS42 #test"),
    ).toEqual({
      kind: "alerte",
      alertId: 42,
      text: "incendie hall",
      affiliations: ["SDIS42", "test"],
      affiliation: "SDIS42",
    });
  });

  it("parses fin with id", () => {
    expect(parsePagerAlertCommand("#fin 42")).toEqual({
      kind: "fin",
      alertId: 42,
      text: "",
      affiliations: [],
      affiliation: "",
    });
  });

  it("parseAffiliationInput splits commas and hashes", () => {
    expect(parseAffiliationInput("SDIS42, test #DEPT42")).toEqual([
      "SDIS42",
      "test",
      "DEPT42",
    ]);
  });
});
