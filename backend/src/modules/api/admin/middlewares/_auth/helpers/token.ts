import type { Resolve } from "@/helpers/return";
import { error } from "@/helpers/translate";
import type { admin } from "@/interfaces/objects";
import { AdminLoginRepository } from "@/modules/api/admin/public/auth/login/repositories/AdminLoginRepository";

export const passAdminToken = async (login: admin, deviceId: string, token: string) => {
  const repo = new AdminLoginRepository(deviceId);
  let err: Resolve | null = null;

  if (!login.id) {
    return {
      err: {
        status: 401,
        ...error("token_not_authorized", {}),
      },
      login,
    };
  }

  const auth = await repo.tokenByDevice({
    admin_id: login.id,
    device_id: deviceId,
    token,
  });

  if (!auth) {
    err = {
      status: 401,
      ...error("token_device_not_authorized", {}),
      entity: "c",
    };
  }

  return { err, login };
};
