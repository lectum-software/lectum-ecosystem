import { emit_hidrate } from "@/modules/api/middlewares/_auth/emit";
import { LoginRepository } from "@/modules/api/public/auth/login/repositories/LoginRepository";
import { toSafeErrorLog } from "@/utils/safe-error-log";
import { Repository } from "./Repository";

export { destroyAsync, type ErrorType, emitError } from "./actions";

export const emitAsync = async (id: string, device_id?: string) => {
  try {
    const _BACKGROUND = new Repository();
    const _AUTH = new LoginRepository();

    const list = await _BACKGROUND.list({ id });

    const update = list?.find((action) => action.type === "HIDRATE");

    if (update && device_id) {
      const [user] = (await _AUTH.findToEmit({ b: { ids: [id] } })) ?? [];
      if (!user) return;

      await emit_hidrate(user, device_id);
    }
  } catch (err) {
    console.warn(
      "[SOCKET] Sincroniza\u00e7\u00e3o ass\u00edncrona de hidrata\u00e7\u00e3o falhou",
      toSafeErrorLog(err, "SocketHydrationSyncError"),
    );
  }
};
