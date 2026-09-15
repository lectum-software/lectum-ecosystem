//Repo

//Libs
import type { Resolve } from "@/helpers/return";
import { error } from "@/helpers/translate";
//Objects
import type { user } from "@/interfaces/objects";
import { LoginRepository } from "@/modules/api/public/auth/login/repositories/LoginRepository";

export const passToken = async (login: user, device_id: string, token: string) => {
  const _AUTH = new LoginRepository(device_id);

  let err: Resolve | null = null;

  if (!login.id)
    return {
      err: {
        status: 401,
        ...error("token_not_authorized", {}),
      },
      login,
    };

  const auth = await _AUTH.tokenByDevice({ device_id, token, user_id: login.id });

  if (!auth)
    err = {
      status: 401,
      ...error("token_device_not_authorized", {
        //If you need a custom text
      }),
      entity: "c",
    };

  return { err, login };
};
