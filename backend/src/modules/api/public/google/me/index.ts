//Lib

import { type Request, type Response, Router } from "express";
import jwt, { type JwtPayload } from "jsonwebtoken";
//Helpers
import { send } from "@/helpers/return";
import { error } from "@/helpers/translate";
import prisma from "@/infra/database/prisma";
import { getJwtSecret } from "@/modules/api/middlewares/_auth/utils/jwt-secret";
//Repositories
import { LoginRepository } from "../../auth/login/repositories/LoginRepository";

//Route Infos
const routes = Router();
const GOOGLE_EXCHANGE_MAX_AGE_SECONDS = 2 * 60;
const exchangeCookieOptions = { path: "/api/public/google/me" };

//Routes
routes.get("", async (req: Request, res: Response) => {
  //
  try {
    const token = req?.cookies?.token as string;

    const tokenUndefined = token === "undefined";
    if (!token || tokenUndefined) {
      res.clearCookie("token", exchangeCookieOptions);
      return send(res, {
        status: 401,
        ...error("token_not_provided", {
          //If you need a custom text
        }),
      });
    }

    const payload = jwt.verify(token, getJwtSecret(), {
      maxAge: GOOGLE_EXCHANGE_MAX_AGE_SECONDS,
    }) as JwtPayload;
    const userId = typeof payload.id === "string" ? payload.id : "";
    const email = typeof payload.email === "string" ? payload.email : "";
    const deviceId = typeof payload.device_id === "string" ? payload.device_id : "";

    if (!userId || !email || !deviceId) {
      throw new Error("INVALID_GOOGLE_EXCHANGE_TOKEN");
    }

    const repo = new LoginRepository(deviceId);
    const user = await repo.findByEmail({ b: { email } });

    if (!user?.id || user.id !== userId) {
      res.clearCookie("token", exchangeCookieOptions);
      return send(res, {
        status: 401,
        ...error("token_not_authorized", {
          //If you need a custom text
        }),
      });
    }

    const consumed = await prisma.user_token.deleteMany({
      where: {
        deleted: false,
        device_id: deviceId,
        token,
        user_id: user.id,
      },
    });

    if (consumed.count !== 1) {
      res.clearCookie("token", exchangeCookieOptions);
      return send(res, {
        status: 401,
        ...error("token_not_authorized", {}),
      });
    }

    const result = await repo.hidrate(user, deviceId);

    res.clearCookie("token", exchangeCookieOptions);
    return send(res, {
      allowAuthTokens: true,
      status: 200,
      data: result,
      success: true,
    });
  } catch (_err) {
    res.clearCookie("token", exchangeCookieOptions);
    return send(res, {
      status: 401,
      ...error("token_invalid", {
        //If you need a custom text
      }),
    });
  }
});

export default routes;
