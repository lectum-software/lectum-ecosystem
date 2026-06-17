import type { NextFunction, Request, Response } from "express";
import type { user } from "@/interfaces/objects";
import { passLogin } from "../_auth/helpers/login";
import { passToken } from "../_auth/helpers/token";
import passport from "../_auth/passport";
import { getDevice } from "../_auth/utils/device";

type NotAuthorized = {
  status: number;
  message: string;
};

const optionalAuth = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req?.headers?.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    return next();
  }

  try {
    passport.authenticate("jwt-user-api", async (_: NotAuthorized, login: user) => {
      if (!login) return next();

      const deviceId = req?.headers?.["x-device"] as string;
      const token = await passToken(login, deviceId, authHeader.split(" ")[1]);
      if (token.err) return next();

      const logged = await passLogin(login);
      if (logged.err) return next();

      const device = getDevice(req);
      if (!device.err) {
        req.device = device.id;
      }

      req.auth = login;

      return next();
    })(req, res, next);
  } catch (_err) {
    return next();
  }
};

export default optionalAuth;
