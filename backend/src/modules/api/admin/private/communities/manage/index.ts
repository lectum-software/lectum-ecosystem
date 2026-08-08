import { Router } from "express";
import multer from "@/config/multer";
import {
  activities,
  authorizeAvatarUpload,
  avatar,
  content,
  contentDetail,
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
  statistics,
  status,
  update,
  updateRule,
} from "./use-cases/controller";
import {
  activitiesValidator,
  avatarValidator,
  contentDetailValidator,
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
  statisticsValidator,
  statusValidator,
  updateRuleValidator,
  updateValidator,
} from "./validator";

const routes = Router();

routes.post("/", createValidator, create);
routes.get("/", listValidator, list);
routes.get("/:id", showValidator, show);
routes.put("/:id", updateValidator, update);
routes.patch("/:id/status", statusValidator, status);
routes.get("/:id/statistics", statisticsValidator, statistics);
routes.get("/:id/content", contentValidator, content);
routes.get("/:id/content/:targetType/:targetId/detail", contentDetailValidator, contentDetail);
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
