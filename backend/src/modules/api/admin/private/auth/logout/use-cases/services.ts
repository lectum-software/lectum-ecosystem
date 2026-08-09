import type { Resolve } from "@/helpers/return";
import { error, msg } from "@/helpers/translate";
import { getAdminRequestToken } from "@/modules/api/admin/shared/auth/cookie";
import { getDevice } from "@/modules/api/middlewares/_auth/utils/device";
import { AdminLoginRepository } from "../../../../public/auth/login/repositories/AdminLoginRepository";
import type { IAdminLogoutDTO } from "../DTOs/IAdminLogoutDTO";

export default async (data: IAdminLogoutDTO): Promise<Resolve> => {
  const device = getDevice(data);
  if (device.err) {
    return {
      status: 403,
      ...error(device.err, {}),
    };
  }

  const admin = data.auth;
  const token = getAdminRequestToken(data);

  if (!admin?.id || !token) {
    return {
      status: 401,
      ...error("token_not_authorized", {}),
    };
  }

  const repo = new AdminLoginRepository(device.id);
  await repo.deleteToken({
    admin_id: admin.id,
    device_id: device.id,
    token,
  });

  return {
    status: 200,
    ...msg("admin_logout_success", {}),
  };
};
