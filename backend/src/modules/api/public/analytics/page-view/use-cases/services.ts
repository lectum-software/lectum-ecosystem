import type { Request } from "express";
import { msg } from "@/helpers/translate";
import type { user } from "@/interfaces/objects";
import {
  derivePageTarget,
  normalizeAnalyticsSlug,
  normalizeDisplayMode,
  normalizeOccurredAt,
  normalizePathForAggregation,
  normalizeTraffic,
  sanitizePath,
  sanitizeString,
} from "../../helpers/tracking";
import type {
  IPageViewCreateDTO,
  IPageViewDurationDTO,
  PageViewDurationResult,
  PageViewTrackingResult,
} from "../DTOs/IPageViewTrackingDTO";
import { PageViewTrackingRepository } from "../repositories/PageViewTrackingRepository";

type AuthenticatedRequest = Request & { auth?: user };

const MAX_DURATION_SECONDS = 24 * 60 * 60;

const readUtmFromPath = (path: string, key: string) => {
  try {
    const parsed =
      path.startsWith("http://") || path.startsWith("https://")
        ? new URL(path)
        : new URL(path, "https://lectum.local");

    return parsed.searchParams.get(key);
  } catch {
    return null;
  }
};

const getUtm = (body: IPageViewCreateDTO["b"], key: keyof IPageViewCreateDTO["b"]) => {
  const value = body[key];
  if (typeof value === "string" && value.trim()) return value;

  return readUtmFromPath(body.path, key);
};

const normalizeDuration = (value: number) => {
  if (!Number.isFinite(value) || value < 0) return 0;

  return Math.min(Math.round(value), MAX_DURATION_SECONDS);
};

export const create = async (req: Request) => {
  const data = req as Request & IPageViewCreateDTO;
  const auth = (req as AuthenticatedRequest).auth;
  const repository = new PageViewTrackingRepository();
  const userId = auth?.id ?? null;
  const visitorId = data.b.visitor_id;
  const sessionId = data.b.session_id;
  const path = sanitizePath(data.b.path);
  const utmSource = normalizeAnalyticsSlug(getUtm(data.b, "utm_source"));
  const utmMedium = normalizeAnalyticsSlug(getUtm(data.b, "utm_medium"));
  const utmCampaign = normalizeAnalyticsSlug(getUtm(data.b, "utm_campaign"));
  const utmContent = normalizeAnalyticsSlug(getUtm(data.b, "utm_content"));
  const utmTerm = normalizeAnalyticsSlug(getUtm(data.b, "utm_term"));
  const traffic = normalizeTraffic(req, data.b.referrer, utmSource, utmMedium);
  const target = derivePageTarget(path);
  const sessionEntry = await repository.findSessionEntry(visitorId, sessionId);
  const isEntry = !sessionEntry;
  const entryPath = sessionEntry?.entry_path || sessionEntry?.path || path;

  if (userId) {
    await Promise.all([
      repository.linkPageViewsToUser(visitorId, userId),
      repository.linkSessionsToUser(visitorId, userId),
    ]);
  }

  await repository.upsertSession(visitorId, sessionId, userId);

  const event = await repository.create({
    visitorId,
    sessionId,
    userId,
    path,
    normalizedPath: normalizePathForAggregation(path),
    title: sanitizeString(data.b.title, 180),
    referrerHost: traffic.referrerHost,
    trafficSource: traffic.trafficSource,
    trafficMedium: traffic.trafficMedium,
    utmSource,
    utmMedium,
    utmCampaign,
    utmContent,
    utmTerm,
    pageKind: target.pageKind,
    targetType: target.targetType,
    targetId: target.targetId,
    displayMode: normalizeDisplayMode(data.b.display_mode),
    isEntry,
    entryPath,
    occurredAt: normalizeOccurredAt(data.b.occurred_at),
  });

  const result: PageViewTrackingResult = {
    tracked: true,
    id: event.id ?? null,
    visitor_id: visitorId,
    session_id: sessionId,
    user_id: userId,
    path: event.path ?? path,
    normalized_path: event.normalized_path ?? normalizePathForAggregation(path),
    page_kind: event.page_kind ?? target.pageKind,
    target_type: event.target_type ?? null,
    target_id: event.target_id ?? null,
    traffic_source: event.traffic_source ?? traffic.trafficSource,
    traffic_medium: event.traffic_medium ?? null,
    referrer_host: event.referrer_host ?? null,
    display_mode: normalizeDisplayMode(event.display_mode),
    is_entry: Boolean(event.is_entry),
    entry_path: event.entry_path ?? null,
  };

  return {
    status: 200,
    ...msg("page_view_tracked", {}),
    data: result,
  };
};

export const updateDuration = async (req: Request) => {
  const data = req as Request & IPageViewDurationDTO;
  const repository = new PageViewTrackingRepository();
  const durationSeconds = normalizeDuration(data.b.duration_seconds);

  const event = await repository.updateDuration({
    id: data.p.id,
    visitorId: data.b.visitor_id,
    sessionId: data.b.session_id,
    durationSeconds,
  });

  const result: PageViewDurationResult = {
    updated: Boolean(event),
    id: event?.id ?? null,
    duration_seconds: event?.duration_seconds ?? null,
  };

  return {
    status: 200,
    ...msg("page_view_duration_updated", {}),
    data: result,
  };
};
