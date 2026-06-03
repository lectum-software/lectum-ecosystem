//Socket

//Types
import type { user } from "@/interfaces/objects";
import { soc } from "@/main/socket";
//Utils
import { clients } from "@/main/socket/clients";

//
import { destroyAsync, emitError } from "@/main/socket/db/async";

export const emit_hidrate = async (data: user, device_id?: string) => {
  //

  const { clientToEmit, out, enter } = clients([data.id!]);

  if (out.length) await emitError(out, "HIDRATE");

  if (!clientToEmit.length) return;

  destroyAsync(enter, "HIDRATE");

  soc?.to(clientToEmit).emit("user_hidrate", data, device_id);
};
