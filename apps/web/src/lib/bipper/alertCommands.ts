export type PagerAlertKind =
  | "alerte"
  | "secours"
  | "vigilance"
  | "info"
  | "fin";

export type PagerAlertPayload = {
  kind: PagerAlertKind;
  /** Numéro d’alerte optionnel (firmware v1.11+). */
  alertId?: number;
  text?: string;
  /**
   * Appartenances (#entité…) contrôlées contre T1–T10 sur le Bipper.
   * Vide = tous. Plusieurs = OU.
   */
  affiliations?: string[];
  /** @deprecated Prefer `affiliations`. Kept for callers that still pass one tag. */
  affiliation?: string;
};

function normalizeAffiliations(payload: PagerAlertPayload): string[] {
  const fromList = (payload.affiliations ?? [])
    .map((a) => a.trim().replace(/^#/, "").replace(/\s+/g, ""))
    .filter(Boolean);
  if (fromList.length > 0) {
    return fromList;
  }
  const single = (payload.affiliation ?? "")
    .trim()
    .replace(/^#/, "")
    .replace(/\s+/g, "");
  return single ? [single] : [];
}

/** Parse free-text affiliation field: `SDIS42, test #DEPT42` → list */
export function parseAffiliationInput(raw: string): string[] {
  return raw
    .split(/[\s,;]+/)
    .map((t) => t.trim().replace(/^#/, ""))
    .filter(Boolean);
}

/** Build wire text: `#alerte [N] <texte> [#entité…]` */
export function formatPagerAlertCommand(payload: PagerAlertPayload): string {
  const kind = payload.kind;
  const text = (payload.text ?? "").trim().replace(/\s+/g, " ");
  const affiliations = normalizeAffiliations(payload);
  const alertId =
    payload.alertId !== undefined &&
    Number.isFinite(payload.alertId) &&
    payload.alertId > 0
      ? Math.floor(payload.alertId)
      : undefined;

  if (kind === "fin") {
    const parts = ["#fin"];
    if (alertId !== undefined) {
      parts.push(String(alertId));
    }
    for (const a of affiliations) {
      parts.push(`#${a}`);
    }
    return parts.join(" ");
  }

  const parts = [`#${kind}`];
  if (alertId !== undefined) {
    parts.push(String(alertId));
  }
  if (text) {
    parts.push(text);
  }
  for (const a of affiliations) {
    parts.push(`#${a}`);
  }
  return parts.join(" ");
}

export function parsePagerAlertCommand(raw: string): PagerAlertPayload | null {
  const trimmed = raw.trim().replace(/\s+/g, " ");
  const match = trimmed.match(
    /^#(alerte|secours|vigilance|info|fin)(?:\s+(.*))?$/i,
  );
  if (!match) {
    return null;
  }
  const kind = match[1]!.toLowerCase() as PagerAlertKind;
  const rest = (match[2] ?? "").trim();
  if (!rest) {
    return { kind, text: "", affiliations: [], affiliation: "" };
  }

  const tokens = rest.split(" ");
  let alertId: number | undefined;
  let start = 0;
  if (/^\d+$/.test(tokens[0] ?? "")) {
    alertId = Number.parseInt(tokens[0]!, 10);
    start = 1;
  }

  const affiliations: string[] = [];
  let end = tokens.length;
  while (end > start) {
    const t = tokens[end - 1] ?? "";
    if (t.startsWith("#") && t.length > 1) {
      affiliations.unshift(t.slice(1));
      end--;
      continue;
    }
    break;
  }

  const text = tokens.slice(start, end).join(" ").trim();
  return {
    kind,
    alertId,
    text,
    affiliations,
    affiliation: affiliations[0] ?? "",
  };
}
