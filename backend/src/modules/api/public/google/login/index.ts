//Lib
import { Router } from "express";
import { getLimiter } from "@/external/limiter";
import { send } from "@/helpers/return";
import { error } from "@/helpers/translate";

//Middlewares
import passport from "@/modules/api/middlewares/_auth/passport";
import {
  createGoogleOAuthState,
  GOOGLE_OAUTH_STATE_COOKIE,
  googleOAuthStateCookieOptions,
  isValidGoogleDeviceId,
} from "../utils/state";

//Route Infos
const routes = Router();
const limiter = getLimiter({ window: 5, max: 30 });

routes.use(passport.initialize());

//Routes
routes.get("/:id", limiter, (req, res, next) => {
  const deviceId = typeof req.params.id === "string" ? req.params.id : "";

  if (!isValidGoogleDeviceId(deviceId)) {
    return send(res, {
      status: 400,
      ...error("device_id_not_found", {}),
    });
  }

  const { nonce, state } = createGoogleOAuthState(deviceId, req.query);
  res.cookie(GOOGLE_OAUTH_STATE_COOKIE, nonce, googleOAuthStateCookieOptions());

  passport.authenticate("google", {
    // Forca o seletor/confirmacao de conta do Google mesmo quando ha uma
    // sessao Google ativa no navegador, permitindo trocar o e-mail antes do OAuth.
    prompt: "select_account",
    session: false,
    scope: ["profile", "email"],
    state,
  })(req, res, next);
});

export default routes;
