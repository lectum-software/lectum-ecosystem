import type { Request } from "express";
import { msg } from "@/helpers/translate";
import type { user } from "@/interfaces/objects";
import { sanitizeAnalyticsPathWithTrafficQuery } from "@/utils/analytics-traffic-path";
import {
  derivePageTarget,
  normalizeDisplayMode,
  normalizeOccurredAt,
} from "../../helpers/tracking";
import type { IImportantActionDTO, ImportantActionResult } from "../DTOs/IImportantActionDTO";
import { ImportantActionRepository } from "../repositories/ImportantActionRepository";

type AuthenticatedRequest = Request & { auth?: user };

export const store = async (req: Request) => {
  const data = req as Request & IImportantActionDTO;
  const auth = (req as AuthenticatedRequest).auth;
  const repository = new ImportantActionRepository();
  const userId = auth?.id ?? null;
  const visitorId = data.b.visitor_id;
  const sessionId = data.b.session_id;
  const path = data.b.path ? sanitizeAnalyticsPathWithTrafficQuery(data.b.path) : null;
  const derivedTarget = derivePageTarget(path || "/");
  const explicitTargetType = data.b.target_type?.trim() || null;
  const explicitTargetId = data.b.target_id?.trim() || null;
  const explicitPageKind = data.b.page_kind?.trim() || null;
  const pageKind =
    explicitPageKind ||
    (explicitTargetType &&
    ["community_post", "post_reply", "post", "reply"].includes(explicitTargetType)
      ? "community_post"
      : derivedTarget.pageKind);
  const targetType = explicitTargetType ?? derivedTarget.targetType;
  const targetId = explicitTargetId ?? derivedTarget.targetId;

  const session = await repository.upsertSession(visitorId, sessionId, userId);

  if (userId && session) {
    await Promise.all([
      repository.linkActionsToUser(visitorId, userId),
      repository.linkSessionsToUser(visitorId, userId),
    ]);
  }

  if (!session) {
    const result: ImportantActionResult = {
      tracked: false,
    };

    return {
      status: 200,
      ...msg("important_action_tracked", {}),
      data: result,
    };
  }

  await repository.create({
    visitorId,
    sessionId,
    userId,
    actionType: data.b.action_type,
    path,
    pageKind,
    targetType,
    targetId,
    displayMode: normalizeDisplayMode(data.b.display_mode),
    occurredAt: normalizeOccurredAt(data.b.occurred_at),
  });

  const result: ImportantActionResult = {
    tracked: true,
  };

  return {
    status: 200,
    ...msg("important_action_tracked", {}),
    data: result,
  };
};
