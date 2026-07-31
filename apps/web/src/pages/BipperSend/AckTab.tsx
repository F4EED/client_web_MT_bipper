import { Subtle } from "@components/UI/Typography/Subtle.tsx";
import {
  useAlertManagerStore,
  type AlertAckEntry,
} from "@core/stores/alertManagerStore/index.ts";
import { useNodesAsProto } from "@core/hooks/useNodesAsProto.ts";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

function formatWhen(ts: number): string {
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return String(ts);
  }
}

function formatGps(ack: AlertAckEntry): string | null {
  if (ack.lat === undefined || ack.lon === undefined) {
    return null;
  }
  const latH = ack.lat >= 0 ? "N" : "S";
  const lonH = ack.lon >= 0 ? "E" : "W";
  return `${Math.abs(ack.lat).toFixed(5)}${latH} ${Math.abs(ack.lon).toFixed(5)}${lonH}`;
}

function nodeLabel(
  fromNode: number,
  fromName: string | undefined,
  lookup: Map<number, string>,
): string {
  const live = lookup.get(fromNode);
  if (live) {
    return live;
  }
  if (fromName) {
    return fromName;
  }
  return `!${fromNode.toString(16)}`;
}

export function AckTab() {
  const { t } = useTranslation("bipper");
  const acks = useAlertManagerStore((s) => s.acks);
  const alerts = useAlertManagerStore((s) => s.alerts);
  const nodes = useNodesAsProto();

  const nameByNum = useMemo(() => {
    const map = new Map<number, string>();
    for (const n of nodes) {
      const label = n.user?.longName || n.user?.shortName;
      if (label) {
        map.set(n.num, label);
      }
    }
    return map;
  }, [nodes]);

  const alertLabel = (ack: AlertAckEntry): string => {
    if (ack.alertId !== undefined) {
      return `#${ack.alertId}`;
    }
    if (ack.managedAlertId) {
      const a = alerts.find((x) => x.id === ack.managedAlertId);
      if (a?.alertId !== undefined) {
        return `#${a.alertId}`;
      }
      if (a) {
        return t(`send.kinds.${a.kind}`);
      }
    }
    return "—";
  };

  return (
    <div className="flex flex-col gap-4">
      <Subtle>{t("manager.acks.description")}</Subtle>

      {acks.length === 0 ? (
        <Subtle>{t("manager.acks.empty")}</Subtle>
      ) : (
        <ul className="flex flex-col gap-3">
          {acks.map((ack) => {
            const gps = formatGps(ack);
            return (
              <li
                key={ack.id}
                className="rounded-md border border-slate-300 p-3 text-sm dark:border-slate-600"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">
                    {nodeLabel(ack.fromNode, ack.fromName, nameByNum)}
                  </span>
                  <span className="text-xs text-slate-500">
                    {`!${ack.fromNode.toString(16)}`}
                  </span>
                  <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200">
                    {t("manager.acks.alert", { id: alertLabel(ack) })}
                  </span>
                  <span className="ml-auto text-xs text-slate-500">
                    {ack.timeLabel} · {formatWhen(ack.receivedAt)}
                  </span>
                </div>
                {ack.snippet && (
                  <p className="mt-2 text-slate-700 dark:text-slate-200">
                    {ack.snippet}
                  </p>
                )}
                {gps && (
                  <Subtle className="mt-1 text-xs">
                    {t("manager.acks.gps", { gps })}
                  </Subtle>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
