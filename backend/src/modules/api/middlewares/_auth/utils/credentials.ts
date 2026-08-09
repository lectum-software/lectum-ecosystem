//Repo

import { error } from "@/helpers/translate";
//Types
import type { user } from "@/interfaces/objects";
//Libs
import { comparePasswordOrDummy } from "@/utils/crypt";
import { LoginRepository } from "../../../public/auth/login/repositories/LoginRepository";

export async function credentials<T = user>(email: string, password: string, device_id?: string) {
  const repo = new LoginRepository(device_id);
  const find = await repo.findByEmail({ b: { email } });

  const match = await comparePasswordOrDummy(password, find?.password);
  if (!match)
    return {
      status: 401,
      ...error("auth_incorrect", {
        //If you need a custom text
      }),
      type: 1,
    };

  return { success: true, user: find as T };
}
