/**
 * Firmware v1.12 ACK wire format:
 * `Pager ACK alerte [#N] JJ/MM HH:MM[ — text][ | latN/S lonE/W]`
 */

export type ParsedPagerAck = {
  alertId?: number;
  timeLabel: string;
  snippet?: string;
  lat?: number;
  lon?: number;
  raw: string;
};

const ACK_RE =
  /^Pager ACK alerte(?:\s+#(\d+))?\s+(\d{2}\/\d{2}\s+\d{2}:\d{2})(?:\s+—\s+([\s\S]+?))?(?:\s+\|\s+([\d.]+)\s*([NS])\s+([\d.]+)\s*([EW]))?\s*$/i;

function signedCoord(abs: number, hemi: string): number {
  const upper = hemi.toUpperCase();
  if (upper === "S" || upper === "W") {
    return -abs;
  }
  return abs;
}

export function parsePagerAck(raw: string): ParsedPagerAck | null {
  const trimmed = raw.trim().replace(/\s+/g, " ");
  if (!trimmed.toLowerCase().startsWith("pager ack")) {
    return null;
  }

  const match = trimmed.match(ACK_RE);
  if (!match) {
    return null;
  }

  const alertIdRaw = match[1];
  const timeLabel = match[2]!;
  let snippet = match[3]?.trim() || undefined;
  const latAbs = match[4];
  const latHemi = match[5];
  const lonAbs = match[6];
  const lonHemi = match[7];

  // If GPS was glued into the snippet (no clean " | " split), strip it.
  if (snippet && !latAbs) {
    const gpsInSnippet = snippet.match(
      /^(.*?)\s+\|\s+([\d.]+)\s*([NS])\s+([\d.]+)\s*([EW])\s*$/i,
    );
    if (gpsInSnippet) {
      snippet = gpsInSnippet[1]?.trim() || undefined;
      const lat = Number.parseFloat(gpsInSnippet[2]!);
      const lon = Number.parseFloat(gpsInSnippet[4]!);
      return {
        alertId: alertIdRaw ? Number.parseInt(alertIdRaw, 10) : undefined,
        timeLabel,
        snippet,
        lat: signedCoord(lat, gpsInSnippet[3]!),
        lon: signedCoord(lon, gpsInSnippet[5]!),
        raw: trimmed,
      };
    }
  }

  const result: ParsedPagerAck = {
    alertId: alertIdRaw ? Number.parseInt(alertIdRaw, 10) : undefined,
    timeLabel,
    snippet,
    raw: trimmed,
  };

  if (latAbs && latHemi && lonAbs && lonHemi) {
    result.lat = signedCoord(Number.parseFloat(latAbs), latHemi);
    result.lon = signedCoord(Number.parseFloat(lonAbs), lonHemi);
  }

  return result;
}

export function isPagerAckText(raw: string): boolean {
  return /^\s*Pager ACK\b/i.test(raw);
}
