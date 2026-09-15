import { Router } from "express";
import { store } from "./use-cases/controller";

const routes = Router();

// O payload assinado pertence ao Cloudflare e precisa chegar byte a byte ao service.
// O validator de DTO da aplicação é estrito e limparia/rejeitaria campos do provider.
routes.post("", store);

export default routes;
