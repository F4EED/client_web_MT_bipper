/** Gaulix GerMaCrise signalement — shared with Android. */

export type ReportCategoryId = "routes" | "crises" | "secouristes" | "status";

export type ReportKind = "waypoint" | "status";

export type ReportTypeId = string;

export type ReportType = {
  id: ReportTypeId;
  categories: readonly ReportCategoryId[];
  kind: ReportKind;
  /** Unicode codepoint for Meshtastic Waypoint.icon (waypoint only) */
  iconCodepoint: number;
  emoji: string;
  /** French operational label (shown as-is) */
  label: string;
};

export const REPORT_CATEGORIES: readonly ReportCategoryId[] = [
  "routes",
  "crises",
  "secouristes",
  "status",
] as const;

/** Status / secouriste buttons reused across Crises, Secouristes, Status. */
const STATUS_BUTTONS: readonly Omit<ReportType, "categories">[] = [
  {
    id: "parti",
    kind: "status",
    iconCodepoint: 0x1f6b6,
    emoji: "🚶",
    label: "PARTI",
  },
  {
    id: "sur_les_lieux",
    kind: "status",
    iconCodepoint: 0x1f4cd,
    emoji: "📍",
    label: "SUR LES LIEUX",
  },
  {
    id: "alerte_recue",
    kind: "status",
    iconCodepoint: 0x2705,
    emoji: "✅",
    label: "Alerte bien reçus et lu",
  },
  {
    id: "depart_hopital",
    kind: "status",
    iconCodepoint: 0x1f691,
    emoji: "🚑",
    label: "DEPART HOPITAL",
  },
  {
    id: "arrivee_hopital",
    kind: "status",
    iconCodepoint: 0x1f3e5,
    emoji: "🏥",
    label: "ARRIVEE HOPITAL",
  },
  {
    id: "disponible",
    kind: "status",
    iconCodepoint: 0x2705,
    emoji: "🟢",
    label: "DISPONIBLE",
  },
  {
    id: "indisponible",
    kind: "status",
    iconCodepoint: 0x1f534,
    emoji: "🔴",
    label: "INDISPONIBLE",
  },
  {
    id: "rentre",
    kind: "status",
    iconCodepoint: 0x1f3e0,
    emoji: "🏠",
    label: "RENTRE",
  },
  {
    id: "police_ssl",
    kind: "status",
    iconCodepoint: 0x1f46e,
    emoji: "👮",
    label: "POLICE SSL",
  },
  {
    id: "gendarmerie_ssl",
    kind: "status",
    iconCodepoint: 0x1f3db,
    emoji: "🏛️",
    label: "GENDARMERIE SSL",
  },
  {
    id: "smur_ssl",
    kind: "status",
    iconCodepoint: 0x1f691,
    emoji: "🚑",
    label: "SMUR SSL",
  },
  {
    id: "gdf_ssl",
    kind: "status",
    iconCodepoint: 0x26fd,
    emoji: "⛽",
    label: "GDF SSL",
  },
  {
    id: "cg_ssl",
    kind: "status",
    iconCodepoint: 0x1f3d7,
    emoji: "🏗️",
    label: "CG SSL",
  },
  {
    id: "dir_ssl",
    kind: "status",
    iconCodepoint: 0x1f6e3,
    emoji: "🛣️",
    label: "DIR SSL",
  },
  {
    id: "dispo_hors_secteur",
    kind: "status",
    iconCodepoint: 0x1f4e1,
    emoji: "📡",
    label: "DISPO HORS SECTEUR",
  },
  {
    id: "pol_municipal_ssl",
    kind: "status",
    iconCodepoint: 0x1f6a8,
    emoji: "🚨",
    label: "POL. Municipal SSL",
  },
  {
    id: "brig_ssl",
    kind: "status",
    iconCodepoint: 0x1f33f,
    emoji: "🌿",
    label: "BRIG. SSL",
  },
  {
    id: "maire_ssl",
    kind: "status",
    iconCodepoint: 0x1f3db,
    emoji: "🏛️",
    label: "MAIRE SSL",
  },
];

const STATUS_IN_CRISES_SECOURISTES: readonly ReportType[] = STATUS_BUTTONS.map(
  (b) => ({
    ...b,
    categories: ["crises", "secouristes", "status"] as const,
  }),
);

export const REPORT_TYPES: readonly ReportType[] = [
  {
    id: "axe_inonde",
    categories: ["routes"],
    kind: "waypoint",
    iconCodepoint: 0x1f30a,
    emoji: "🌊",
    label: "Axe inondé",
  },
  {
    id: "axe_barree",
    categories: ["routes"],
    kind: "waypoint",
    iconCodepoint: 0x1f6ab,
    emoji: "🚫",
    label: "Axe barré",
  },
  {
    id: "objet_sur_axe",
    categories: ["routes"],
    kind: "waypoint",
    iconCodepoint: 0x1f4e6,
    emoji: "📦",
    label: "Objet sur axe",
  },
  {
    id: "arbre_sur_axe",
    categories: ["routes"],
    kind: "waypoint",
    iconCodepoint: 0x1f333,
    emoji: "🌳",
    label: "Arbre sur axe",
  },
  {
    id: "accident_routier",
    categories: ["routes"],
    kind: "waypoint",
    iconCodepoint: 0x1f6a8,
    emoji: "🚨",
    label: "Accident routier",
  },
  {
    id: "incendie",
    categories: ["crises"],
    kind: "waypoint",
    iconCodepoint: 0x1f525,
    emoji: "🔥",
    label: "Incendie",
  },
  {
    id: "inondation",
    categories: ["crises"],
    kind: "waypoint",
    iconCodepoint: 0x1f30a,
    emoji: "🌊",
    label: "Inondation",
  },
  ...STATUS_IN_CRISES_SECOURISTES,
  {
    id: "rele_sar",
    categories: ["crises"],
    kind: "status",
    iconCodepoint: 0x1f6df,
    emoji: "🛟",
    label: "RELE. SAR",
  },
];

export function reportTypesForCategory(
  category: ReportCategoryId,
): readonly ReportType[] {
  return REPORT_TYPES.filter((r) => r.categories.includes(category));
}

export function reportWaypointName(type: ReportType): string {
  return `${type.emoji} ${type.label}`.slice(0, 30);
}
