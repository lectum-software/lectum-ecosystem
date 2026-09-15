//Repository

//Types
import type { Resolve } from "@/helpers/return";

//Libs
import { error, msg } from "@/helpers/translate";
import { getUserRequestToken } from "@/utils/user-auth-cookie";
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

  const requestToken = getUserRequestToken(data);
  const newestDeviceToken = user.user_tokens?.[0];
  const responseToken = newestDeviceToken?.token || requestToken;

  if (!responseToken) {
    return {
      status: 401,
      ...error("token_not_authorized", {}),
    };
  }

  return {
    allowAuthTokens: true,
    status: 200,
    ...msg("auth_success", {
      //If you need a custom text
    }),
    data: {
      ...user,
      user_tokens: [
        {
          ...newestDeviceToken,
          token: responseToken,
        },
      ],
    },
  };
};
