//Lib
import { Router } from "express";
//Controllers
import { test } from "./use-cases/controller";

// ATENÇÃO: rota de desenvolvimento, SEM autenticação.
// É registrada em `write.ts` apenas quando NODE_ENV !== "production".
const routes = Router();

routes.get("", test);

export default routes;
