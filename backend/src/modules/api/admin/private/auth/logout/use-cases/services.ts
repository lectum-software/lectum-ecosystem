import type { Resolve } from "@/helpers/return";
import { error, msg } from "@/helpers/translate";
import { getDevice } from "@/modules/api/middlewares/_auth/utils/device";
import { AdminLoginRepository } from "../../../../public/auth/login/repositories/AdminLoginRepository";
import type { IAdminLogoutDTO } from "../DTOs/IAdminLogoutDTO";

const getBearerToken = (authorization?: string) => {
  if (!authorization?.startsWith("Bearer ")) return "";
  return authorization.split(" ")[1] || "";
};

export default async (data: IAdminLogoutDTO): Promise<Resolve> => {
  const device = getDevice(data);
  if (device.err) {
    return {
      status: 403,
      ...error(device.err, {}),
    };
  }

  const admin = data.auth;
  const token = getBearerToken(data.headers.authorization);

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
