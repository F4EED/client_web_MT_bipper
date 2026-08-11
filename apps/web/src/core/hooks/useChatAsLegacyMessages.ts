import {
  type Message as LegacyMessage,
  MessageState as LegacyMessageState,
  MessageType,
} from "@core/stores/messageStore";
import type { Message as SdkMessage } from "@meshtastic/sdk";
import { MessageState as SdkMessageState, type Types } from "@meshtastic/sdk";
import { useChat, useDirectChat } from "@meshtastic/sdk-react";
import { useMemo } from "react";

/**
 * Adapter that surfaces SDK-managed chat history in the shape expected by
 * the pre-SDK message components (`Message` from `messageStore`). Lets
 * MessagesPage / ChannelChat / MessageItem keep their current props while
 * reading from the OPFS-backed SQLite repository through the SDK chat
 * slice. Removed once those components consume `Message` from the SDK
 * directly.
 */
export interface UseChatAsLegacyMessagesBroadcast {
  type: MessageType.Broadcast;
  channelId: Types.ChannelNumber;
}

export interface UseChatAsLegacyMessagesDirect {
  type: MessageType.Direct;
  peer: number;
}

export type UseChatAsLegacyMessagesParams =
  | UseChatAsLegacyMessagesBroadcast
  | UseChatAsLegacyMessagesDirect;

/**
 * Subscribe to exactly one conversation. Callers must not invoke this hook
 * twice with different discriminants on the same render — that previously
 * forced a permanent `useChat(0)` subscription whenever a DM tab was open,
 * hydrating Primary into memory as a side effect of every Messages visit.
 */
export function useChatAsLegacyMessages(
  params: UseChatAsLegacyMessagesParams,
): LegacyMessage[] {
  const isBroadcast = params.type === MessageType.Broadcast;
  const broadcast = useChat(
    isBroadcast ? params.channelId : (0 as Types.ChannelNumber),
  );
  const direct = useDirectChat(isBroadcast ? 0 : params.peer);
  const sdkMessages = isBroadcast ? broadcast.messages : direct.messages;
  const channelId = isBroadcast ? params.channelId : 0;
  const peer = isBroadcast ? 0 : params.peer;

  return useMemo(() => {
    // Defense in depth: never show a broadcast bubble under the wrong tab
    // even if a stale/dup row leaked into the bucket (pre-v3 OPFS).
    const filtered = isBroadcast
      ? sdkMessages.filter((m) => m.channel === channelId)
      : sdkMessages;
    return filtered.map((m) => toLegacy(m, params.type));
  }, [sdkMessages, params.type, channelId, peer, isBroadcast]);
}

function toLegacy(message: SdkMessage, type: MessageType): LegacyMessage {
  return {
    type,
    channel: message.channel,
    to: message.to,
    from: message.from,
    date: message.rxTime.getTime(),
    messageId: message.id,
    state: mapState(message.state),
    message: message.text,
  } as LegacyMessage;
}

function mapState(state: SdkMessageState): LegacyMessageState {
  switch (state) {
    case SdkMessageState.Ack:
      return LegacyMessageState.Ack;
    case SdkMessageState.Failed:
      return LegacyMessageState.Failed;
    case SdkMessageState.Pending:
    default:
      return LegacyMessageState.Waiting;
  }
}
