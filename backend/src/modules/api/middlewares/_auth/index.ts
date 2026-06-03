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
  status: number;
  message: string;
};

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
    passport.authenticate("jwt-user-api", async (_: Not_Authorized, login: user) => {
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
      } else {
        return send(res, {
          status: 401,
          ...error("token_not_authorized", {
            //If you need a custom text
          }),
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
