//Libs

//Types
import type { Router } from "express";
import session from "express-session";
import passport from "../passport";

export const middlewareSession = (app: Router) => {
  app.use(
    session({
      secret: process.env.JWT_SECRET_KEY || "development-secret",
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true, // impede JS de ler diretamente
        secure: true, // em produção: HTTPS obrigatório
        sameSite: "none", // permite envio em cross-site
      },
    }),
  );

  app.use(passport.initialize());
  app.use(passport.session());

  return app;
};

export default middlewareSession;
