//Repository

//Libs
import { error, msg } from "@/helpers/translate";
//
import { LoginRepository } from "@/modules/api/public/auth/login/repositories/LoginRepository";
//Utils
import { encrypt } from "@/utils/crypt";
import { isPrismaErrorCode } from "@/utils/prisma-transaction";
import {
  buildProfessionalFullDisplayName,
  normalizeProfessionalNamePart,
} from "@/utils/professional-name";
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
  const professionalFirstName = normalizeProfessionalNamePart(data.b.professional_first_name);
  const professionalLastName = normalizeProfessionalNamePart(data.b.professional_last_name);

  if (!data.b.terms_accepted)
    return {
      status: 400,
      ...error("terms_required", {
        //If you need a custom text
      }),
    };

  if (role === "psicologo" && (!professionalFirstName || !professionalLastName)) {
    return {
      status: 400,
      ...error("invalid_structure", {}),
      type: 1,
    };
  }

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

  let res: Awaited<ReturnType<StoreRepository["store"]>>;
  try {
    res = await _USER.store({
      ...data,
      b: {
        ...data.b,
        name:
          role === "psicologo"
            ? buildProfessionalFullDisplayName({
                fallbackName: data.b.name,
                firstName: professionalFirstName,
                lastName: professionalLastName,
              })
            : data.b.name,
        professional_first_name: role === "psicologo" ? professionalFirstName : undefined,
        professional_last_name: role === "psicologo" ? professionalLastName : undefined,
        role,
      },
      device_id: device.id,
    });
  } catch (storeError) {
    if (isPrismaErrorCode(storeError, "P2002")) {
      return {
        status: 400,
        ...error("unique", { model: "user", property: "email" }),
        type: 1,
      };
    }

    throw storeError;
  }

  //
  const _LOGIN = new LoginRepository(device.id);
  const user = await _LOGIN.hidrate(res, device.id);

  return {
    allowAuthTokens: true,
    status: 200,
    ...msg("store", {
      //If you need a custom text
    }),
    data: user,
  };
};
