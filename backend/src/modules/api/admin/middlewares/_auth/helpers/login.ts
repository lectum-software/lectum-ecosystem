import type { Resolve } from "@/helpers/return";
import { error } from "@/helpers/translate";
import type { admin } from "@/interfaces/objects";

export const passAdminLogin = async (login: admin) => {
  let err: Resolve | null = null;

  if (login.deleted && !err) {
    err = {
      status: 404,
      ...error("not_found", {}),
      entity: "c",
      type: 1,
    };
  }

  if (!login.active && !err) {
    err = {
      status: 403,
      ...error("admin_auth_inactive", {}),
      entity: "c",
      type: 1,
    };
  }

  if (!login.confirmed && !err) {
    err = {
      status: 403,
      ...error("admin_auth_unconfirmed", {}),
      entity: "c",
      type: 1,
    };
  }

  return { err, login };
};
