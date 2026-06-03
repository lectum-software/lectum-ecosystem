//Repo

import { error } from "@/helpers/translate";
//Types
import type { user } from "@/interfaces/objects";
//Libs
import { compare } from "@/utils/crypt";
import { LoginRepository } from "../../../public/auth/login/repositories/LoginRepository";

export async function credentials<T = user>(email: string, password: string, device_id?: string) {
  const repo = new LoginRepository(device_id);
  const find = await repo.findByEmail({ b: { email } });

  if (!find)
    return {
      status: 403,
      ...error("auth_incorrect", {
        //If you need a custom text
      }),
      type: 1,
    };

  const match = find.password && (await compare(password, find?.password));
  if (!match)
    return {
      status: 403,
      ...error("auth_incorrect", {
        //If you need a custom text
      }),
      type: 2,
    };

  return { success: true, user: find as T };
}
