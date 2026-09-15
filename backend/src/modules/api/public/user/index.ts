import { Router } from "express";
import storeRoutes from "./store";

const routes = Router();

routes.use("/store", storeRoutes);

export default routes;
