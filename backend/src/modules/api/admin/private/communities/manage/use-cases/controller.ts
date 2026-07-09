import type { NextFunction, Request, Response } from "express";
import { error500, send } from "@/helpers/return";
import {
  createRule as createRuleService,
  deleteRule as deleteRuleService,
  listRules as listRulesService,
  showCommunity as showCommunityService,
  updateCommunity as updateCommunityService,
  updateRule as updateRuleService,
  uploadCommunityAvatar as uploadCommunityAvatarService,
} from "./services";

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
