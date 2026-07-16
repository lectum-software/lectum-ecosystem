import { Router } from "express";
import multer from "@/config/multer";
import adminAuth from "../../../middlewares/_auth";
import {
  activities,
  authorizeAvatarUpload,
  avatar,
  content,
  create,
  createRule,
  deleteRule,
  list,
  ranking,
  removeContent,
  reports,
  resolveReports,
  rules,
  show,
  update,
  updateRule,
} from "./use-cases/controller";
import {
  activitiesValidator,
  avatarValidator,
  contentValidator,
  createValidator,
  deleteRuleValidator,
  listValidator,
  rankingValidator,
  removeContentValidator,
  reportsValidator,
  resolveReportsValidator,
  ruleValidator,
  showValidator,
  updateRuleValidator,
  updateValidator,
} from "./validator";

const routes = Router();

routes.use(adminAuth);
routes.post("/", createValidator, create);
routes.get("/", listValidator, list);
routes.get("/:id", showValidator, show);
routes.put("/:id", updateValidator, update);
routes.get("/:id/content", contentValidator, content);
routes.post("/:id/content/:targetType/:targetId/remove", removeContentValidator, removeContent);
routes.get("/:id/ranking", rankingValidator, ranking);
routes.post("/:id/reports/:targetType/:targetId/resolve", resolveReportsValidator, resolveReports);
routes.get("/:id/reports", reportsValidator, reports);
routes.get("/:id/activities", activitiesValidator, activities);
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
