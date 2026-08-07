/** Gaulix GerMaCrise signalement — aligned with Signalement GerMaCrise_v1.xlsx */

export type ReportCategoryId =
  | "routes"
  | "status"
  | "sdis"
  | "secourisme"
  | "crise"
  | "adrasec";

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
  "status",
  "sdis",
  "secourisme",
  "crise",
  "adrasec",
] as const;

const R: ReportCategoryId = "routes";
const C: ReportCategoryId = "crise";
const S: ReportCategoryId = "secourisme";
const T: ReportCategoryId = "status";
const A: ReportCategoryId = "adrasec";
const D: ReportCategoryId = "sdis";

function wp(
  id: string,
  categories: readonly ReportCategoryId[],
  iconCodepoint: number,
  emoji: string,
  label: string,
): ReportType {
  return {
    id,
    categories,
    kind: "waypoint",
    iconCodepoint,
    emoji,
    label,
  };
}

/** Cross-tab matrix from Signalement GerMaCrise_v1.xlsx (x = present). */
export const REPORT_TYPES: readonly ReportType[] = [
  wp("axe_inonde", [R, C, S, A, D], 0x1f30a, "🌊", "Axe inondé"),
  wp("axe_barre", [R, C, S, A, D], 0x1f6ab, "🚫", "Axe barré"),
  wp("objet_sur_axe", [R, C, S, A, D], 0x1f4e6, "📦", "Objet sur axe"),
  wp("arbre_sur_axe", [R, C, S, A, D], 0x1f333, "🌳", "Arbre sur axe"),
  wp("animal_sur_axe", [R, C, A, D], 0x1f98c, "🦌", "Animal sur axe"),
  wp("accident_sur_axe", [R, C, S, A, D], 0x1f6a8, "🚨", "Accident sur axe"),
  wp("incendie", [R, C, S, A, D], 0x1f525, "🔥", "Incendie"),
  wp("inondation", [R, C, S, A, D], 0x1f30a, "🌊", "Inondation"),

  wp("parti", [T, D], 0x1f6b6, "🚶", "PARTI"),
  wp("sur_les_lieux", [T, D], 0x1f4cd, "📍", "SUR LES LIEUX"),
  wp(
    "alerte_recue",
    [R, C, S, T, A, D],
    0x2705,
    "✅",
    "Alerte bien reçus et lu",
  ),
  wp("depart_hopital", [C, S, T, D], 0x1f691, "🚑", "DEPART HOPITAL"),
  wp("arrivee_hopital", [C, S, T, D], 0x1f3e5, "🏥", "ARRIVEE HOPITAL"),
  wp("disponible", [T, D], 0x1f7e2, "🟢", "DISPONIBLE"),
  wp("indisponible", [T, D], 0x1f534, "🔴", "INDISPONIBLE"),
  wp("rentre", [T, D], 0x1f3e0, "🏠", "RENTRE"),
  wp("police_ssl", [T, D], 0x1f46e, "👮", "POLICE SSL"),
  wp("gendarmerie_ssl", [T, D], 0x1f3db, "🏛️", "GENDARMERIE SSL"),
  wp("smur_ssl", [T, D], 0x1f691, "🚑", "SMUR SSL"),
  wp("gdf_ssl", [T, D], 0x26fd, "⛽", "GDF SSL"),
  wp("cg_ssl", [T, D], 0x1f3d7, "🏗️", "CG SSL"),
  wp("dtt_ssl", [T, D], 0x1f4cb, "📋", "DTT SSL"),
  wp("dir_ssl", [T, D], 0x1f6e3, "🛣️", "DIR SSL"),
  wp("brig_verte_ssl", [T, D], 0x1f33f, "🌿", "Brig. Verte SSL"),
  wp("pol_muni_ssl", [T, D], 0x1f6a8, "🚨", "Pol. Muni. SSL"),
  wp("mairie_ssl", [T, D], 0x1f3db, "🏛️", "Mairie SSL"),
  wp("releve_sar", [T, D], 0x1f6df, "🛟", "Relève SAR"),
  wp("dispo_hors_secteur", [T, D], 0x1f4e1, "📡", "Dispo hors secteur"),

  wp("cai_chu", [C, S], 0x1f3e5, "🏥", "CAI/CHU"),
  wp("equipes_secouriste", [C, S], 0x1f691, "🚑", "Équipes secouriste"),
  wp(
    "releve_sater_sans_signal",
    [C, A],
    0x1f4e1,
    "📡",
    "Relevé SATER (sans signal)",
  ),
  wp(
    "releve_sater_avec_signal",
    [C, A],
    0x1f4f6,
    "📶",
    "Relevé SATER (avec signal)",
  ),
  wp("point_sar", [C, S, A, D], 0x1f6df, "🛟", "Point SAR"),

  // Secourisme — lot terrain (en plus Excel)
  wp("poste_secours", [S], 0x1f3e5, "🏥", "Poste secours"),
  wp("pma", [S, C], 0x1f691, "🚑", "PMA"),
  wp("dps", [S], 0x1f4cb, "📋", "DPS"),
  wp("zone_triage", [S, C], 0x1f3f7, "🏷️", "Zone triage"),
  wp("zav", [S], 0x1f4cd, "📍", "ZAV"),
  wp("victimes", [S], 0x1f6b6, "🚶", "Victime(s)"),
  wp("blesse_leger", [S], 0x1fa79, "🩹", "Blessé léger"),
  wp("blesse_grave", [S], 0x1fa78, "🩸", "Blessé grave"),
  wp("demande_renfort", [S, C], 0x1f4e2, "📢", "Demande renfort"),
  wp("fin_intervention", [S], 0x2705, "✅", "Fin d'intervention"),
];

export function reportTypesForCategory(
  category: ReportCategoryId,
): readonly ReportType[] {
  return REPORT_TYPES.filter((r) => r.categories.includes(category));
}

export function reportWaypointName(type: ReportType): string {
  return `${type.emoji} ${type.label}`.slice(0, 30);
}
