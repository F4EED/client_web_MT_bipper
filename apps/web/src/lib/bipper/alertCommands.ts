export type PagerAlertKind =
  | "alerte"
  | "secours"
  | "vigilance"
  | "info"
  | "fin";

export type PagerAlertPayload = {
  kind: PagerAlertKind;
  text?: string;
  /** Appartenance (#tag) contrôlée contre T1–T4 sur le Bipper. Vide = tous. */
  affiliation?: string;
};

/** Build wire text: `#alerte <texte> #appartenance` */
export function formatPagerAlertCommand(payload: PagerAlertPayload): string {
  const kind = payload.kind;
  const text = (payload.text ?? "").trim().replace(/\s+/g, " ");
  const affiliation = (payload.affiliation ?? "")
    .trim()
    .replace(/^#/, "")
    .replace(/\s+/g, "");

  if (kind === "fin") {
    return affiliation ? `#fin #${affiliation}` : "#fin";
  }

  const parts = [`#${kind}`];
  if (text) {
    parts.push(text);
  }
  if (affiliation) {
    parts.push(`#${affiliation}`);
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
    return { kind, text: "", affiliation: "" };
  }

  const tokens = rest.split(" ");
  const last = tokens[tokens.length - 1] ?? "";
  if (last.startsWith("#") && last.length > 1) {
    const affiliation = last.slice(1);
    const text = tokens.slice(0, -1).join(" ");
    return { kind, text, affiliation };
  }
  return { kind, text: rest, affiliation: "" };
}
