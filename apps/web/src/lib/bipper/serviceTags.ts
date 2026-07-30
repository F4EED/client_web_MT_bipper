export const SERVICE_TAG_SLOT_COUNT = 10;

export type ServiceTagIndex = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export type ServiceTagValues = Record<ServiceTagIndex, string>;

export const SERVICE_TAG_OPTIONS: readonly ServiceTagIndex[] = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
];

export const EMPTY_SERVICE_TAG_VALUES: ServiceTagValues = {
  1: "",
  2: "",
  3: "",
  4: "",
  5: "",
  6: "",
  7: "",
  8: "",
  9: "",
  10: "",
};

/** Parse `#status` tag field: `Tag: T1=SDIS42,T3=Ricamarie,T10=x` or `Tag: aucun` */
export function parseServiceTagValues(tagLine: string): ServiceTagValues {
  const values: ServiceTagValues = { ...EMPTY_SERVICE_TAG_VALUES };
  const normalized = tagLine.trim();
  if (!normalized || normalized.toLowerCase().includes("aucun")) {
    return values;
  }

  const body = normalized.replace(/^tag\s*:\s*/i, "");
  for (const part of body.split(",")) {
    const trimmed = part.trim();
    const eq = trimmed.match(/^T(10|[1-9])=(.*)$/i);
    if (eq) {
      const tag = Number.parseInt(eq[1] ?? "", 10) as ServiceTagIndex;
      if (tag >= 1 && tag <= SERVICE_TAG_SLOT_COUNT) {
        values[tag] = (eq[2] ?? "").trim();
      }
      continue;
    }
    const legacy = trimmed.match(/^T(10|[1-9])\s+(.+)$/i);
    if (legacy) {
      const tag = Number.parseInt(legacy[1] ?? "", 10) as ServiceTagIndex;
      if (tag >= 1 && tag <= SERVICE_TAG_SLOT_COUNT) {
        values[tag] = (legacy[2] ?? "").trim();
      }
    }
  }
  return values;
}

export function formatTagValueCommand(tag: number, value: string): string {
  const trimmed = value.trim();
  if (tag < 1 || tag > SERVICE_TAG_SLOT_COUNT) {
    return "";
  }
  if (!trimmed) {
    return `#tagval ${tag}`;
  }
  return `#tagval ${tag} ${trimmed}`;
}

/** Single flash write: `#tagset T1=foo,…,T10=` */
export function formatTagSetCommand(values: ServiceTagValues): string {
  const parts = SERVICE_TAG_OPTIONS.map(
    (tag) => `T${tag}=${(values[tag] ?? "").trim()}`,
  );
  return `#tagset ${parts.join(",")}`;
}

export function formatServiceTagValuesLabel(values: ServiceTagValues): string {
  const parts = SERVICE_TAG_OPTIONS.filter((tag) => values[tag]).map(
    (tag) => `T${tag}=${values[tag]}`,
  );
  return parts.length > 0 ? parts.join(",") : "aucun";
}

/** Extract tag segment from `Pager Gaulix… | Tag: …` or `Pager OK — Tag: …` */
export function extractTagLineFromPagerReply(text: string): string | null {
  const match = text.match(/Tag:\s*(.+)$/i);
  return match?.[1]?.trim() ?? null;
}
