import type { NextFunction, Request, Response } from "express";
import { send } from "@/helpers/return";
import { error } from "@/helpers/translate";
import type { admin } from "@/interfaces/objects";
import { getAdminRequestToken } from "@/modules/api/admin/shared/auth/cookie";
import { getDevice } from "@/modules/api/middlewares/_auth/utils/device";
import { toSafeErrorLog } from "@/utils/safe-error-log";
import { passAdminLogin } from "./helpers/login";
import { passAdminToken } from "./helpers/token";
import passport from "./passport";

type NotAuthorized = {
  message?: string;
  status?: number;
};

const isAuthUnavailable = (authError?: NotAuthorized) =>
  authError?.status === 503 || authError?.message === "admin_auth_unavailable";

const adminPrivateRouteVerifier = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  const requestToken = getAdminRequestToken(req);
  if (!requestToken) {
    return send(res, {
      status: 401,
      ...error("token_not_provided", {}),
    });
  }

  if (authHeader && !authHeader.startsWith("Bearer ")) {
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
      try {
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

        if (isAuthUnavailable(authError)) {
          return send(res, {
            status: 503,
            ...error("admin_auth_unavailable", {}),
          });
        }

        if (!login) {
          return send(res, {
            status: 401,
            ...error("token_not_authorized", {}),
          });
        }

        const token = await passAdminToken(login, device.id, requestToken);
        if (token.err) return send(res, token.err);

        const logged = await passAdminLogin(login);
        if (logged.err) return send(res, logged.err);

        req.device = device.id;
        req.auth = login;
        req.admin = login;

        return next();
      } catch (err) {
        console.error(
          "[ADMIN AUTH] Falha ao hidratar sessão administrativa.",
          toSafeErrorLog(err, "UnknownAdminSessionError"),
        );
        return send(res, {
          status: 503,
          ...error("admin_auth_unavailable", {}),
        });
      }
    })(req, res, next);
  } catch (_err) {
    return send(res, {
      status: 401,
      ...error("token_invalid", {}),
    });
  }
};

export default adminPrivateRouteVerifier;
