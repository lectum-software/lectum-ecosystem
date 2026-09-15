import type { Request, Response } from "express";
import { error500, send } from "@/helpers/return";
import type {
  IAdminCommunitySuggestionArchiveDTO,
  IAdminCommunitySuggestionBlockCreateDTO,
  IAdminCommunitySuggestionBlockUpdateDTO,
  IAdminCommunitySuggestionMoveDTO,
  IAdminCommunitySuggestionsDTO,
} from "../DTOs/IAdminModerationDTO";
import {
  archiveCommunitySuggestion as archiveCommunitySuggestionService,
  createCommunitySuggestionBlock as createCommunitySuggestionBlockService,
  getSummary,
  listCommunitySuggestions as listCommunitySuggestionsService,
  listEvents,
  listOperationalAlerts,
  moveCommunitySuggestion as moveCommunitySuggestionService,
  resolveEvent,
  resolveReport,
  reviewEvent,
  showEvent,
  updateCommunitySuggestionBlock as updateCommunitySuggestionBlockService,
} from "./services";

const communitySuggestionsDto = (req: Request): IAdminCommunitySuggestionsDTO => ({
  admin: req.admin,
  auth: req.auth,
  q: req.q,
});

const communitySuggestionBlockCreateDto = (
  req: Request,
): IAdminCommunitySuggestionBlockCreateDTO => ({
  admin: req.admin,
  auth: req.auth,
  b: req.b,
});

const communitySuggestionBlockUpdateDto = (
  req: Request,
): IAdminCommunitySuggestionBlockUpdateDTO => ({
  admin: req.admin,
  auth: req.auth,
  b: req.b,
  p: req.p,
});

const communitySuggestionMoveDto = (req: Request): IAdminCommunitySuggestionMoveDTO => ({
  admin: req.admin,
  auth: req.auth,
  b: req.b,
  p: req.p,
});

const communitySuggestionArchiveDto = (req: Request): IAdminCommunitySuggestionArchiveDTO => ({
  admin: req.admin,
  auth: req.auth,
  p: req.p,
});

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

export const communitySuggestions = async (req: Request, res: Response) => {
  try {
    const resolve = await listCommunitySuggestionsService(communitySuggestionsDto(req));
    return send(res, resolve);
  } catch (err) {
    return error500(res, "admin_community_suggestions", err);
  }
};

export const communitySuggestionBlockCreate = async (req: Request, res: Response) => {
  try {
    const resolve = await createCommunitySuggestionBlockService(
      communitySuggestionBlockCreateDto(req),
    );
    return send(res, resolve);
  } catch (err) {
    return error500(res, "admin_community_suggestion_block_create", err);
  }
};

export const communitySuggestionBlockUpdate = async (req: Request, res: Response) => {
  try {
    const resolve = await updateCommunitySuggestionBlockService(
      communitySuggestionBlockUpdateDto(req),
    );
    return send(res, resolve);
  } catch (err) {
    return error500(res, "admin_community_suggestion_block_update", err);
  }
};

export const communitySuggestionMove = async (req: Request, res: Response) => {
  try {
    const resolve = await moveCommunitySuggestionService(communitySuggestionMoveDto(req));
    return send(res, resolve);
  } catch (err) {
    return error500(res, "admin_community_suggestion_move", err);
  }
};

export const communitySuggestionArchive = async (req: Request, res: Response) => {
  try {
    const resolve = await archiveCommunitySuggestionService(communitySuggestionArchiveDto(req));
    return send(res, resolve);
  } catch (err) {
    return error500(res, "admin_community_suggestion_archive", err);
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

export const reportResolve = async (req: Request, res: Response) => {
  try {
    const resolveResult = await resolveReport(req as Parameters<typeof resolveReport>[0]);
    return send(res, resolveResult);
  } catch (err) {
    return error500(res, "admin_moderation_report_resolve", err);
  }
};
