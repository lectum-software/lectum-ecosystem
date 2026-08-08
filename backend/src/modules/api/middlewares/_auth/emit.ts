//Socket

//Types
import type { user } from "@/interfaces/objects";
//Utils
import { clients } from "@/main/socket/clients";
import { destroyAsync, emitError } from "@/main/socket/db/actions";
import { soc } from "@/main/socket/state";
import { toSafeErrorLog } from "@/utils/safe-error-log";
import { sanitizeSensitiveData } from "@/utils/sanitize-sensitive";

export const emit_hidrate = async (data: user, device_id?: string) => {
  //

  const { clientToEmit, out, enter } = clients([data.id!]);

  if (out.length) {
    try {
      await emitError(out, "HIDRATE");
    } catch (err) {
      console.warn(
        "[SOCKET] Registro ass\u00edncrono de hidrata\u00e7\u00e3o falhou",
        toSafeErrorLog(err, "SocketHydrationRegisterError"),
      );
    }
  }

  if (!clientToEmit.length) return;

  destroyAsync(enter, "HIDRATE").catch((err: unknown) => {
    console.warn(
      "[SOCKET] Limpeza ass\u00edncrona de hidrata\u00e7\u00e3o falhou",
      toSafeErrorLog(err, "SocketHydrationCleanupError"),
    );
  });

  const safeData = sanitizeSensitiveData(data, { removeAuthTokens: true });
  soc?.to(clientToEmit).emit("user_hidrate", safeData, device_id);
};
