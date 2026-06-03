import type { Response } from "express";
import { Router } from "express";

import importedRoutes from "./imports/write";

const routes = Router();

routes.get("/ping", (_req, res: Response) => {
  res.json({ pong: "server ok!" });
});

routes.use(importedRoutes);

export default routes;
