import { useBipperPager } from "@core/hooks/useBipperPager.ts";
import { Button } from "@components/UI/Button.tsx";
import { Heading } from "@components/UI/Typography/Heading.tsx";
import { Subtle } from "@components/UI/Typography/Subtle.tsx";
import {
  EMPTY_SERVICE_TAG_VALUES,
  type ServiceTagValues,
} from "@app/lib/bipper/serviceTags.ts";
import { RefreshCwIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

const SERVICE_TAG_OPTIONS = [1, 2, 3, 4] as const;

export function BipperGaulixPanel() {
  const { t } = useTranslation("bipper");
  const {
    connected,
    status,
    busy,
    refreshStatus,
    applyTagValues,
    applyBeepCount,
    applyActivationCode,
  } = useBipperPager();

  const [oldCode, setOldCode] = useState("GAULIX");
  const [newCode, setNewCode] = useState("");
  const [tagValues, setTagValues] = useState<ServiceTagValues>(
    EMPTY_SERVICE_TAG_VALUES,
  );
  const [beepCount, setBeepCount] = useState("0");

  useEffect(() => {
    if (!status) {
      return;
    }
    if (status.code) {
      setOldCode(status.code);
    }
    setTagValues({ ...status.tagValues });
    if (status.beeps) {
      setBeepCount(status.beeps === "continu" ? "0" : status.beeps);
    }
  }, [status]);

  useEffect(() => {
    if (connected) {
      void refreshStatus();
    }
  }, [connected, refreshStatus]);

  if (!connected) {
    return (
      <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4">
        <Subtle>{t("gaulix.notConnected")}</Subtle>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Heading as="h3">{t("gaulix.title")}</Heading>
        <Subtle className="mt-1">{t("gaulix.description")}</Subtle>
        <Subtle className="mt-2 text-xs opacity-80">
          {t("gaulix.usbHint")}
        </Subtle>
      </div>

      <div className="rounded-lg border border-slate-300 dark:border-slate-600 p-4">
        <div className="flex items-center justify-between gap-3">
          <Heading as="h4">{t("gaulix.status.title")}</Heading>
          <Button
            type="button"
            variant="subtle"
            disabled={busy}
            onClick={() => void refreshStatus()}
          >
            <RefreshCwIcon className="size-4" />
            {t("gaulix.status.refresh")}
          </Button>
        </div>
        {status ? (
          <dl className="mt-3 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="font-medium">{t("gaulix.status.state")}</dt>
              <dd>{status.state}</dd>
            </div>
            <div>
              <dt className="font-medium">{t("gaulix.status.alerts")}</dt>
              <dd>{status.alertCount}</dd>
            </div>
            <div>
              <dt className="font-medium">{t("gaulix.status.battery")}</dt>
              <dd>{status.battery}</dd>
            </div>
            <div>
              <dt className="font-medium">{t("gaulix.status.beeps")}</dt>
              <dd>{status.beeps}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="font-medium">{t("gaulix.status.tag")}</dt>
              <dd>{status.tag}</dd>
            </div>
            <div>
              <dt className="font-medium">{t("gaulix.status.code")}</dt>
              <dd>{status.code}</dd>
            </div>
          </dl>
        ) : (
          <Subtle className="mt-3">{t("gaulix.status.empty")}</Subtle>
        )}
      </div>

      <div className="rounded-lg border border-slate-300 dark:border-slate-600 p-4 space-y-4">
        <div>
          <Heading as="h4">{t("gaulix.tag.title")}</Heading>
          <Subtle className="mt-1">{t("gaulix.tag.description")}</Subtle>
        </div>

        <div className="grid gap-3">
          {SERVICE_TAG_OPTIONS.map((tag) => (
            <label
              key={tag}
              className="grid gap-1 text-sm sm:grid-cols-[4rem_1fr] sm:items-center"
            >
              <span className="font-medium">T{tag}</span>
              <input
                className="rounded border px-3 py-2 dark:bg-slate-800"
                placeholder={t("gaulix.tag.placeholder")}
                value={tagValues[tag]}
                disabled={busy}
                onChange={(e) =>
                  setTagValues((prev) => ({ ...prev, [tag]: e.target.value }))
                }
              />
            </label>
          ))}
        </div>

        <Button
          type="button"
          disabled={busy}
          onClick={() => void applyTagValues(tagValues)}
        >
          {t("gaulix.tag.apply")}
        </Button>

        <Subtle className="text-xs">{t("gaulix.tag.hint")}</Subtle>
      </div>

      <div className="rounded-lg border border-slate-300 dark:border-slate-600 p-4 space-y-3">
        <Heading as="h4">{t("gaulix.code.title")}</Heading>
        <Subtle>{t("gaulix.code.description")}</Subtle>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            <span>{t("gaulix.code.old")}</span>
            <input
              className="rounded border px-3 py-2 dark:bg-slate-800"
              value={oldCode}
              onChange={(e) => setOldCode(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span>{t("gaulix.code.new")}</span>
            <input
              className="rounded border px-3 py-2 dark:bg-slate-800"
              value={newCode}
              onChange={(e) => setNewCode(e.target.value)}
            />
          </label>
        </div>
        <Button
          type="button"
          disabled={busy || !newCode.trim()}
          onClick={() => void applyActivationCode(oldCode, newCode)}
        >
          {t("gaulix.code.apply")}
        </Button>
      </div>

      <div className="rounded-lg border border-slate-300 dark:border-slate-600 p-4 space-y-3">
        <Heading as="h4">{t("gaulix.beep.title")}</Heading>
        <Subtle>{t("gaulix.beep.description")}</Subtle>
        <label className="flex flex-col gap-1 text-sm max-w-xs">
          <span>{t("gaulix.beep.label")}</span>
          <input
            type="number"
            min={0}
            max={20}
            className="rounded border px-3 py-2 dark:bg-slate-800"
            value={beepCount}
            onChange={(e) => setBeepCount(e.target.value)}
          />
        </label>
        <Button
          type="button"
          disabled={busy}
          onClick={() =>
            void applyBeepCount(Number.parseInt(beepCount, 10) || 0)
          }
        >
          {t("gaulix.beep.apply")}
        </Button>
      </div>
    </div>
  );
}
