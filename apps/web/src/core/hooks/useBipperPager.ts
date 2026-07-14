import {
  extractTagLineFromPagerReply,
  formatTagSetCommand,
  formatTagValueCommand,
  parseServiceTagValues,
} from "@app/lib/bipper/serviceTags.ts";
import {
  isPagerCommandReply,
  parsePagerStatus,
  type PagerStatus,
} from "@app/lib/bipper/pagerStatus.ts";
import { useToast } from "@core/hooks/useToast.ts";
import {
  useMyNodeAsProto,
  useMyNodeNumSafe,
} from "@core/hooks/useNodesAsProto.ts";
import type { Message } from "@meshtastic/sdk";
import { Protobuf } from "@meshtastic/sdk";
import { Result } from "better-result";
import { useActiveClient } from "@meshtastic/sdk-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

const EMPTY_MESSAGES: readonly Message[] = [];

function mergeTagIntoStatus(
  prev: PagerStatus | null,
  tagLine: string,
): PagerStatus {
  const tagValues = parseServiceTagValues(tagLine);
  if (prev) {
    return { ...prev, tag: tagLine, tagValues };
  }
  return {
    state: "",
    alertCount: 0,
    battery: "--",
    beeps: "--",
    tag: tagLine,
    tagValues,
    code: "--",
    raw: "",
  };
}

export function useBipperPager() {
  const client = useActiveClient();
  const myNode = useMyNodeAsProto();
  const myNodeNum = useMyNodeNumSafe();
  const { toast } = useToast();
  const { t } = useTranslation("bipper");
  const [status, setStatus] = useState<PagerStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<readonly Message[]>(EMPTY_MESSAGES);
  const handledMessageIds = useRef<Set<number>>(new Set());

  useEffect(() => {
    if (!client || myNodeNum === undefined) {
      setMessages(EMPTY_MESSAGES);
      return;
    }
    const sig = client.chat.direct(myNodeNum);
    setMessages(sig.value);
    return sig.subscribe((next) => setMessages(next));
  }, [client, myNodeNum]);

  useEffect(() => {
    let pendingOk = false;
    let gotStatus = false;

    for (const msg of messages) {
      if (!msg || msg.type !== "direct" || !msg.text) {
        continue;
      }
      if (handledMessageIds.current.has(msg.id)) {
        continue;
      }
      if (!isPagerCommandReply(msg.text)) {
        continue;
      }

      handledMessageIds.current.add(msg.id);

      const parsed = parsePagerStatus(msg.text);
      if (parsed) {
        setStatus(parsed);
        gotStatus = true;
        continue;
      }

      const tagLine = extractTagLineFromPagerReply(msg.text);
      if (tagLine) {
        setStatus((prev) => mergeTagIntoStatus(prev, tagLine));
        continue;
      }

      if (msg.text.startsWith("Pager OK")) {
        pendingOk = true;
        continue;
      }
      if (msg.text.startsWith("Pager ERR")) {
        setBusy(false);
        toast({
          title: t("toast.commandErr.title"),
          description: msg.text,
        });
      }
    }

    if (gotStatus || pendingOk) {
      setBusy(false);
    }
    if (pendingOk && !gotStatus) {
      toast({
        title: t("toast.commandOk.title"),
      });
    }
  }, [messages, toast, t]);

  const sendLocalCommand = useCallback(
    async (text: string, options?: { markBusy?: boolean }) => {
      if (!client || myNodeNum === undefined) {
        toast({
          title: t("toast.notConnected.title"),
          description: t("toast.notConnected.description"),
        });
        return false;
      }
      if (options?.markBusy !== false) {
        setBusy(true);
      }
      const result = await client.chat.send({
        text,
        destination: myNodeNum,
        wantAck: true,
      });
      if (Result.isError(result)) {
        setBusy(false);
        toast({
          title: t("toast.sendFailed.title"),
          description: result.error.message,
        });
        return false;
      }
      return true;
    },
    [client, myNodeNum, toast, t],
  );

  const refreshStatus = useCallback(async () => {
    await sendLocalCommand("#status");
  }, [sendLocalCommand]);

  const applyTagValue = useCallback(
    async (tag: number, value: string) => {
      const cmd = formatTagValueCommand(tag, value);
      if (!cmd) {
        return false;
      }
      const ok = await sendLocalCommand(cmd);
      if (ok) {
        await refreshStatus();
      }
      return ok;
    },
    [sendLocalCommand, refreshStatus],
  );

  const applyTagValues = useCallback(
    async (values: Record<1 | 2 | 3 | 4, string>) => {
      const cmd = formatTagSetCommand(values);
      const ok = await sendLocalCommand(cmd);
      if (ok) {
        await refreshStatus();
      }
      return ok;
    },
    [sendLocalCommand, refreshStatus],
  );

  const applyBeepCount = useCallback(
    async (count: number) => {
      if (count < 0 || count > 20) {
        return false;
      }
      const ok = await sendLocalCommand(`#b ${count}`);
      if (ok) {
        await refreshStatus();
      }
      return ok;
    },
    [sendLocalCommand, refreshStatus],
  );

  const applyActivationCode = useCallback(
    async (oldCode: string, newCode: string) => {
      const oldTrim = oldCode.trim();
      const newTrim = newCode.trim();
      if (!oldTrim || !newTrim) {
        return false;
      }
      const ok = await sendLocalCommand(`#code ${oldTrim} ${newTrim}`);
      if (ok) {
        await refreshStatus();
      }
      return ok;
    },
    [sendLocalCommand, refreshStatus],
  );

  const isBipperHardware =
    myNode?.user?.hwModel ===
      Protobuf.Mesh.HardwareModel.SEEED_WIO_TRACKER_L1 ||
    myNode?.user?.hwModel ===
      Protobuf.Mesh.HardwareModel.SEEED_WIO_TRACKER_L1_EINK;

  return {
    connected: Boolean(client && myNodeNum !== undefined),
    isBipperHardware,
    myNodeNum,
    status,
    busy,
    refreshStatus,
    applyTagValue,
    applyTagValues,
    applyBeepCount,
    applyActivationCode,
  };
}
