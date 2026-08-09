import type { NextFunction, Request, Response } from "express";

//Returns
import { send } from "@/helpers/return";
import { error } from "@/helpers/translate";
//Types
import type { user } from "@/interfaces/objects";
import {
  getAdminViewAsPayloadFromRequest,
  resolveUserRequestDeviceId,
  shouldBlockAdminViewAsWrite,
} from "@/utils/admin-view-as";
import { toSafeErrorLog } from "@/utils/safe-error-log";
import { getUserRequestToken } from "@/utils/user-auth-cookie";
import { passLogin } from "./helpers/login";
import { passToken } from "./helpers/token";
//Libs
import passport from "./passport";
//Helpers
import { getDevice } from "./utils/device";

type Not_Authorized = {
  message?: string;
  status?: number;
};

const isAuthUnavailable = (authError?: Not_Authorized) =>
  authError?.status === 503 || authError?.message === "auth_unavailable";

const privateRouteVerifier = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req?.headers?.authorization;
  const requestToken = getUserRequestToken(req);
  if (!requestToken)
    return send(res, {
      status: 401,
      ...error("token_not_provided", {
        //If you need a custom text
      }),
    });

  if (authHeader && !authHeader.startsWith("Bearer "))
    return send(res, {
      status: 401,
      ...error("token_mal_formatted", {
        //If you need a custom text
      }),
    });

  const adminViewAsPayload = getAdminViewAsPayloadFromRequest(req);
  if (shouldBlockAdminViewAsWrite(req, adminViewAsPayload)) {
    return send(res, {
      status: 403,
      ...error("admin_view_as_read_only", {}),
    });
  }

  const device = getDevice(req);
  if (device.err) {
    return send(res, {
      status: 403,
      ...error(device.err, {}),
    });
  }
  const authenticationDeviceId = resolveUserRequestDeviceId(req, device.id, adminViewAsPayload);

  try {
    passport.authenticate("jwt-user-api", async (authError: Not_Authorized, login: user) => {
      try {
        if (isAuthUnavailable(authError)) {
          return send(res, {
            status: 503,
            ...error("auth_unavailable", {}),
          });
        }

        if (login) {
          //Token
          const token = await passToken(login, authenticationDeviceId, requestToken);
          if (token.err) return send(res, token.err);

          //Login
          const logged = await passLogin(login);
          if (logged.err) return send(res, logged.err);

          req.device = authenticationDeviceId;

          req.auth = login;
          return next();
        }

        return send(res, {
          status: 401,
          ...error("token_not_authorized", {
            //If you need a custom text
          }),
        });
      } catch (err) {
        console.error(
          "[USER AUTH] Falha ao hidratar sessão de usuário.",
          toSafeErrorLog(err, "UnknownUserSessionError"),
        );
        return send(res, {
          status: 503,
          ...error("auth_unavailable", {}),
        });
      }
    })(req, res, next);
  } catch (_err) {
    return send(res, {
      status: 401,
      ...error("token_invalid", {
        //If you need a custom text
      }),
    });
  }
};

export default privateRouteVerifier;
