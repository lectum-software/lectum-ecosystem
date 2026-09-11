import type { NextFunction, Request, Response } from "express";
import { send } from "@/helpers/return";
import { error } from "@/helpers/translate";
import type { user } from "@/interfaces/objects";
import {
  getAdminViewAsPayloadFromRequest,
  resolveUserRequestDeviceId,
  shouldBlockAdminViewAsWrite,
} from "@/utils/admin-view-as";
import { toSafeErrorLog } from "@/utils/safe-error-log";
import { getUserRequestToken } from "@/utils/user-auth-cookie";
import { passLogin } from "../_auth/helpers/login";
import { passToken } from "../_auth/helpers/token";
import passport from "../_auth/passport";
import { getDevice } from "../_auth/utils/device";

type NotAuthorized = {
  status?: number;
  message?: string;
};

const authUnavailable = (res: Response) =>
  send(res, {
    status: 503,
    ...error("auth_unavailable", {}),
  });

const optionalAuth = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req?.headers?.authorization;
  const requestToken = getUserRequestToken(req);

  if (!requestToken || (authHeader && !authHeader.startsWith("Bearer "))) {
    return next();
  }

  const adminViewAsPayload = getAdminViewAsPayloadFromRequest(req);
  if (shouldBlockAdminViewAsWrite(req, adminViewAsPayload)) {
    return send(res, {
      status: 403,
      ...error("admin_view_as_read_only", {}),
    });
  }

  const device = getDevice(req);
  if (device.err) return next();
  const authenticationDeviceId = resolveUserRequestDeviceId(req, device.id, adminViewAsPayload);

  try {
    passport.authenticate("jwt-user-api", async (authError: NotAuthorized, login: user) => {
      // Passport não aguarda a Promise deste callback. A falha na segunda
      // consulta (sessão/dispositivo) também precisa ser tratada aqui.
      try {
        if (authError?.status === 503 || authError?.message === "auth_unavailable") {
          return authUnavailable(res);
        }
        if (!login) return next();

        const token = await passToken(login, authenticationDeviceId, requestToken);
        if (token.err) return next();

        const logged = await passLogin(login);
        if (logged.err) return next();

        req.device = authenticationDeviceId;
        req.auth = login;

        return next();
      } catch (err) {
        console.error(
          "[OPTIONAL AUTH] Falha ao validar sessão de usuário.",
          toSafeErrorLog(err, "OptionalUserSessionError"),
        );
        return authUnavailable(res);
      }
    })(req, res, next);
  } catch (err) {
    console.error(
      "[OPTIONAL AUTH] Falha ao iniciar validação de sessão.",
      toSafeErrorLog(err, "OptionalUserAuthError"),
    );
    return authUnavailable(res);
  }
};

export default optionalAuth;
