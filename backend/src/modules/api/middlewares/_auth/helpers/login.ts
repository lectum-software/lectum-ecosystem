//Libs
import type { Resolve } from "@/helpers/return";
import { error } from "@/helpers/translate";

//Objects
import type { user } from "@/interfaces/objects";

export const passLogin = async (login: user) => {
  let err: Resolve | null = null;

  if (login.deleted && !err)
    err = {
      status: 404,
      ...error("not_found", {
        //If you need a custom text
      }),
      entity: "c",
      type: 1,
    };

  if (!login.active && !err)
    err = {
      status: 403,
      ...error("inactive", {
        //If you need a custom text
      }),
      entity: "c",
      type: 1,
    };

  return { err, login };
};
