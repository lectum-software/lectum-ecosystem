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

  if (out.length) {
    try {
      await emitError(out, "HIDRATE");
    } catch (err) {
      const message = err instanceof Error ? err.message : "erro desconhecido";
      console.warn("[SOCKET] Registro ass\u00edncrono de hidrata\u00e7\u00e3o falhou", message);
    }
  }

  if (!clientToEmit.length) return;

  destroyAsync(enter, "HIDRATE").catch((err: unknown) => {
    const message = err instanceof Error ? err.message : "erro desconhecido";
    console.warn("[SOCKET] Limpeza ass\u00edncrona de hidrata\u00e7\u00e3o falhou", message);
  });

  soc?.to(clientToEmit).emit("user_hidrate", data, device_id);
};
