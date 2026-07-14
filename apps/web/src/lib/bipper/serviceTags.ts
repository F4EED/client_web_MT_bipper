export type ServiceTagValues = Record<1 | 2 | 3 | 4, string>;

export const EMPTY_SERVICE_TAG_VALUES: ServiceTagValues = {
  1: "",
  2: "",
  3: "",
  4: "",
};

/** Parse `#status` tag field: `Tag: T1=SDIS42,T3=Ricamarie` or `Tag: aucun` */
export function parseServiceTagValues(tagLine: string): ServiceTagValues {
  const values: ServiceTagValues = { ...EMPTY_SERVICE_TAG_VALUES };
  const normalized = tagLine.trim();
  if (!normalized || normalized.toLowerCase().includes("aucun")) {
    return values;
  }

  const body = normalized.replace(/^tag\s*:\s*/i, "");
  for (const part of body.split(",")) {
    const trimmed = part.trim();
    const eq = trimmed.match(/^T([1-4])=(.*)$/i);
    if (eq) {
      const tag = Number.parseInt(eq[1] ?? "", 10) as 1 | 2 | 3 | 4;
      values[tag] = (eq[2] ?? "").trim();
      continue;
    }
    const legacy = trimmed.match(/^T([1-4])\s+(.+)$/i);
    if (legacy) {
      const tag = Number.parseInt(legacy[1] ?? "", 10) as 1 | 2 | 3 | 4;
      values[tag] = (legacy[2] ?? "").trim();
    }
  }
  return values;
}

export function formatTagValueCommand(tag: number, value: string): string {
  const trimmed = value.trim();
  if (tag < 1 || tag > 4) {
    return "";
  }
  if (!trimmed) {
    return `#tagval ${tag}`;
  }
  return `#tagval ${tag} ${trimmed}`;
}

/** Single flash write: `#tagset T1=foo,T2=,T3=bar,T4=` */
export function formatTagSetCommand(values: ServiceTagValues): string {
  const parts = ([1, 2, 3, 4] as const).map(
    (tag) => `T${tag}=${(values[tag] ?? "").trim()}`,
  );
  return `#tagset ${parts.join(",")}`;
}

export function formatServiceTagValuesLabel(values: ServiceTagValues): string {
  const parts = ([1, 2, 3, 4] as const)
    .filter((tag) => values[tag])
    .map((tag) => `T${tag}=${values[tag]}`);
  return parts.length > 0 ? parts.join(",") : "aucun";
}

/** Extract tag segment from `Pager Gaulix… | Tag: …` or `Pager OK — Tag: …` */
export function extractTagLineFromPagerReply(text: string): string | null {
  const match = text.match(/Tag:\s*(.+)$/i);
  return match?.[1]?.trim() ?? null;
}
