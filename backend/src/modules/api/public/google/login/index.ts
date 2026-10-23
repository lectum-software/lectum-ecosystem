//Lib
import { Router } from "express";
import { getLimiter } from "@/external/limiter";
import { send } from "@/helpers/return";
import { error } from "@/helpers/translate";
//Middlewares
import passport from "@/modules/api/middlewares/_auth/passport";
import { adultBirthdateSchema } from "@/utils/adult-birthdate";
import { isGoogleOAuthConfigured } from "../utils/config";
import {
  createGoogleDeleteReauthStateCookie,
  createGoogleOAuthState,
  GOOGLE_DELETE_REAUTH_STATE_COOKIE,
  GOOGLE_OAUTH_STATE_COOKIE,
  GOOGLE_REGISTRATION_COOKIE,
  googleDeleteReauthStateCookieOptions,
  googleOAuthStateCookieOptions,
  googleRegistrationCookieOptions,
  isValidGoogleDeviceId,
  verifyGoogleOAuthState,
} from "../utils/state";

//Route Infos
const routes = Router();
const limiter = getLimiter({ window: 5, max: 30 });

routes.use((_req, res, next) => {
  if (!isGoogleOAuthConfigured()) {
    return send(res, { status: 503, ...error("google_oauth_not_configured", {}) });
  }
  next();
});
routes.use(passport.initialize());

//Routes
routes.get("/", limiter, (_req, res) =>
  send(res, {
    status: 400,
    ...error("device_id_not_found", {}),
  }),
);

// Keep birthdates out of navigation URLs and provider-visible OAuth parameters.
routes.post("/:id/registration", limiter, (req, res) => {
  const deviceId = typeof req.params.id === "string" ? req.params.id : "";
  const birthdate = adultBirthdateSchema.safeParse(req.body?.birthdate);
  if (
    !isValidGoogleDeviceId(deviceId) ||
    !birthdate.success ||
    !["paciente", "psicologo"].includes(req.body?.role)
  ) {
    return send(res, { status: 400, ...error("invalid_birthdate", {}) });
  }
  const { nonce, state } = createGoogleOAuthState(deviceId, {
    ...req.body,
    birthdate: birthdate.data,
    adult_confirmed: "true",
    intent: "register",
  });
  res.cookie(GOOGLE_REGISTRATION_COOKIE, nonce, googleRegistrationCookieOptions());
  res.setHeader("Cache-Control", "no-store");
  return send(res, { status: 200, success: true, data: { state } });
});

routes.get("/:id", limiter, (req, res, next) => {
  const deviceId = typeof req.params.id === "string" ? req.params.id : "";

  if (!isValidGoogleDeviceId(deviceId)) {
    return send(res, {
      status: 400,
      ...error("device_id_not_found", {}),
    });
  }

  let query = { ...req.query };
  // A date is accepted only from the encrypted, browser-bound preparation step.
  delete query.birthdate;
  if (req.query.registration_state !== undefined) {
    const prepared = verifyGoogleOAuthState(
      req.query.registration_state,
      req.cookies?.[GOOGLE_REGISTRATION_COOKIE],
    );
    if (!prepared || prepared.device_id !== deviceId || prepared.query.intent !== "register") {
      return send(res, { status: 400, ...error("invalid_structure", {}) });
    }
    query = prepared.query;
    const { maxAge: _maxAge, ...cookieOptions } = googleRegistrationCookieOptions();
    res.clearCookie(GOOGLE_REGISTRATION_COOKIE, cookieOptions);
  }
  const { nonce, state } = createGoogleOAuthState(deviceId, query);
  const deleteReauthCookie = createGoogleDeleteReauthStateCookie(deviceId, req.query);
  res.cookie(GOOGLE_OAUTH_STATE_COOKIE, nonce, googleOAuthStateCookieOptions());
  if (deleteReauthCookie) {
    res.cookie(
      GOOGLE_DELETE_REAUTH_STATE_COOKIE,
      deleteReauthCookie,
      googleDeleteReauthStateCookieOptions(),
    );
  }

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
