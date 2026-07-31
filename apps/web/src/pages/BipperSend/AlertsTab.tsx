import { Button } from "@components/UI/Button.tsx";
import { Subtle } from "@components/UI/Typography/Subtle.tsx";
import {
  useAlertManagerStore,
  type ManagedAlert,
  type ManagedAlertStatus,
} from "@core/stores/alertManagerStore/index.ts";
import { useTranslation } from "react-i18next";

function statusClass(status: ManagedAlertStatus): string {
  switch (status) {
    case "emise":
      return "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200";
    case "en_cours":
      return "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200";
    case "cloturee":
      return "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200";
  }
}

function formatWhen(ts: number): string {
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return String(ts);
  }
}

function AlertRow({
  alert,
  ackCount,
}: {
  alert: ManagedAlert;
  ackCount: number;
}) {
  const { t } = useTranslation("bipper");
  return (
    <li className="rounded-md border border-slate-300 p-3 text-sm dark:border-slate-600">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`rounded px-2 py-0.5 text-xs font-medium ${statusClass(alert.status)}`}
        >
          {t(`manager.status.${alert.status}`)}
        </span>
        <span className="font-medium">{t(`send.kinds.${alert.kind}`)}</span>
        {alert.alertId !== undefined && (
          <span className="text-slate-600 dark:text-slate-300">
            #{alert.alertId}
          </span>
        )}
        <span className="ml-auto text-xs text-slate-500">
          {formatWhen(alert.createdAt)}
        </span>
      </div>
      {alert.text && <p className="mt-2">{alert.text}</p>}
      {alert.affiliations.length > 0 && (
        <Subtle className="mt-1 text-xs">
          {alert.affiliations.map((a) => `#${a}`).join(" ")}
        </Subtle>
      )}
      <code className="mt-2 block break-all text-xs text-slate-500">
        {alert.wire}
      </code>
      {ackCount > 0 && (
        <Subtle className="mt-1 text-xs">
          {t("manager.alerts.ackCount", { count: ackCount })}
        </Subtle>
      )}
    </li>
  );
}

export function AlertsTab() {
  const { t } = useTranslation("bipper");
  const alerts = useAlertManagerStore((s) => s.alerts);
  const clearAll = useAlertManagerStore((s) => s.clearAll);
  const acks = useAlertManagerStore((s) => s.acks);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Subtle>{t("manager.alerts.description")}</Subtle>
        {alerts.length > 0 && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              if (window.confirm(t("manager.clearConfirm"))) {
                clearAll();
              }
            }}
          >
            {t("manager.clear")}
          </Button>
        )}
      </div>

      {alerts.length === 0 ? (
        <Subtle>{t("manager.alerts.empty")}</Subtle>
      ) : (
        <ul className="flex flex-col gap-3">
          {alerts.map((alert) => (
            <AlertRow
              key={alert.id}
              alert={alert}
              ackCount={
                acks.filter((a) => a.managedAlertId === alert.id).length
              }
            />
          ))}
        </ul>
      )}
    </div>
  );
}
