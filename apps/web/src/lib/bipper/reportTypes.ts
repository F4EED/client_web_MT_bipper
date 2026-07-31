/** Gaulix signalement types — icons shared with Android waypoints / map markers. */

export type ReportTypeId =
  | "incendie"
  | "axe_inonde"
  | "axe_barree"
  | "objet_sur_axe"
  | "arbre_sur_axe"
  | "accident";

export type ReportCategoryId = "routes" | "crises" | "secouristes";

export type ReportType = {
  id: ReportTypeId;
  category: ReportCategoryId;
  /** Unicode codepoint for Meshtastic Waypoint.icon */
  iconCodepoint: number;
  emoji: string;
};

export const REPORT_CATEGORIES: readonly ReportCategoryId[] = [
  "routes",
  "crises",
  "secouristes",
] as const;

export const REPORT_TYPES: readonly ReportType[] = [
  { id: "axe_inonde", category: "routes", iconCodepoint: 0x1f30a, emoji: "🌊" },
  { id: "axe_barree", category: "routes", iconCodepoint: 0x1f6ab, emoji: "🚫" },
  {
    id: "objet_sur_axe",
    category: "routes",
    iconCodepoint: 0x1f4e6,
    emoji: "📦",
  },
  { id: "accident", category: "routes", iconCodepoint: 0x1f6a8, emoji: "🚨" },
  { id: "incendie", category: "crises", iconCodepoint: 0x1f525, emoji: "🔥" },
  {
    id: "arbre_sur_axe",
    category: "crises",
    iconCodepoint: 0x1f333,
    emoji: "🌳",
  },
] as const;

export function reportTypesForCategory(
  category: ReportCategoryId,
): readonly ReportType[] {
  return REPORT_TYPES.filter((r) => r.category === category);
}

export function reportWaypointName(type: ReportType, label: string): string {
  return `${type.emoji} ${label}`.slice(0, 30);
}
