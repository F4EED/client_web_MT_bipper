import { Button } from "@components/UI/Button.tsx";
import { Subtle } from "@components/UI/Typography/Subtle.tsx";
import { useToast } from "@core/hooks/useToast.ts";
import { useMyNodeAsProto } from "@core/hooks/useNodesAsProto.ts";
import {
  REPORT_CATEGORIES,
  reportTypesForCategory,
  reportWaypointName,
  type ReportCategoryId,
  type ReportTypeId,
} from "@app/lib/bipper/reportTypes.ts";
import { create } from "@bufbuild/protobuf";
import { toBinary } from "@bufbuild/protobuf";
import { Protobuf, Types } from "@meshtastic/sdk";
import { useActiveClient, useChannels } from "@meshtastic/sdk-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

function findChannelIndex(
  channels: ReturnType<typeof useChannels>,
  names: string[],
): number | null {
  const wanted = new Set(names.map((n) => n.toLowerCase()));
  for (const ch of channels) {
    const name = ch?.settings?.name?.toLowerCase() ?? "";
    if (wanted.has(name)) return ch.index;
  }
  return null;
}

function readBrowserPosition(): Promise<{ latI: number; lonI: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("geolocation unavailable"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          latI: Math.round(pos.coords.latitude * 1e7),
          lonI: Math.round(pos.coords.longitude * 1e7),
        });
      },
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 },
    );
  });
}

