import { Router } from "express";
import { email, password, security } from "./use-cases/controller";
import { emailValidator, passwordValidator } from "./validator";

const routes = Router();

routes.get("/security", security);
routes.put("/email", emailValidator, email);
routes.put("/password", passwordValidator, password);

export default routes;
