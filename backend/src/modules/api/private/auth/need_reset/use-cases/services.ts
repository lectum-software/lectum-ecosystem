//Repository

//Types
import type { Resolve } from "@/helpers/return";

//Libs
import { error, msg } from "@/helpers/translate";

//Utils
import { encrypt } from "@/utils/crypt";
import { getDevice } from "../../../../middlewares/_auth/utils/device";
import { LoginRepository } from "../../../../public/auth/login/repositories/LoginRepository";
//DTOs
import type { INeedResetDTO } from "../DTOs/INeedResetDTO";

export default async (data: INeedResetDTO): Promise<Resolve> => {
  const device = getDevice(data);
  if (device?.err)
    return {
      status: 403,
      ...error(device.err, {
        //If you need a custom text
      }),
    };

  const _LOGIN = new LoginRepository(device.id);

  const find = await _LOGIN.findByEmail({ b: { email: data.auth.email! } });
  if (!find)
    return {
      status: 403,
      ...error("auth_incorrect", {
        //If you need a custom text
      }),
      entity: "c",
      type: 1,
    };

  if (!find.active)
    return {
      status: 403,
      ...error("auth_inactive", {
        //If you need a custom text
      }),
      entity: "c",
      type: 4,
    };
  if (!find.need_reset)
    return {
      status: 400,
      ...error("not_need_reset", {
        //If you need a custom text
      }),
      entity: "d",
    };

  const password = await encrypt(data.b.password);

  await _LOGIN.updateAndClearTokens({
    p: { id: find.id! },
    b: {
      password,
      password_confirm: null,
      need_reset: false,
    },
    auth: data.auth,
  });
  const res = await _LOGIN.hidrate(find, device.id);

  return {
    allowAuthTokens: true,
    status: 200,
    ...msg("auth_reset_success", {
      //If you need a custom text
    }),
    data: res,
  };
};
