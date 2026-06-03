//Repository

//Types
import type { Resolve } from "@/helpers/return";

//Libs
import { error, msg } from "@/helpers/translate";

//Interfaces
import type { user } from "@/interfaces/objects";
import { credentials } from "@/modules/api/middlewares/_auth/utils/credentials";
//Utils
import { getDevice } from "../../../../middlewares/_auth/utils/device";

//DTOs
import type { ILoginDTO } from "../DTOs/ILoginDTO";
import { LoginRepository } from "../repositories/LoginRepository";

export default async (data: ILoginDTO): Promise<Resolve> => {
  const device = getDevice(data);
  if (device?.err)
    return {
      status: 403,
      ...error(device.err, {
        //If you need a custom text
      }),
    };

  const _LOGIN = new LoginRepository(device.id);

  const auth = await credentials<user>(data.b.email, data.b.password, device.id);

  if (!auth.user) return auth;
  const user = auth.user;

  if (!user.active)
    return {
      status: 400,
      ...error("auth_inactive", {
        //If you need a custom text
      }),
      entity: "c",
      type: 4,
    };

  const res = await _LOGIN.hidrate(user, device.id);
  return {
    status: 200,
    ...msg("auth_success", {
      //If you need a custom text
    }),
    data: res,
  };
};
