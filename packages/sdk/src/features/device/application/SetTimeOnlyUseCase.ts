import { create, toBinary } from "@bufbuild/protobuf";
import * as Protobuf from "@meshtastic/protobufs";
import type { MeshClient } from "../../../core/client/MeshClient.ts";
import { ChannelNumber } from "../../../core/types.ts";

/**
 * Push host wall-clock to the radio RTC (`AdminMessage.set_time_only`).
 * Fire-and-forget (no mesh ACK / admin response): local USB/BLE admin is
 * rewritten to `from=0` by firmware and has no routing ACK path that the
 * queue can wait on — waiting 60s made sync look failed in the UI.
 */
export async function setTimeOnly(
  client: MeshClient,
  epochSeconds = Math.floor(Date.now() / 1000),
): Promise<number> {
  const message = create(Protobuf.Admin.AdminMessageSchema, {
    payloadVariant: { case: "setTimeOnly", value: epochSeconds >>> 0 },
  });
  return client.sendPacket(
    toBinary(Protobuf.Admin.AdminMessageSchema, message),
    Protobuf.Portnums.PortNum.ADMIN_APP,
    "self",
    ChannelNumber.Primary,
    false,
    false,
    false,
    undefined,
    undefined,
    undefined,
    Protobuf.Mesh.MeshPacket_Priority.RELIABLE,
  );
}