export function ReportTab() {
  const { t } = useTranslation("bipper");
  const { toast } = useToast();
  const meshClient = useActiveClient();
  const channels = useChannels();
  const myNode = useMyNodeAsProto();

  const [category, setCategory] = useState<ReportCategoryId>("routes");
  const [typeId, setTypeId] = useState<ReportTypeId>("axe_inonde");
  const [busy, setBusy] = useState(false);

  const categoryTypes = useMemo(
    () => reportTypesForCategory(category),
    [category],
  );

  const type = useMemo(
    () => categoryTypes.find((r) => r.id === typeId) ?? categoryTypes[0],
    [categoryTypes, typeId],
  );

  const alerteChannel = useMemo(
    () => findChannelIndex(channels, ["alerte"]),
    [channels],
  );
  const baliseChannel = useMemo(
    () => findChannelIndex(channels, ["fr_balise", "frbalise"]),
    [channels],
  );

  const isValidLatLonI = (latI: number, lonI: number): boolean => {
    if (!latI || !lonI) return false;
    const lat = latI * 1e-7;
    const lon = lonI * 1e-7;
    return lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
  };

  /** Button enabled when connected; GPS resolved at send (hardware then phone). */
  const canSend = Boolean(meshClient) && !busy && Boolean(type);

  useEffect(() => {
    const types = reportTypesForCategory(category);
    if (types.length === 0) return;
    if (!types.some((r) => r.id === typeId)) {
      setTypeId(types[0]!.id);
    }
  }, [category, typeId]);

  /** (1) hardware / radio, (2) smartphone — null if neither usable. */
  const resolvePosition = async (): Promise<{
    latI: number;
    lonI: number;
    sourceLabel: string;
  } | null> => {
    const radioLat = myNode?.position?.latitudeI ?? 0;
    const radioLon = myNode?.position?.longitudeI ?? 0;
    if (isValidLatLonI(radioLat, radioLon)) {
      return { latI: radioLat, lonI: radioLon, sourceLabel: "GPS hardware" };
    }
    if (!navigator.geolocation) return null;
    try {
      const coords = await readBrowserPosition();
      if (!isValidLatLonI(coords.latI, coords.lonI)) return null;
      return { ...coords, sourceLabel: "GPS smartphone" };
    } catch {
      return null;
    }
  };

  const send = async () => {
    if (!meshClient || !type) {
      toast({
        title: t("toast.notConnected.title"),
        description: t("toast.notConnected.description"),
      });
      return;
    }

    setBusy(true);
    try {
      const pos = await resolvePosition();
      if (!pos) {
        toast({
          title: t("report.needPosition.title"),
          description: t("report.needPosition.description"),
        });
        return;
      }

      if (alerteChannel === null) {
        toast({
          title: t("send.noAlerteChannel.title"),
          description: t("send.noAlerteChannel.description"),
        });
        return;
      }
      // Dual TX: Alerte (7) + Fr_Balise (0) — PortNum WAYPOINT_APP (8).
      const channelsToSend = Array.from(
        new Set([
          alerteChannel,
          baliseChannel !== null ? baliseChannel : Types.ChannelNumber.Primary,
        ]),
      ) as Types.ChannelNumber[];

      const waypointId = Math.floor(Math.random() * 0x7fffffff) || 1;
      const waypoint = create(Protobuf.Mesh.WaypointSchema, {
        id: waypointId,
        latitudeI: pos.latI,
        longitudeI: pos.lonI,
        name: reportWaypointName(type),
        description: `${type.label} (${pos.sourceLabel})`.slice(0, 100),
        icon: type.iconCodepoint,
        expire: 0,
        lockedTo: 0,
      });
      const payload = toBinary(Protobuf.Mesh.WaypointSchema, waypoint);

      for (const channel of channelsToSend) {
        await meshClient.sendPacket(
          payload,
          Protobuf.Portnums.PortNum.WAYPOINT_APP,
          "broadcast",
          channel,
          true,
          false,
          false,
          undefined,
          undefined,
          undefined,
          Protobuf.Mesh.MeshPacket_Priority.ALERT,
        );
      }
      toast({
        title: t("report.sent.title"),
        description: `${type.emoji} ${type.label}`,
      });
    } catch (e) {
      toast({
        title: t("toast.sendFailed.title"),
        description: String(e),
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div
        role="tablist"
        aria-label={t("manager.tabs.report")}
        className="grid grid-cols-3 gap-1 rounded-lg bg-slate-200 p-1 sm:grid-cols-6 dark:bg-slate-700"
      >
        {REPORT_CATEGORIES.map((cat) => {
          const selected = category === cat;
          return (
            <button
              key={cat}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setCategory(cat)}
              className={[
                "rounded-md px-1 py-2 text-xs font-semibold transition sm:text-sm",
                selected
                  ? "bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white"
                  : "text-slate-700 hover:bg-white/50 dark:text-slate-200 dark:hover:bg-slate-800/60",
              ].join(" ")}
            >
              {t(`report.categories.${cat}`)}
            </button>
          );
        })}
      </div>

      {categoryTypes.length === 0 ? (
        <Subtle className="text-sm py-6 text-center">
          {t("report.categoryEmpty")}
        </Subtle>
      ) : (
        <div className="grid grid-cols-4 gap-1.5">
          {categoryTypes.map((r) => {
            const selected = r.id === typeId;
            return (
              <button
                key={`${category}-${r.id}`}
                type="button"
                onClick={() => setTypeId(r.id)}
                aria-pressed={selected}
                title={r.label}
                className={[
                  "flex flex-col items-center justify-center gap-0.5 rounded-lg border px-1 py-1.5 text-center transition",
                  "min-h-[4.25rem]",
                  selected
                    ? "border-amber-500 bg-amber-50 ring-2 ring-amber-400 dark:bg-amber-950/40"
                    : "border-slate-300 bg-background-primary hover:border-slate-400 hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-slate-800/60",
                ].join(" ")}
              >
                <span className="text-xl leading-none" aria-hidden>
                  {r.emoji}
                </span>
                <span className="text-[9px] font-medium leading-tight">
                  {r.label}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {type ? (
        <Subtle className="text-xs text-center">
          {t("report.hintWaypoint")}
        </Subtle>
      ) : null}

      <Button type="button" disabled={!canSend} onClick={() => void send()}>
        {type ? `${type.emoji} ${t("report.submit")}` : t("report.submit")}
      </Button>
    </div>
  );
}
