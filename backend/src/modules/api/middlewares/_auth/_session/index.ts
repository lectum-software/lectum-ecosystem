//Libs

//Types
import type { Router } from "express";
import session from "express-session";
import passport from "../passport";
import { getJwtSecret } from "../utils/jwt-secret";

export const middlewareSession = (app: Router) => {
  const isProduction = process.env.NODE_ENV?.includes("prod");

  app.use(
    session({
      secret: getJwtSecret(),
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true, // impede JS de ler diretamente
        secure: isProduction, // em produção: HTTPS obrigatório
        sameSite: isProduction ? "none" : "lax", // permite OAuth local sem HTTPS.
      },
    }),
  );

  app.use(passport.initialize());
  app.use(passport.session());

  return app;
};

export default middlewareSession;
