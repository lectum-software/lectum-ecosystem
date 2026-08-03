//Repository

//Types
import type { Resolve } from "@/helpers/return";

//Libs
import { error, msg } from "@/helpers/translate";
import { LoginRepository } from "@/modules/api/public/auth/login/repositories/LoginRepository";
import { getAdminViewAsPayloadFromRequest } from "@/utils/admin-view-as";
//Utils
import { getDevice } from "../../../../middlewares/_auth/utils/device";
//DTOs
import type { IHidrateDTO } from "../DTOs/IHidrateDTO";

export default async (data: IHidrateDTO): Promise<Resolve> => {
  const device = getDevice(data);
  if (device?.err)
    return {
      status: 403,
      ...error(device.err, {
        //If you need a custom text
      }),
    };

  const _LOGIN = new LoginRepository(device.id);

  const user = data?.auth;

  if (!user?.active)
    return {
      status: 400,
      ...error("auth_inactive", {
        //If you need a custom text
      }),
      entity: "c",
      type: 4,
    };

  if (getAdminViewAsPayloadFromRequest(data)) {
    return {
      status: 200,
      ...msg("auth_success", {}),
      data: user,
    };
  }

  const res = await _LOGIN.hidrate(user, device.id);
  return {
    status: 200,
    ...msg("auth_success", {
      //If you need a custom text
    }),
    data: res,
  };
};
