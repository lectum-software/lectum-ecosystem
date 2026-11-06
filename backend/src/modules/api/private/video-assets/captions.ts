import { Router } from "express";
import { getLimiter } from "@/external/limiter";
import { ownedCaptionAction } from "@/modules/video-assets/captions/service";

const routes = Router();
for (const [method, suffix, action] of [
  ["get", "", "read"],
  ["put", "", "save"],
  ["post", "/generate", "generate"],
  ["post", "/sync", "sync"],
] as const) {
  routes[method](`/:id/captions${suffix}`, getLimiter({ max: 10, window: 1 }), async (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    const auth = (req as unknown as { auth?: { id?: string; role?: string } }).auth;
    if (!auth?.id || auth.role !== "psicologo") return res.status(403).json({ success: false });
    try {
      const result = await ownedCaptionAction(String(req.params.id), auth.id, action, req.body);
      return res.status(result.status).json({ success: result.status < 400, data: result.data });
    } catch {
      return res.status(503).json({ success: false });
    }
  });
}
export default routes;
