//Lib

import { type Request, type Response, Router } from "express";
import jwt, { type JwtPayload } from "jsonwebtoken";
//Helpers
import { send } from "@/helpers/return";
import { error } from "@/helpers/translate";
//Middlewares
import session from "@/modules/api/middlewares/_auth/_session";
//Repositories
import { LoginRepository } from "../../auth/login/repositories/LoginRepository";

//Route Infos
const routes = Router();

session(routes);

//Routes
routes.get("", async (req: Request, res: Response) => {
  //
  try {
    const token = req?.cookies?.token as string;

    const tokenUndefined = token === "undefined";
    if (!token || tokenUndefined) {
      res.clearCookie("token");
      return send(res, {
        status: 401,
        ...error("token_not_provided", {
          //If you need a custom text
        }),
      });
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET_KEY!) as JwtPayload;
    const repo = new LoginRepository(payload.device_id);
    const user = await repo.findByEmail({ b: { email: payload.email } });

    if (!user) {
      res.clearCookie("token");
      return send(res, {
        status: 401,
        ...error("token_not_authorized", {
          //If you need a custom text
        }),
      });
    }

    const result = await repo.hidrate(user, payload.device_id);

    res.clearCookie("token");
    return send(res, { status: 200, data: result, success: true });
  } catch (_err) {
    res.clearCookie("token");
    return send(res, {
      status: 401,
      ...error("token_invalid", {
        //If you need a custom text
      }),
    });
  }
});

export default routes;
