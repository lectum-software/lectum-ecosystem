import type { Resolve } from "@/helpers/return";
import { error, msg } from "@/helpers/translate";
import type { admin_token } from "@/interfaces/objects";
import { getAdminRequestToken } from "@/modules/api/admin/shared/auth/cookie";
import { getDevice } from "@/modules/api/middlewares/_auth/utils/device";
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

  const token = getAdminRequestToken(data);
  const currentToken = admin.admin_tokens?.find((item: admin_token) => item.token === token);

  if (!token || !currentToken) {
    return {
      status: 401,
      ...error("token_not_authorized", {}),
    };
  }

  return {
    allowAuthTokens: true,
    status: 200,
    ...msg("admin_auth_success", {}),
    data: {
      ...admin,
      admin_tokens: [currentToken],
    },
  };
};
