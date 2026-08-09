import type { Response } from "express";
import { Router } from "express";
import packageMetadata from "../../../package.json";

import importedRoutes from "./imports/write";

const routes = Router();

routes.get("/ping", (_req, res: Response) => {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Robots-Tag", "noindex, nofollow, noarchive");
  res.json({ pong: "server ok!", version: packageMetadata.version });
});

routes.use(importedRoutes);

export default routes;
