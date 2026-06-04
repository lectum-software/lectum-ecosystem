//Repository

//Libs
import { error, msg } from "@/helpers/translate";
//
import { LoginRepository } from "@/modules/api/public/auth/login/repositories/LoginRepository";
//Utils
import { encrypt } from "@/utils/crypt";
//
import { getDevice } from "../../../../middlewares/_auth/utils/device";
//Types
import type { IStoreDTO } from "../DTOs/IStoreDTO";
import { StoreRepository } from "../repositories/StoreRepository";

export default async (data: IStoreDTO) => {
  //
  const device = getDevice(data);
  if (device?.err)
    return {
      status: 403,
      ...error(device.err, {
        //If you need a custom text
      }),
    };

  const _USER = new StoreRepository();
  const role = data.b.role || "paciente";

  if (!data.b.terms_accepted)
    return {
      status: 400,
      ...error("terms_required", {
        //If you need a custom text
      }),
    };

  //Verify if email is unique
  if (data.b.email) {
    const hasEmail = await _USER.has({
      where: { email: data.b.email },
      select: { email: true },
    });
    if (hasEmail)
      return {
        status: 400,
        ...error("unique", {
          //If you need a custom text
          model: "user",
          property: "email",
        }),
        type: 1,
      };
  }

  //Encrypt password
  if (data.b.password) data.b.password = await encrypt(data.b.password);
  //Encrypt password_confirm
  if (data.b.password_confirm) data.b.password_confirm = await encrypt(data.b.password_confirm);

  const res = await _USER.store({
    ...data,
    b: {
      ...data.b,
      role,
    },
    device_id: device.id,
  });

  //
  const _LOGIN = new LoginRepository(device.id);
  const user = await _LOGIN.hidrate(res, device.id);

  return {
    status: 200,
    ...msg("store", {
      //If you need a custom text
    }),
    data: user,
  };
};
