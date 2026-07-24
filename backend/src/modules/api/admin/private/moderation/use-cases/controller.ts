import type { Request, Response } from "express";
import { error500, send } from "@/helpers/return";
import {
  getSummary,
  listEvents,
  listOperationalAlerts,
  resolveEvent,
  reviewEvent,
  showEvent,
} from "./services";

export const summary = async (req: Request, res: Response) => {
  try {
    const resolve = await getSummary(req as Parameters<typeof getSummary>[0]);
    return send(res, resolve);
  } catch (err) {
    return error500(res, "admin_moderation_summary", err);
  }
};

export const events = async (req: Request, res: Response) => {
  try {
    const resolve = await listEvents(req as Parameters<typeof listEvents>[0]);
    return send(res, resolve);
  } catch (err) {
    return error500(res, "admin_moderation_events", err);
  }
};

export const operationalAlerts = async (req: Request, res: Response) => {
  try {
    const resolve = await listOperationalAlerts(req as Parameters<typeof listOperationalAlerts>[0]);
    return send(res, resolve);
  } catch (err) {
    return error500(res, "admin_moderation_operational_alerts", err);
  }
};

export const detail = async (req: Request, res: Response) => {
  try {
    const resolve = await showEvent(req as Parameters<typeof showEvent>[0]);
    return send(res, resolve);
  } catch (err) {
    return error500(res, "admin_moderation_event", err);
  }
};

export const review = async (req: Request, res: Response) => {
  try {
    const resolve = await reviewEvent(req as Parameters<typeof reviewEvent>[0]);
    return send(res, resolve);
  } catch (err) {
    return error500(res, "admin_moderation_review", err);
  }
};

export const resolve = async (req: Request, res: Response) => {
  try {
    const resolveResult = await resolveEvent(req as Parameters<typeof resolveEvent>[0]);
    return send(res, resolveResult);
  } catch (err) {
    return error500(res, "admin_moderation_resolve", err);
  }
};
