import type { PagerAlertKind } from "@app/lib/bipper/alertCommands.ts";
import type { ParsedPagerAck } from "@app/lib/bipper/parsePagerAck.ts";
import { create as createStore } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type ManagedAlertStatus = "emise" | "en_cours" | "cloturee";

export type TrackedAlertKind = Exclude<PagerAlertKind, "info" | "fin">;

export type ManagedAlert = {
  id: string;
  alertId?: number;
  kind: TrackedAlertKind;
  text: string;
  affiliations: string[];
  status: ManagedAlertStatus;
  createdAt: number;
  closedAt?: number;
  wire: string;
};

export type AlertAckEntry = {
  id: string;
  messageId?: number;
  fromNode: number;
  fromName?: string;
  receivedAt: number;
  alertId?: number;
  managedAlertId?: string;
  timeLabel: string;
  snippet?: string;
  lat?: number;
  lon?: number;
  raw: string;
};

type RecordEmitInput = {
  kind: TrackedAlertKind;
  alertId?: number;
  text: string;
  affiliations: string[];
  wire: string;
};

type RecordAckInput = {
  messageId?: number;
  fromNode: number;
  fromName?: string;
  receivedAt?: number;
  parsed: ParsedPagerAck;
};

export type AlertManagerState = {
  alerts: ManagedAlert[];
  acks: AlertAckEntry[];
  recordEmit: (input: RecordEmitInput) => string;
  recordClose: (alertId?: number) => void;
  recordAck: (input: RecordAckInput) => void;
  clearAll: () => void;
};

const STORAGE_KEY = "gaulix.alertManager.v1";
const MAX_ALERTS = 200;
const MAX_ACKS = 500;

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function correlateAck(
  parsed: ParsedPagerAck,
  alerts: ManagedAlert[],
): string | undefined {
  if (parsed.alertId !== undefined) {
    const byIdOpen = alerts.find(
      (a) =>
        a.alertId === parsed.alertId &&
        (a.status === "emise" || a.status === "en_cours"),
    );
    if (byIdOpen) {
      return byIdOpen.id;
    }
    const byIdAny = alerts.find((a) => a.alertId === parsed.alertId);
    if (byIdAny) {
      return byIdAny.id;
    }
  }

  const open = alerts
    .filter((a) => a.status === "emise" || a.status === "en_cours")
    .sort((a, b) => b.createdAt - a.createdAt);

  const snippet = parsed.snippet?.trim().toLowerCase();
  if (snippet) {
    const byText = open.find((a) => {
      const t = a.text.trim().toLowerCase();
      if (!t) {
        return false;
      }
      return t.includes(snippet) || snippet.includes(t);
    });
    if (byText) {
      return byText.id;
    }
  }

  return open[0]?.id;
}

export const useAlertManagerStore = createStore<AlertManagerState>()(
  persist(
    (set, get) => ({
      alerts: [],
      acks: [],

      recordEmit: (input) => {
        const id = newId();
        const entry: ManagedAlert = {
          id,
          alertId: input.alertId,
          kind: input.kind,
          text: input.text,
          affiliations: input.affiliations,
          status: "emise",
          createdAt: Date.now(),
          wire: input.wire,
        };
        set((state) => ({
          alerts: [entry, ...state.alerts].slice(0, MAX_ALERTS),
        }));
        return id;
      },

      recordClose: (alertId) => {
        const now = Date.now();
        set((state) => {
          const alerts = [...state.alerts];
          if (alertId !== undefined) {
            for (let i = 0; i < alerts.length; i++) {
              const a = alerts[i]!;
              if (
                a.alertId === alertId &&
                (a.status === "emise" || a.status === "en_cours")
              ) {
                alerts[i] = { ...a, status: "cloturee", closedAt: now };
              }
            }
            return { alerts };
          }
          // #fin without id → close latest open alert
          const openIdx = alerts.findIndex(
            (a) => a.status === "emise" || a.status === "en_cours",
          );
          if (openIdx >= 0) {
            const a = alerts[openIdx]!;
            alerts[openIdx] = { ...a, status: "cloturee", closedAt: now };
          }
          return { alerts };
        });
      },

      recordAck: (input) => {
        const { parsed } = input;
        const managedAlertId = correlateAck(parsed, get().alerts);
        const entry: AlertAckEntry = {
          id: newId(),
          messageId: input.messageId,
          fromNode: input.fromNode,
          fromName: input.fromName,
          receivedAt: input.receivedAt ?? Date.now(),
          alertId: parsed.alertId,
          managedAlertId,
          timeLabel: parsed.timeLabel,
          snippet: parsed.snippet,
          lat: parsed.lat,
          lon: parsed.lon,
          raw: parsed.raw,
        };

        set((state) => {
          if (
            input.messageId !== undefined &&
            state.acks.some((a) => a.messageId === input.messageId)
          ) {
            return state;
          }

          const alerts = managedAlertId
            ? state.alerts.map((a) =>
                a.id === managedAlertId && a.status === "emise"
                  ? { ...a, status: "en_cours" as const }
                  : a,
              )
            : state.alerts;

          return {
            alerts,
            acks: [entry, ...state.acks].slice(0, MAX_ACKS),
          };
        });
      },

      clearAll: () => set({ alerts: [], acks: [] }),
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        alerts: state.alerts,
        acks: state.acks,
      }),
    },
  ),
);

export { STORAGE_KEY as ALERT_MANAGER_STORAGE_KEY };
