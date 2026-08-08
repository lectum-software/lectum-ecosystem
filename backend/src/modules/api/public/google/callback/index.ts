//Lib
import { Router } from "express";

//Middlewares
import passport from "@/modules/api/middlewares/_auth/passport";
import { isProductionRuntime } from "@/utils/runtime-config";
import {
  GOOGLE_OAUTH_STATE_COOKIE,
  googleOAuthStateClearCookieOptions,
  verifyGoogleOAuthState,
} from "../utils/state";

//Route Infos
const routes = Router();

routes.use(passport.initialize());

type GoogleCallbackQuery = Record<string, string | string[] | undefined>;
type GoogleCallbackUser = {
  success?: boolean;
  error?: string;
  data?: {
    role?: string | null;
    user_tokens?: { token?: string }[];
  };
};

const DELETE_ACCOUNT_PATIENT_CALLBACK = "/app/perfil/editar?deleteReauth=ok";
const DELETE_ACCOUNT_PSYCHOLOGIST_CALLBACK = "/app/profissional/perfil/configurar?deleteReauth=ok";
const GOOGLE_EXCHANGE_COOKIE_TTL_MS = 2 * 60 * 1000;
const GOOGLE_CALLBACK_INTERNAL_QUERY_KEYS = new Set([
  "analytics_session_id",
  "analytics_visitor_id",
  "delete_token",
  "link_token",
]);

const getFrontendOrigin = () => {
  const callbackUrl = process.env.CALLBACK_URL_API_USER || "/";

  try {
    return new URL(callbackUrl).origin;
  } catch {
    return "";
  }
};

const sanitizeAppCallbackUrl = (value: unknown, fallback: string) => {
  const raw = typeof value === "string" ? value.trim() : "";

  if (!raw?.startsWith("/app/") || raw.startsWith("//")) return fallback;

  try {
    const url = new URL(raw, "https://lectum.local");
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
};

const resolveDeleteAccountCallbackUrl = (query: GoogleCallbackQuery, user: GoogleCallbackUser) => {
  const fallback =
    user.data?.role === "psicologo"
      ? DELETE_ACCOUNT_PSYCHOLOGIST_CALLBACK
      : DELETE_ACCOUNT_PATIENT_CALLBACK;
  const path = sanitizeAppCallbackUrl(query.callbackUrl, fallback);
  const url = new URL(path, "https://lectum.local");
  url.searchParams.set("deleteReauth", "ok");

  const frontendOrigin = getFrontendOrigin();
  if (!frontendOrigin) return `${url.pathname}${url.search}${url.hash}`;

  return new URL(`${url.pathname}${url.search}${url.hash}`, frontendOrigin).toString();
};

const resolveFailureCallbackUrl = (fallbackPath: string, message: string) => {
  const isAbsolute = /^https?:\/\//i.test(fallbackPath);
  const url = new URL(fallbackPath, "https://lectum.local");

  url.searchParams.set("error", message);
  url.searchParams.set("clearSession", "1");

  return isAbsolute ? url.toString() : `${url.pathname}${url.search}${url.hash}`;
};

const parseGoogleStateQuery = (state: unknown, cookieNonce: unknown) => {
  const query: GoogleCallbackQuery = {};
  const params = new URLSearchParams();
  const statePayload = verifyGoogleOAuthState(state, cookieNonce);

  if (statePayload) {
    Object.entries(statePayload.query).forEach(([key, value]) => {
      if (GOOGLE_CALLBACK_INTERNAL_QUERY_KEYS.has(key)) return;

      query[key] = value;
      params.set(key, value);
    });
  }

  return {
    query,
    queryString: params.toString(),
  };
};

//Routes
routes.get(
  "",
  passport.authenticate("google", {
    failureRedirect: process.env.CALLBACK_FAIL_URL_API_USER || "/",
    session: false,
  }),
  (_req, res) => {
    //

    const failPath = process.env.CALLBACK_FAIL_URL_API_USER;
    const user = _req?.user as GoogleCallbackUser;
    const state = _req.query.state as string;
    const { query: originalQuery, queryString: originalQueryStr } = parseGoogleStateQuery(
      state,
      _req.cookies?.[GOOGLE_OAUTH_STATE_COOKIE],
    );
    res.clearCookie(GOOGLE_OAUTH_STATE_COOKIE, googleOAuthStateClearCookieOptions());

    if (!user?.success) {
      const fallbackPath = failPath || process.env.CALLBACK_URL_API_USER || "/";
      return res.redirect(
        resolveFailureCallbackUrl(
          fallbackPath,
          "Não foi possível concluir a autenticação com o Google.",
        ),
      );
    }

    if (originalQuery.intent === "delete_account") {
      return res.redirect(resolveDeleteAccountCallbackUrl(originalQuery, user));
    }

    const token = user?.data?.user_tokens?.[0].token;
    if (!token) {
      return res.redirect(
        resolveFailureCallbackUrl(
          failPath || process.env.CALLBACK_URL_API_USER || "/",
          "Não foi possível concluir a autenticação com o Google.",
        ),
      );
    }

    res.cookie("token", token, {
      httpOnly: true,
      secure: isProductionRuntime(),
      sameSite: "lax",
      maxAge: GOOGLE_EXCHANGE_COOKIE_TTL_MS,
      path: "/api/public/google/me",
    });

    const baseUrl = process.env.CALLBACK_URL_API_USER || "/";
    const separator = baseUrl.includes("?") ? "&" : "?";
    const finalUrl = originalQueryStr ? `${baseUrl}${separator}${originalQueryStr}` : baseUrl;

    res.redirect(finalUrl);
  },
);

export default routes;
