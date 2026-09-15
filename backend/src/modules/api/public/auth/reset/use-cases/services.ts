//Types
import type { Resolve } from "@/helpers/return";
import { error, msg } from "@/helpers/translate";
//Utils
import { isCodeWithinValidity } from "@/utils/code";
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
  if (!find.recovery_date || !isCodeWithinValidity(find.recovery_date, _VALID))
    return {
      status: 400,
      ...error("code_expired", {
        //If you need a custom text
      }),
      entity: "c",
    };

  const password = await encrypt(data.b.password);
  // O hash pode ser custoso: revalidar o prazo também depois de calculá-lo.
  const verifiedAt = new Date();
  if (!isCodeWithinValidity(find.recovery_date, _VALID, verifiedAt.getTime()))
    return { status: 400, ...error("code_expired", {}), entity: "c" };

  const consumed = await _RECOVERY.consume({
    userId: find.id!,
    code: data.p.code,
    issuedAt: find.recovery_date,
    verifiedAt,
    validityMinutes: _VALID,
    passwordHash: password,
  });
  if (!consumed) return { status: 404, ...error("code_incorrect", {}), entity: "c" };

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
