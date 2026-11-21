import { Router } from "express";
import { proxyDiagnosticReport } from "./report";

const routes = Router();

// mountRoute requires the existing admin session verifier before this router.
routes.get("/", (req, res) => {
  res.setHeader("Cache-Control", "private, no-store");
  res.setHeader("X-Robots-Tag", "noindex, nofollow, noarchive");
  res.json(proxyDiagnosticReport(req));
});

export default routes;
