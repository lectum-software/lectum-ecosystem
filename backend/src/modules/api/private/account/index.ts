import { Router } from "express";
import { destroy, email, password, security } from "./use-cases/controller";
import { deleteValidator, emailValidator, passwordValidator } from "./validator";

const routes = Router();

routes.get("/security", security);
routes.post("/delete", deleteValidator, destroy);
routes.put("/email", emailValidator, email);
routes.put("/password", passwordValidator, password);

export default routes;
