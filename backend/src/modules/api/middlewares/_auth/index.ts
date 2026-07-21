import type { NextFunction, Request, Response } from "express";

//Returns
import { send } from "@/helpers/return";
import { error } from "@/helpers/translate";
//Types
import type { user } from "@/interfaces/objects";
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
  if (!authHeader)
    return send(res, {
      status: 401,
      ...error("token_not_provided", {
        //If you need a custom text
      }),
    });

  if (!authHeader.startsWith("Bearer "))
    return send(res, {
      status: 401,
      ...error("token_mal_formatted", {
        //If you need a custom text
      }),
    });

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
          const device_id = req?.headers?.["x-device"] as string;
          const token = await passToken(login, device_id, authHeader.split(" ")[1]);
          if (token.err) return send(res, token.err);

          //Login
          const logged = await passLogin(login);
          if (logged.err) return send(res, logged.err);

          const device = getDevice(req);
          if (device.err) return send(res, { error: device.err, success: false });

          req.device = device.id;

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
        console.error("[USER AUTH] Falha ao hidratar sessão de usuário.", err);
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
