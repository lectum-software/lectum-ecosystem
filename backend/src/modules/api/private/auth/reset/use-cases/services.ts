//Repository

//Types
import type { Resolve } from "@/helpers/return";
//Libs
import { error, msg } from "@/helpers/translate";

//Interfaces
import type { user } from "@/interfaces/objects";
import { credentials } from "@/modules/api/middlewares/_auth/utils/credentials";

//Utils
import { encrypt } from "@/utils/crypt";
import { getDevice } from "../../../../middlewares/_auth/utils/device";
import { LoginRepository } from "../../../../public/auth/login/repositories/LoginRepository";

//DTOs
import type { IResetDTO } from "../DTOs/IResetDTO";
import { ResetRepository } from "../repositories/ResetRepository";

export default async (data: IResetDTO): Promise<Resolve> => {
  const device = getDevice(data);
  if (device?.err)
    return {
      status: 403,
      ...error(device.err, {
        //If you need a custom text
      }),
    };

  const _LOGIN = new LoginRepository(device.id);
  const _RECOVERY = new ResetRepository(device.id);

  const find = await _RECOVERY.findById(data);
  if (!find)
    return {
      status: 404,
      ...error("not_found", {
        //If you need a custom text
      }),
      entity: "c",
    };

  const auth = await credentials<user>(data.auth.email!, data.b.current_password, device.id);

  if (!auth.user) return auth;

  const password = await encrypt(data.b.password);

  await _LOGIN.updateAndClearTokens({
    p: { id: find.id! },
    b: {
      password,
      password_confirm: null,
      need_reset: false,
      confirmed: true,
    },
    auth: data.auth,
  });

  const res = await _LOGIN.hidrate(find, device.id);

  return {
    allowAuthTokens: true,
    status: 200,
    ...msg("password_update_success", {
      //If you need a custom text
    }),
    data: res,
  };
};
