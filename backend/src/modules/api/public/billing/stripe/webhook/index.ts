import { Router } from "express";
import { store } from "./use-cases/controller";

const routes = Router();
// Signature verification consumes the bounded raw body, never a reconstructed DTO.
routes.post("", store);
export default routes;
