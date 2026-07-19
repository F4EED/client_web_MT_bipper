import { PageLayout } from "@components/PageLayout.tsx";
import { Sidebar } from "@components/Sidebar.tsx";
import { Button } from "@components/UI/Button.tsx";
import { Heading } from "@components/UI/Typography/Heading.tsx";
import { Subtle } from "@components/UI/Typography/Subtle.tsx";
import { useToast } from "@core/hooks/useToast.ts";
import {
  useMyNodeAsProto,
  useNodesAsProto,
} from "@core/hooks/useNodesAsProto.ts";
import {
  formatPagerAlertCommand,
  type PagerAlertKind,
} from "@app/lib/bipper/alertCommands.ts";
import { Types } from "@meshtastic/sdk";
import { useActiveClient, useChannels } from "@meshtastic/sdk-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

type DestMode = "alerte" | "direct";

const KINDS: PagerAlertKind[] = [
  "alerte",
  "secours",
  "vigilance",
  "info",
  "fin",
];

function findAlerteChannelIndex(
  channels: ReturnType<typeof useChannels>,
): number | null {
  for (const ch of channels) {
    if (ch?.settings?.name?.toLowerCase() === "alerte") {
      return ch.index;
    }
  }
  return null;
}

export default function BipperSendPage() {
  const { t } = useTranslation("bipper");
  const { toast } = useToast();
  const meshClient = useActiveClient();
  const channels = useChannels();
  const allNodes = useNodesAsProto();
  const myNode = useMyNodeAsProto();

  const [kind, setKind] = useState<PagerAlertKind>("alerte");
  const [text, setText] = useState("");
  const [affiliation, setAffiliation] = useState("");
  const [destMode, setDestMode] = useState<DestMode>("alerte");
  const [directNode, setDirectNode] = useState<number | "">("");
  const [busy, setBusy] = useState(false);

  const alerteChannel = useMemo(
    () => findAlerteChannelIndex(channels),
    [channels],
  );

  const peerNodes = useMemo(
    () =>
      allNodes
        .filter((n) => n.num !== myNode?.num)
        .sort((a, b) =>
          (a.user?.longName ?? "").localeCompare(b.user?.longName ?? ""),
        ),
    [allNodes, myNode?.num],
  );

  const preview = formatPagerAlertCommand({
    kind,
    text: kind === "fin" ? "" : text,
    affiliation,
  });

  const send = async () => {
    if (!meshClient) {
      toast({
        title: t("toast.notConnected.title"),
        description: t("toast.notConnected.description"),
      });
      return;
    }
    if (kind !== "fin" && !text.trim()) {
      toast({
        title: t("send.needText.title"),
        description: t("send.needText.description"),
      });
      return;
    }

    let destination: Types.Destination = "broadcast";
    let channel: Types.ChannelNumber = Types.ChannelNumber.Primary;

    if (destMode === "alerte") {
      if (alerteChannel === null) {
        toast({
          title: t("send.noAlerteChannel.title"),
          description: t("send.noAlerteChannel.description"),
        });
        return;
      }
      destination = "broadcast";
      channel = alerteChannel as Types.ChannelNumber;
    } else {
      if (directNode === "") {
        toast({
          title: t("send.needNode.title"),
          description: t("send.needNode.description"),
        });
        return;
      }
      destination = directNode;
      channel = Types.ChannelNumber.Primary;
    }

    setBusy(true);
    try {
      const result = await meshClient.chat.send({
        text: preview,
        destination,
        channel,
      });
      if (result.status === "error") {
        toast({
          title: t("toast.sendFailed.title"),
          description: String(result.error),
        });
      } else {
        toast({
          title: t("send.sent.title"),
          description: preview,
        });
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <PageLayout label={t("send.pageTitle")} leftBar={<Sidebar />}>
      <div className="mx-auto flex w-full max-w-xl flex-col gap-6 p-4">
        <div>
          <Heading as="h2">{t("send.pageTitle")}</Heading>
          <Subtle className="mt-1">{t("send.pageDescription")}</Subtle>
        </div>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">{t("send.kindLabel")}</span>
          <select
            className="rounded-md border border-slate-300 bg-background-primary px-3 py-2 dark:border-slate-600"
            value={kind}
            onChange={(e) => setKind(e.target.value as PagerAlertKind)}
          >
            {KINDS.map((k) => (
              <option key={k} value={k}>
                {t(`send.kinds.${k}`)}
              </option>
            ))}
          </select>
        </label>

        {kind !== "fin" && (
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">{t("send.textLabel")}</span>
            <textarea
              className="min-h-24 rounded-md border border-slate-300 bg-background-primary px-3 py-2 dark:border-slate-600"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={t("send.textPlaceholder")}
            />
          </label>
        )}

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">{t("send.affiliationLabel")}</span>
          <input
            className="rounded-md border border-slate-300 bg-background-primary px-3 py-2 dark:border-slate-600"
            value={affiliation}
            onChange={(e) => setAffiliation(e.target.value)}
            placeholder={t("send.affiliationPlaceholder")}
          />
          <Subtle className="text-xs">{t("send.affiliationHint")}</Subtle>
        </label>

        <fieldset className="flex flex-col gap-2 text-sm">
          <legend className="font-medium">{t("send.destLabel")}</legend>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="dest"
              checked={destMode === "alerte"}
              onChange={() => setDestMode("alerte")}
            />
            {t("send.destAlerte", {
              channel:
                alerteChannel !== null
                  ? `Alerte (#${alerteChannel})`
                  : t("send.destAlerteMissing"),
            })}
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="dest"
              checked={destMode === "direct"}
              onChange={() => setDestMode("direct")}
            />
            {t("send.destDirect")}
          </label>
          {destMode === "direct" && (
            <select
              className="rounded-md border border-slate-300 bg-background-primary px-3 py-2 dark:border-slate-600"
              value={directNode === "" ? "" : String(directNode)}
              onChange={(e) =>
                setDirectNode(
                  e.target.value === ""
                    ? ""
                    : Number.parseInt(e.target.value, 10),
                )
              }
            >
              <option value="">{t("send.pickNode")}</option>
              {peerNodes.map((n) => (
                <option key={n.num} value={n.num}>
                  {n.user?.longName ||
                    n.user?.shortName ||
                    `!${n.num.toString(16)}`}
                </option>
              ))}
            </select>
          )}
        </fieldset>

        <div className="rounded-md border border-slate-300 bg-slate-50 p-3 text-sm dark:border-slate-600 dark:bg-slate-800">
          <div className="font-medium">{t("send.preview")}</div>
          <code className="mt-1 block break-all">{preview}</code>
        </div>

        <Button
          type="button"
          disabled={busy || !meshClient}
          onClick={() => void send()}
        >
          {t("send.submit")}
        </Button>
      </div>
    </PageLayout>
  );
}
