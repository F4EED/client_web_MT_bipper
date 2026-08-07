import { sendAdminMessage } from "../infrastructure/AdminMessageSender.ts";
import type { MeshClient } from "../../../core/client/MeshClient.ts";
import { ChannelNumber } from "../../../core/types.ts";

/** Push host wall-clock to the radio RTC (`AdminMessage.set_time_only`). */
export async function setTimeOnly(
  client: MeshClient,
  epochSeconds = Math.floor(Date.now() / 1000),
): Promise<number> {
  return sendAdminMessage(
    client,
    { case: "setTimeOnly", value: epochSeconds >>> 0 },
    "self",
    ChannelNumber.Primary,
    true,
    false,
  );
}
