import { Router } from "express";
import {
  automaticLogs,
  cancelCampaign,
  createCampaign,
  emailStatus,
  listCampaigns,
  metrics,
  pushStatus,
  scheduleCampaign,
  sendCampaign,
  showCampaign,
  updateCampaign,
} from "./use-cases/controller";
import {
  automaticLogsValidator,
  createCampaignValidator,
  idValidator,
  listCampaignsValidator,
  metricsValidator,
  scheduleCampaignValidator,
  updateCampaignValidator,
} from "./validator";

const routes = Router();

routes.get("/metrics", metricsValidator, metrics);
routes.get("/push-status", pushStatus);
routes.get("/email-status", emailStatus);
routes.get("/automatic-logs", automaticLogsValidator, automaticLogs);
routes.get("/campaigns", listCampaignsValidator, listCampaigns);
routes.post("/campaigns", createCampaignValidator, createCampaign);
routes.get("/campaigns/:id", idValidator, showCampaign);
routes.put("/campaigns/:id", updateCampaignValidator, updateCampaign);
routes.post("/campaigns/:id/send", idValidator, sendCampaign);
routes.post("/campaigns/:id/schedule", scheduleCampaignValidator, scheduleCampaign);
routes.post("/campaigns/:id/cancel", idValidator, cancelCampaign);

export default routes;
