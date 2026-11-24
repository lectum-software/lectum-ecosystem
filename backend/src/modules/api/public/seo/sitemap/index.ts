import { Router } from "express";
import {
  type SitemapKind,
  sitemapEntries,
  sitemapManifest,
  sitemapSizes,
} from "./use-cases/services";

const routes = Router();
routes.get("/", async (_req, res) => {
  try {
    res.set("Cache-Control", "no-store").json({ success: true, data: await sitemapManifest() });
  } catch {
    res.status(503).json({ success: false });
  }
});
routes.get("/:kind/:page", async (req, res) => {
  const kind = req.params.kind;
  const page = Number(req.params.page);
  if (
    !Object.hasOwn(sitemapSizes, kind) ||
    !/^\d+$/.test(req.params.page) ||
    !Number.isSafeInteger(page) ||
    page < 0 ||
    page > 100000
  ) {
    res.status(400).json({ success: false });
    return;
  }
  try {
    res
      .set("Cache-Control", "no-store")
      .json({ success: true, data: await sitemapEntries(kind as SitemapKind, page) });
  } catch {
    res.status(503).json({ success: false });
  }
});
export default routes;
