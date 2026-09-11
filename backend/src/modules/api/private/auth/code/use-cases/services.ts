//Repository

//Libs
//Types
import type { Resolve } from "@/helpers/return";
import { error, msg } from "@/helpers/translate";
import { isCodeWithinValidity } from "@/utils/code";
import { getCodeValidityMinutes } from "@/utils/runtime-config";
//Utils
import { getDevice } from "../../../../middlewares/_auth/utils/device";
import { LoginRepository } from "../../../../public/auth/login/repositories/LoginRepository";

//DTOs
import type { IConfirmDTO } from "../DTOs/IConfirmDTO";
import { ConfirmRepository } from "../repositories/ConfirmRepository";

const _VALID = getCodeValidityMinutes();

export default async (data: IConfirmDTO): Promise<Resolve> => {
  const device = getDevice(data);
  if (device?.err)
    return {
      status: 403,
      ...error(device.err, {
        //If you need a custom text
      }),
    };

  const _LOGIN = new LoginRepository(device.id);
  const _CONFIRM = new ConfirmRepository(device.id);

  const find = await _CONFIRM.findByConfirm(data);
  if (!find)
    return {
      status: 400,
      ...error("code_incorrect", {
        //If you need a custom text
      }),
      entity: "c",
    };

  if (find.confirmed)
    return {
      status: 400,
      ...error("code_confirmed", {
        //If you need a custom text
      }),
      entity: "c",
    };

  //Verify if time is valid
  const verifiedAt = new Date();
  if (!find.confirm_date || !isCodeWithinValidity(find.confirm_date, _VALID, verifiedAt.getTime()))
    return {
      status: 403,
      ...error("code_expired", {
        //If you need a custom text
      }),
      entity: "c",
    };

  const consumed = await _CONFIRM.consume({
    userId: find.id!,
    code: data.p.code,
    issuedAt: find.confirm_date,
    verifiedAt,
    validityMinutes: _VALID,
  });
  if (!consumed) return { status: 400, ...error("code_incorrect", {}), entity: "c" };

  const res = await _LOGIN.hidrate(find, device.id);

  return {
    allowAuthTokens: true,
    status: 200,
    ...msg("confirmed_success", {
      //If you need a custom text
    }),
    data: res,
  };
};
