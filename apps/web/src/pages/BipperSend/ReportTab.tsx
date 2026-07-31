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

function findBaliseChannelIndex(
  channels: ReturnType<typeof useChannels>,
): number | null {
  for (const ch of channels) {
    const name = ch?.settings?.name?.toLowerCase() ?? "";
    if (name === "fr_balise" || name === "frbalise") {
      return ch.index;
    }
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
  const [browserHasPosition, setBrowserHasPosition] = useState(false);

  const categoryTypes = useMemo(
    () => reportTypesForCategory(category),
    [category],
  );

  const type = useMemo(
    () => categoryTypes.find((r) => r.id === typeId) ?? categoryTypes[0],
    [categoryTypes, typeId],
  );

  const baliseChannel = useMemo(
    () => findBaliseChannelIndex(channels),
    [channels],
  );

  const radioHasPosition = Boolean(
    myNode?.position?.latitudeI || myNode?.position?.longitudeI,
  );

  const canSendPosition = radioHasPosition || browserHasPosition;
  const label = type ? t(`report.types.${type.id}`) : "";

  useEffect(() => {
    const types = reportTypesForCategory(category);
    if (types.length === 0) return;
    if (!types.some((r) => r.id === typeId)) {
      setTypeId(types[0]!.id);
    }
  }, [category, typeId]);

  useEffect(() => {
    if (radioHasPosition || !navigator.geolocation) {
      if (radioHasPosition) setBrowserHasPosition(false);
      return;
    }
    let cancelled = false;
    void readBrowserPosition()
      .then(() => {
        if (!cancelled) setBrowserHasPosition(true);
      })
      .catch(() => {
        if (!cancelled) setBrowserHasPosition(false);
      });
    return () => {
      cancelled = true;
    };
  }, [radioHasPosition]);

  const resolvePosition = async (): Promise<{
    latI: number;
    lonI: number;
    sourceLabel: string;
  } | null> => {
    const radioLat = myNode?.position?.latitudeI ?? 0;
    const radioLon = myNode?.position?.longitudeI ?? 0;
    if (radioLat || radioLon) {
      return { latI: radioLat, lonI: radioLon, sourceLabel: "GPS radio" };
    }
    try {
      const coords = await readBrowserPosition();
      setBrowserHasPosition(true);
      return { ...coords, sourceLabel: "GPS terminal" };
    } catch {
      setBrowserHasPosition(false);
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

    const pos = await resolvePosition();
    if (!pos) {
      toast({
        title: t("report.needPosition.title"),
        description: t("report.needPosition.description"),
      });
      return;
    }

    const channel =
      baliseChannel !== null
        ? (baliseChannel as Types.ChannelNumber)
        : Types.ChannelNumber.Primary;

    const waypoint = create(Protobuf.Mesh.WaypointSchema, {
      id: Math.floor(Math.random() * 0x7fffffff) || 1,
      latitudeI: pos.latI,
      longitudeI: pos.lonI,
      name: reportWaypointName(type, label),
      description: `${label} (${pos.sourceLabel})`.slice(0, 100),
      icon: type.iconCodepoint,
      expire: 0,
      lockedTo: 0,
    });

    setBusy(true);
    try {
      await meshClient.sendPacket(
        toBinary(Protobuf.Mesh.WaypointSchema, waypoint),
        Protobuf.Portnums.PortNum.WAYPOINT_APP,
        "broadcast",
        channel,
        true,
        false,
      );
      toast({
        title: t("report.sent.title"),
        description: `${type.emoji} ${label}`,
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
      {/* Not nested Radix Tabs — parent GerMaCrise already uses Tabs. */}
      <div
        role="tablist"
        aria-label={t("manager.tabs.report")}
        className="grid grid-cols-3 gap-1 rounded-lg bg-slate-200 p-1 dark:bg-slate-700"
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
                "rounded-md px-2 py-2 text-sm font-semibold transition",
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
            const typeLabel = t(`report.types.${r.id}`);
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => setTypeId(r.id)}
                aria-pressed={selected}
                title={typeLabel}
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
                <span className="text-[10px] font-medium leading-tight">
                  {typeLabel}
                </span>
              </button>
            );
          })}
        </div>
      )}

      <Button
        type="button"
        disabled={busy || !meshClient || !canSendPosition || !type}
        onClick={() => void send()}
      >
        {type ? `${type.emoji} ${t("report.submit")}` : t("report.submit")}
      </Button>
    </div>
  );
}
