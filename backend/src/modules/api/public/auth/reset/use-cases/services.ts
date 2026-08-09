//Repository

//Libs
import { differenceInMinutes } from "date-fns";
//Types
import type { Resolve } from "@/helpers/return";
import { error, msg } from "@/helpers/translate";
//Utils
import { encrypt } from "@/utils/crypt";
import { getCodeValidityMinutes } from "@/utils/runtime-config";
import { getDevice } from "../../../../middlewares/_auth/utils/device";
import { LoginRepository } from "../../login/repositories/LoginRepository";

//DTOs
import type { IResetDTO } from "../DTOs/IResetDTO";
import { ResetRepository } from "../repositories/ResetRepository";

const _VALID = getCodeValidityMinutes();

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

  const find = await _RECOVERY.findByRecovery(data);
  if (!find)
    return {
      status: 404,
      ...error("code_incorrect", {
        //If you need a custom text
      }),
      entity: "c",
    };

  //Verify if time is valid
  const diff = find?.recovery_date ? differenceInMinutes(new Date(), find.recovery_date) : null;
  if (diff === null || diff > _VALID)
    return {
      status: 400,
      ...error("code_expired", {
        //If you need a custom text
      }),
      entity: "c",
    };

  const password = await encrypt(data.b.password);

  await _LOGIN.updateAndClearTokens({
    p: { id: find.id! },
    b: {
      password,
      password_confirm: null,
      confirmed: true,
      confirmed_date: new Date(),
      recovery_code: null,
      recovery_date: null,
      need_reset: false,
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
