//Repo

//Events
import { emit_hidrate } from "@/modules/api/middlewares/_auth/emit";
import { LoginRepository } from "@/modules/api/public/auth/login/repositories/LoginRepository";
import { Repository } from "./Repository";

export type ErrorType = "HIDRATE";

export const emitError = async (
  entity: { id: string; device_id?: string }[],
  type: ErrorType,
  data?: any,
) => {
  const _BACKGROUND = new Repository();

  await _BACKGROUND.create({
    entity,
    type,
    data: data ? JSON.stringify(data) : undefined,
  });
};

export const emitAsync = async (id: string, device_id?: string) => {
  const _BACKGROUND = new Repository();
  const _AUTH = new LoginRepository();

  const list = await _BACKGROUND.list({ id });

  const update = list?.find((action) => action.type === "HIDRATE");

  if (update && device_id) {
    const data = await _AUTH.hidrate({ id }, device_id);
    emit_hidrate(data, device_id);
  }
};

export const destroyAsync = async (ids: string[], type: ErrorType) => {
  const _BACKGROUND = new Repository();
  await _BACKGROUND.delete({ ids, type });
};
