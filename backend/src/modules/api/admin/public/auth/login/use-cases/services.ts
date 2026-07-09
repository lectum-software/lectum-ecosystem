import type { Resolve } from "@/helpers/return";
import { error, msg } from "@/helpers/translate";
import type { admin } from "@/interfaces/objects";
import { assertAdminJwtConfigured } from "@/modules/api/admin/shared/auth/jwt";
import { getDevice } from "@/modules/api/middlewares/_auth/utils/device";
import { compare } from "@/utils/crypt";
import type { IAdminLoginDTO } from "../DTOs/IAdminLoginDTO";
import { AdminLoginRepository } from "../repositories/AdminLoginRepository";

const credentials = async (email: string, password: string, deviceId: string) => {
  const repo = new AdminLoginRepository(deviceId);
  const find = await repo.findByEmail(email);

  if (!find) {
    return {
      status: 404,
      ...error("admin_account_not_registered", {}),
      type: 1,
    };
  }

  const match = find.password && (await compare(password, find.password));
  if (!match) {
    return {
      status: 403,
      ...error("auth_incorrect", {}),
      type: 2,
    };
  }

  return { success: true, admin: find as admin };
};

export default async (data: IAdminLoginDTO): Promise<Resolve> => {
  try {
    assertAdminJwtConfigured();
  } catch (_err) {
    return {
      status: 500,
      ...error("admin_auth_config_error", {}),
    };
  }

  const device = getDevice(data);
  if (device.err) {
    return {
      status: 403,
      ...error(device.err, {}),
    };
  }

  const auth = await credentials(data.b.email, data.b.password, device.id);
  if (!("admin" in auth) || !auth.admin) return auth;

  const admin = auth.admin;
  if (!admin.active) {
    return {
      status: 403,
      ...error("admin_auth_inactive", {}),
      entity: "c",
      type: 4,
    };
  }

  if (!admin.confirmed) {
    return {
      status: 403,
      ...error("admin_auth_unconfirmed", {}),
      entity: "c",
      type: 5,
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
