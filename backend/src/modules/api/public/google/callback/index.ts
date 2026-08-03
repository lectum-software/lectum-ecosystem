//Lib
import { Router } from "express";

//Middlewares
import session from "@/modules/api/middlewares/_auth/_session";
import passport from "@/modules/api/middlewares/_auth/passport";

//Route Infos
const routes = Router();

session(routes);

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

const parseGoogleStateQuery = (state: unknown) => {
  const query: GoogleCallbackQuery = {};
  const params = new URLSearchParams();

  try {
    const stateObj = JSON.parse(typeof state === "string" ? state : "{}");
    if (stateObj?.query) {
      Object.entries(stateObj.query as Record<string, unknown>).forEach(([key, value]) => {
        if (GOOGLE_CALLBACK_INTERNAL_QUERY_KEYS.has(key) || value === undefined || value === null) {
          return;
        }

        if (Array.isArray(value)) {
          query[key] = value.map((item) => String(item));
          value.forEach((item) => {
            params.append(key, String(item));
          });
          return;
        }

        query[key] = String(value);
        params.set(key, String(value));
      });
    }
  } catch (e) {
    console.warn("[GOOGLE] Estado OAuth inválido ou ausente no callback.", {
      message: e instanceof Error ? e.message : "unknown",
    });
  }

  return {
    query,
    queryString: params.toString(),
  };
};

//Routes
routes.get("", passport.authenticate("google", { failureRedirect: "/" }), (_req, res) => {
  //

  const failPath = process.env.CALLBACK_FAIL_URL_API_USER;
  const user = _req?.user as GoogleCallbackUser;
  const state = _req.query.state as string;
  const { query: originalQuery, queryString: originalQueryStr } = parseGoogleStateQuery(state);

  if (!user?.success) {
    const fallbackPath = failPath || process.env.CALLBACK_URL_API_USER || "/";
    return res.redirect(
      resolveFailureCallbackUrl(
        fallbackPath,
        user?.error || "N\u00e3o foi poss\u00edvel concluir a autentica\u00e7\u00e3o com o Google.",
      ),
    );
  }

  if (originalQuery.intent === "delete_account") {
    return res.redirect(resolveDeleteAccountCallbackUrl(originalQuery, user));
  }

  const token = user?.data?.user_tokens?.[0].token;
  const isProduction = process.env.NODE_ENV?.includes("prod");

  res.cookie("token", token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    maxAge: 1000 * 60 * 1, // 1 minuto
  });

  const baseUrl = process.env.CALLBACK_URL_API_USER!;
  const separator = baseUrl.includes("?") ? "&" : "?";
  const finalUrl = originalQueryStr ? `${baseUrl}${separator}${originalQueryStr}` : baseUrl;

  res.redirect(finalUrl);
});

export default routes;
