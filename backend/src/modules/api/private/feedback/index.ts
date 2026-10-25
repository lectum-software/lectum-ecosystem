import type { RequestHandler } from "express";
import { Router } from "express";
import multer from "multer";
import { send } from "@/helpers/return";
import { error } from "@/helpers/translate";
import { MAX_ATTACHMENT_SIZE } from "@/modules/feedback/policy";
import { create } from "./use-cases/controller";
import { createValidator } from "./validator";

const routes = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    files: 3,
    fileSize: MAX_ATTACHMENT_SIZE,
    fields: 4,
    fieldSize: 16_384,
    // Busboy signals partsLimit when the threshold is reached.
    parts: 8,
  },
}).array("attachments", 3);
// Bound concurrent buffered uploads per authenticated account.
const active = new Set<string>();
const receive: RequestHandler = (req, res, next) => {
  if (active.has(req.auth.id) || active.size >= 4)
    return send(res, { status: 429, ...error("feedback_busy") });
  active.add(req.auth.id);
  let released = false;
  const release = () => {
    if (released) return;
    released = true;
    active.delete(req.auth.id);
  };
  res.once("finish", release);
  res.once("close", release);
  upload(req, res, (err) => {
    if (err) return send(res, { status: 400, ...error("feedback_image") });
    next();
  });
};
routes.post("/", receive, createValidator, create);
export default routes;
