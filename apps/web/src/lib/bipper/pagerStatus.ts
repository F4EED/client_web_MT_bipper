import { parseServiceTagValues, type ServiceTagValues } from "./serviceTags.ts";

export interface PagerStatus {
  state: string;
  alertCount: number;
  battery: string;
  beeps: string;
  tag: string;
  tagValues: ServiceTagValues;
  code: string;
  raw: string;
}

/** Parse a `#status` reply from GaulixPagerModule::sendStatusReply. */
export function parsePagerStatus(text: string): PagerStatus | null {
  const raw = text.trim();
  if (!raw.startsWith("Pager Gaulix")) {
    return null;
  }

  const parts = raw.split("|").map((p) => p.trim());
  if (parts.length < 2) {
    return null;
  }

  const state = parts[0].replace(/^Pager Gaulix\s*-\s*/i, "").trim();
  let alertCount = 0;
  let battery = "--";
  let beeps = "--";
  let tag = "aucun";
  let code = "--";

  for (const part of parts.slice(1)) {
    const alertsMatch = part.match(/^Alertes:\s*(\d+)/i);
    if (alertsMatch) {
      alertCount = Number.parseInt(alertsMatch[1], 10);
      continue;
    }
    if (part.startsWith("Batterie")) {
      battery = part.replace(/^Batterie\s*:\s*/i, "").trim();
      continue;
    }
    if (part.startsWith("Bips")) {
      beeps = part.replace(/^Bips\s*:\s*/i, "").trim();
      continue;
    }
    if (part.startsWith("Tag")) {
      tag = part.replace(/^Tag\s*:\s*/i, "").trim();
      continue;
    }
    if (part.startsWith("Code")) {
      code = part.replace(/^Code\s*:\s*/i, "").trim();
    }
  }

  return {
    state,
    alertCount,
    battery,
    beeps,
    tag,
    tagValues: parseServiceTagValues(tag),
    code,
    raw,
  };
}

export function isPagerCommandReply(text: string): boolean {
  const t = text.trim();
  return (
    t.startsWith("Pager Gaulix") ||
    t.startsWith("Pager OK") ||
    t.startsWith("Pager ERR")
  );
}
