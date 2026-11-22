import type { Request } from "express";
import { msg } from "@/helpers/translate";
import type { user } from "@/interfaces/objects";
import { guestContactCommitted } from "@/modules/marketing/guest-contact";
import { allowsInternalMeasurement } from "@/modules/marketing/internal-measurement";
import { userActionCommitted } from "@/modules/marketing/user-events";
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
  const requestStartedAt = new Date();
  const data = req as Request & IImportantActionDTO;
  const auth = (req as AuthenticatedRequest).auth;
  const repository = new ImportantActionRepository();
  const userId = auth?.id ?? null;
  const whatsapp = ["whatsapp_click", "psychologist_video_whatsapp_click"].includes(
    data.b.action_type,
  );
  if (whatsapp && !(await allowsInternalMeasurement(data.b.measurement_allowed, userId))) {
    return { status: 200, ...msg("important_action_tracked", {}), data: { tracked: false } };
  }
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

  if (userId && session && !whatsapp) {
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

  const action = await repository.create({
    eventId: data.b.event_id,
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

  if (!userId && whatsapp && data.b.guest_token && typeof action.id === "string") {
    await guestContactCommitted({
      token: data.b.guest_token,
      sourceRef: action.id,
      visitorId,
      sessionId,
      sourceUrl: req.get("referer"),
      requestStartedAt,
    });
  }

  const result: ImportantActionResult = {
    tracked: true,
  };

  if (
    auth?.role === "paciente" &&
    typeof action.id === "string" &&
    (data.b.action_type === "whatsapp_click" ||
      data.b.action_type === "psychologist_video_whatsapp_click")
  ) {
    void userActionCommitted("patient_contact", () => ({
      sourceRef: action.id!,
      userId: auth.id!,
      sourceUrl: req.get("referer"),
    }));
  }

  return {
    status: 200,
    ...msg("important_action_tracked", {}),
    data: result,
  };
};
