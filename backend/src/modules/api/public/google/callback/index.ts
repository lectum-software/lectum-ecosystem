//Lib
import { Router } from "express";

//Middlewares
import session from "@/modules/api/middlewares/_auth/_session";
import passport from "@/modules/api/middlewares/_auth/passport";

//Route Infos
const routes = Router();

session(routes);

//Routes
routes.get("", passport.authenticate("google", { failureRedirect: "/" }), (_req, res) => {
  //

  const failPath = process.env.CALLBACK_FAIL_URL_API_USER;
  const user = _req?.user as {
    success?: boolean;
    error?: string;
    data?: { user_tokens?: { token?: string }[] };
  };

  if (!user?.success) {
    const fallbackPath = failPath || process.env.CALLBACK_URL_API_USER || "/";
    const separator = fallbackPath.includes("?") ? "&" : "?";
    return res.redirect(
      `${fallbackPath}${separator}error=${encodeURIComponent(
        user?.error || "N\u00e3o foi poss\u00edvel concluir a autentica\u00e7\u00e3o com o Google.",
      )}`,
    );
  }

  const token = user?.data?.user_tokens?.[0].token;
  const isProduction = process.env.NODE_ENV?.includes("prod");

  res.cookie("token", token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    maxAge: 1000 * 60 * 1, // 1 minuto
  });

  const state = _req.query.state as string;

  let originalQueryStr = "";
  try {
    const stateObj = JSON.parse(state || "{}");
    if (stateObj?.query) {
      const params = new URLSearchParams();
      Object.entries(stateObj.query as Record<string, unknown>).forEach(([key, value]) => {
        if (key === "link_token" || key === "delete_token" || value === undefined || value === null)
          return;

        if (Array.isArray(value)) {
          value.forEach((item) => {
            params.append(key, String(item));
          });
          return;
        }

        params.set(key, String(value));
      });
      originalQueryStr = params.toString();
    }
  } catch (e) {
    console.log(e);
  }

  const baseUrl = process.env.CALLBACK_URL_API_USER!;
  const separator = baseUrl.includes("?") ? "&" : "?";
  const finalUrl = originalQueryStr ? `${baseUrl}${separator}${originalQueryStr}` : baseUrl;

  res.redirect(finalUrl);
});

export default routes;
