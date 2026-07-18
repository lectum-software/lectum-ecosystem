import type { NextFunction, Request, Response } from "express";
import { error500, send } from "@/helpers/return";
import {
  createCommunity as createCommunityService,
  createRule as createRuleService,
  deleteRule as deleteRuleService,
  listActivities as listActivitiesService,
  listCommunities as listCommunitiesService,
  listContent as listContentService,
  listRanking as listRankingService,
  listReports as listReportsService,
  listRules as listRulesService,
  removeContent as removeContentService,
  resolveReports as resolveReportsService,
  showCommunity as showCommunityService,
  showContentDetail as showContentDetailService,
  showStatistics as showStatisticsService,
  updateCommunity as updateCommunityService,
  updateCommunityStatus as updateCommunityStatusService,
  updateRule as updateRuleService,
  uploadCommunityAvatar as uploadCommunityAvatarService,
} from "./services";

export const list = async (req: Request, res: Response) => {
  try {
    const resolve = await listCommunitiesService(
      req as unknown as Parameters<typeof listCommunitiesService>[0],
    );

    return send(res, resolve);
  } catch (err) {
    return error500(res, "admin_communities_list", err);
  }
};

export const show = async (req: Request, res: Response) => {
  try {
    const resolve = await showCommunityService(
      req as unknown as Parameters<typeof showCommunityService>[0],
    );

    return send(res, resolve);
  } catch (err) {
    return error500(res, "admin_community_show", err);
  }
};

export const statistics = async (req: Request, res: Response) => {
  try {
    const resolve = await showStatisticsService(
      req as unknown as Parameters<typeof showStatisticsService>[0],
    );

    return send(res, resolve);
  } catch (err) {
    return error500(res, "admin_community_statistics", err);
  }
};

export const create = async (req: Request, res: Response) => {
  try {
    const resolve = await createCommunityService(
      req as unknown as Parameters<typeof createCommunityService>[0],
    );

    return send(res, resolve);
  } catch (err) {
    return error500(res, "admin_community_create", err);
  }
};

export const update = async (req: Request, res: Response) => {
  try {
    const resolve = await updateCommunityService(
      req as unknown as Parameters<typeof updateCommunityService>[0],
    );

    return send(res, resolve);
  } catch (err) {
    return error500(res, "admin_community_update", err);
  }
};

export const status = async (req: Request, res: Response) => {
  try {
    const resolve = await updateCommunityStatusService(
      req as unknown as Parameters<typeof updateCommunityStatusService>[0],
    );

    return send(res, resolve);
  } catch (err) {
    return error500(res, "admin_community_status", err);
  }
};

export const authorizeAvatarUpload = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const resolve = await showCommunityService(
      req as unknown as Parameters<typeof showCommunityService>[0],
    );

    if (resolve.status && resolve.status >= 400) return send(res, resolve);

    return next();
  } catch (err) {
    return error500(res, "admin_community_avatar_authorize", err);
  }
};

export const avatar = async (req: Request, res: Response) => {
  try {
    const resolve = await uploadCommunityAvatarService(
      req as unknown as Parameters<typeof uploadCommunityAvatarService>[0],
    );

    return send(res, resolve);
  } catch (err) {
    return error500(res, "admin_community_avatar", err);
  }
};

export const rules = async (req: Request, res: Response) => {
  try {
    const resolve = await listRulesService(
      req as unknown as Parameters<typeof listRulesService>[0],
    );

    return send(res, resolve);
  } catch (err) {
    return error500(res, "admin_community_rules", err);
  }
};

export const createRule = async (req: Request, res: Response) => {
  try {
    const resolve = await createRuleService(
      req as unknown as Parameters<typeof createRuleService>[0],
    );

    return send(res, resolve);
  } catch (err) {
    return error500(res, "admin_community_rule_create", err);
  }
};

export const updateRule = async (req: Request, res: Response) => {
  try {
    const resolve = await updateRuleService(
      req as unknown as Parameters<typeof updateRuleService>[0],
    );

    return send(res, resolve);
  } catch (err) {
    return error500(res, "admin_community_rule_update", err);
  }
};

export const deleteRule = async (req: Request, res: Response) => {
  try {
    const resolve = await deleteRuleService(
      req as unknown as Parameters<typeof deleteRuleService>[0],
    );

    return send(res, resolve);
  } catch (err) {
    return error500(res, "admin_community_rule_delete", err);
  }
};

export const content = async (req: Request, res: Response) => {
  try {
    const resolve = await listContentService(
      req as unknown as Parameters<typeof listContentService>[0],
    );

    return send(res, resolve);
  } catch (err) {
    return error500(res, "admin_community_content", err);
  }
};

export const contentDetail = async (req: Request, res: Response) => {
  try {
    const resolve = await showContentDetailService(
      req as unknown as Parameters<typeof showContentDetailService>[0],
    );

    return send(res, resolve);
  } catch (err) {
    return error500(res, "admin_community_content_detail", err);
  }
};

export const removeContent = async (req: Request, res: Response) => {
  try {
    const resolve = await removeContentService(
      req as unknown as Parameters<typeof removeContentService>[0],
    );

    return send(res, resolve);
  } catch (err) {
    return error500(res, "admin_community_content_remove", err);
  }
};

export const ranking = async (req: Request, res: Response) => {
  try {
    const resolve = await listRankingService(
      req as unknown as Parameters<typeof listRankingService>[0],
    );

    return send(res, resolve);
  } catch (err) {
    return error500(res, "admin_community_ranking", err);
  }
};

export const reports = async (req: Request, res: Response) => {
  try {
    const resolve = await listReportsService(
      req as unknown as Parameters<typeof listReportsService>[0],
    );

    return send(res, resolve);
  } catch (err) {
    return error500(res, "admin_community_reports", err);
  }
};

export const resolveReports = async (req: Request, res: Response) => {
  try {
    const resolve = await resolveReportsService(
      req as unknown as Parameters<typeof resolveReportsService>[0],
    );

    return send(res, resolve);
  } catch (err) {
    return error500(res, "admin_community_reports_resolve", err);
  }
};

export const activities = async (req: Request, res: Response) => {
  try {
    const resolve = await listActivitiesService(
      req as unknown as Parameters<typeof listActivitiesService>[0],
    );

    return send(res, resolve);
  } catch (err) {
    return error500(res, "admin_community_activities", err);
  }
};
