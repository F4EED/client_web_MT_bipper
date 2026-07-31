import { parsePagerAck } from "@app/lib/bipper/parsePagerAck.ts";
import { useAlertManagerStore } from "@core/stores/alertManagerStore/index.ts";
import {
  useMyNodeNumSafe,
  useNodesAsProto,
} from "@core/hooks/useNodesAsProto.ts";
import { useActiveClient } from "@meshtastic/sdk-react";
import { useEffect, useRef } from "react";

/** Subscribe to inbound mesh text and record Gaulix Pager ACK receipts. */
export function usePagerAckIngest() {
  const client = useActiveClient();
  const myNodeNum = useMyNodeNumSafe();
  const nodes = useNodesAsProto();
  const recordAck = useAlertManagerStore((s) => s.recordAck);
  const nodesRef = useRef(nodes);
  nodesRef.current = nodes;

  useEffect(() => {
    if (!client || myNodeNum === undefined) {
      return;
    }

    const handler = (packet: {
      id: number;
      from: number;
      to: number;
      data: string;
      rxTime: Date;
      type: string;
    }) => {
      if (packet.from === myNodeNum) {
        return;
      }
      if (typeof packet.data !== "string") {
        return;
      }
      const parsed = parsePagerAck(packet.data);
      if (!parsed) {
        return;
      }
      const node = nodesRef.current.find((n) => n.num === packet.from);
      const fromName =
        node?.user?.longName || node?.user?.shortName || undefined;
      recordAck({
        messageId: packet.id,
        fromNode: packet.from,
        fromName,
        receivedAt: packet.rxTime?.getTime?.() ?? Date.now(),
        parsed,
      });
    };

    client.events.onMessagePacket.subscribe(handler);
    return () => {
      client.events.onMessagePacket.unsubscribe(handler);
    };
  }, [client, myNodeNum, recordAck]);
}
