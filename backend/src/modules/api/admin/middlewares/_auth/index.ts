import type { NextFunction, Request, Response } from "express";
import { send } from "@/helpers/return";
import { error } from "@/helpers/translate";
import type { admin } from "@/interfaces/objects";
import { getDevice } from "@/modules/api/middlewares/_auth/utils/device";
import { passAdminLogin } from "./helpers/login";
import { passAdminToken } from "./helpers/token";
import passport from "./passport";

type NotAuthorized = {
  message?: string;
  status?: number;
};

const adminPrivateRouteVerifier = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return send(res, {
      status: 401,
      ...error("token_not_provided", {}),
    });
  }

  if (!authHeader.startsWith("Bearer ")) {
    return send(res, {
      status: 401,
      ...error("token_mal_formatted", {}),
    });
  }

  const device = getDevice(req);
  if (device.err) {
    return send(res, {
      status: 403,
      ...error(device.err, {}),
    });
  }

  try {
    passport.authenticate("jwt-admin-api", async (authError: NotAuthorized, login: admin) => {
      if (authError?.message === "ADMIN_JWT_SECRET_NOT_CONFIGURED") {
        return send(res, {
          status: 500,
          ...error("admin_auth_config_error", {}),
        });
      }

      if (authError?.message === "ADMIN_JWT_SECRET_MUST_BE_DIFFERENT") {
        return send(res, {
          status: 500,
          ...error("admin_auth_config_error", {}),
        });
      }

      if (!login) {
        return send(res, {
          status: 401,
          ...error("token_not_authorized", {}),
        });
      }

      const bearerToken = authHeader.split(" ")[1];
      const token = await passAdminToken(login, device.id, bearerToken);
      if (token.err) return send(res, token.err);

      const logged = await passAdminLogin(login);
      if (logged.err) return send(res, logged.err);

      req.device = device.id;
      req.auth = login;
      req.admin = login;

      return next();
    })(req, res, next);
  } catch (_err) {
    return send(res, {
      status: 401,
      ...error("token_invalid", {}),
    });
  }
};

export default adminPrivateRouteVerifier;
