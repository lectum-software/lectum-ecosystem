import type { Resolve } from "@/helpers/return";
import { error, msg } from "@/helpers/translate";
import { getDevice } from "@/modules/api/middlewares/_auth/utils/device";
import { AdminLoginRepository } from "../../../../public/auth/login/repositories/AdminLoginRepository";
import type { IAdminHidrateDTO } from "../DTOs/IAdminHidrateDTO";

export default async (data: IAdminHidrateDTO): Promise<Resolve> => {
  const device = getDevice(data);
  if (device.err) {
    return {
      status: 403,
      ...error(device.err, {}),
    };
  }

  const admin = data.auth;
  if (!admin?.active) {
    return {
      status: 403,
      ...error("admin_auth_inactive", {}),
      entity: "c",
      type: 4,
    };
  }

  const repo = new AdminLoginRepository(device.id);
  const res = await repo.hidrate(admin, device.id);

  return {
    status: 200,
    ...msg("admin_auth_success", {}),
    data: res,
  };
};
