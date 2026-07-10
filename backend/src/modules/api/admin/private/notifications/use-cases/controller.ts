import type { Request, Response } from "express";
import { error500, send } from "@/helpers/return";
import type { IAdminNotificationsDTO } from "../DTOs/IAdminNotificationsDTO";
import {
  automaticLogs as automaticLogsService,
  cancelCampaign as cancelCampaignService,
  createCampaign as createCampaignService,
  listCampaigns as listCampaignsService,
  metrics as metricsService,
  pushStatus as pushStatusService,
  scheduleCampaign as scheduleCampaignService,
  sendCampaign as sendCampaignService,
  showCampaign as showCampaignService,
  updateCampaign as updateCampaignService,
} from "./services";

const dto = (req: Request): IAdminNotificationsDTO => ({
  admin: req.admin,
  b: req.b,
  p: req.p,
  q: req.q,
});

export const createCampaign = async (req: Request, res: Response) => {
  try {
    return send(res, await createCampaignService(dto(req)));
  } catch (err) {
    return error500(res, "admin_notifications_create", err);
  }
};

export const updateCampaign = async (req: Request, res: Response) => {
  try {
    return send(res, await updateCampaignService(dto(req)));
  } catch (err) {
    return error500(res, "admin_notifications_update", err);
  }
};

export const sendCampaign = async (req: Request, res: Response) => {
  try {
    return send(res, await sendCampaignService(dto(req)));
  } catch (err) {
    return error500(res, "admin_notifications_send", err);
  }
};

export const scheduleCampaign = async (req: Request, res: Response) => {
  try {
    return send(res, await scheduleCampaignService(dto(req)));
  } catch (err) {
    return error500(res, "admin_notifications_schedule", err);
  }
};

export const cancelCampaign = async (req: Request, res: Response) => {
  try {
    return send(res, await cancelCampaignService(dto(req)));
  } catch (err) {
    return error500(res, "admin_notifications_cancel", err);
  }
};

export const listCampaigns = async (req: Request, res: Response) => {
  try {
    return send(res, await listCampaignsService(dto(req)));
  } catch (err) {
    return error500(res, "admin_notifications_list", err);
  }
};

export const showCampaign = async (req: Request, res: Response) => {
  try {
    return send(res, await showCampaignService(dto(req)));
  } catch (err) {
    return error500(res, "admin_notifications_show", err);
  }
};

export const automaticLogs = async (req: Request, res: Response) => {
  try {
    return send(res, await automaticLogsService(dto(req)));
  } catch (err) {
    return error500(res, "admin_notifications_automatic_logs", err);
  }
};

export const metrics = async (req: Request, res: Response) => {
  try {
    return send(res, await metricsService(dto(req)));
  } catch (err) {
    return error500(res, "admin_notifications_metrics", err);
  }
};

export const pushStatus = async (_req: Request, res: Response) => {
  try {
    return send(res, await pushStatusService());
  } catch (err) {
    return error500(res, "admin_notifications_push_status", err);
  }
};
