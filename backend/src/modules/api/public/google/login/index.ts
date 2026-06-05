//Lib
import { Router } from "express";

//Middlewares
import session from "@/modules/api/middlewares/_auth/_session";
import passport from "@/modules/api/middlewares/_auth/passport";

//Route Infos
const routes = Router();

session(routes);

//Routes
routes.get("/:id", (req, res, next) => {
  passport.authenticate("google", {
    // Forca o seletor/confirmacao de conta do Google mesmo quando ha uma
    // sessao Google ativa no navegador, permitindo trocar o e-mail antes do OAuth.
    prompt: "select_account",
    scope: ["profile", "email"],
    state: JSON.stringify({
      device_id: req.params.id,
      query: req.query,
    }),
  })(req, res, next);
});

export default routes;
