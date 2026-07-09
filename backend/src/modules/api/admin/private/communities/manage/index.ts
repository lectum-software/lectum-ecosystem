import { Router } from "express";
import multer from "@/config/multer";
import adminAuth from "../../../middlewares/_auth";
import {
  authorizeAvatarUpload,
  avatar,
  createRule,
  deleteRule,
  rules,
  show,
  update,
  updateRule,
} from "./use-cases/controller";
import {
  avatarValidator,
  deleteRuleValidator,
  ruleValidator,
  showValidator,
  updateRuleValidator,
  updateValidator,
} from "./validator";

const routes = Router();

routes.use(adminAuth);
routes.get("/:id", showValidator, show);
routes.put("/:id", updateValidator, update);
routes.post(
  "/:id/avatar",
  avatarValidator,
  authorizeAvatarUpload,
  multer({
    single: "avatar",
    feature: "community",
    allowed: ["image/jpeg", "image/png", "image/webp"],
    size: 5,
  }),
  avatar,
);
routes.get("/:id/rules", showValidator, rules);
routes.post("/:id/rules", ruleValidator, createRule);
routes.put("/:id/rules/:ruleId", updateRuleValidator, updateRule);
routes.delete("/:id/rules/:ruleId", deleteRuleValidator, deleteRule);

export default routes;
