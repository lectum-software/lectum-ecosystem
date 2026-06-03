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

  if (!user?.success && failPath) return res.redirect(`${failPath}?error=${user?.error}`);

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
      const params = new URLSearchParams(stateObj.query);
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
