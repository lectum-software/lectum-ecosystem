import type { page_view_event } from "@/interfaces/objects";
import type { AnalyticsDisplayMode } from "../../helpers/tracking";

export interface IPageViewCreateDTO {
  p: Record<string, never>;
  q: Record<string, never>;
  b: {
    visitor_id: string;
    session_id: string;
    path: string;
    title?: string;
    referrer?: string;
    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string;
    utm_content?: string;
    utm_term?: string;
    display_mode?: AnalyticsDisplayMode;
    occurred_at?: string;
  };
}

export interface IPageViewDurationDTO {
  p: {
    id: string;
  };
  q: Record<string, never>;
  b: {
    visitor_id: string;
    session_id: string;
    duration_seconds: number;
    occurred_at?: string;
  };
}

export type CreatePageViewInput = {
  visitorId: string;
  sessionId: string;
  userId?: string | null;
  path: string;
  normalizedPath: string;
  title?: string | null;
  referrerHost?: string | null;
  trafficSource: string;
  trafficMedium?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  utmContent?: string | null;
  utmTerm?: string | null;
  pageKind: string;
  targetType?: string | null;
  targetId?: string | null;
  displayMode: AnalyticsDisplayMode;
  isEntry: boolean;
  entryPath?: string | null;
  occurredAt: Date;
};

export type PageViewDurationInput = {
  id: string;
  visitorId: string;
  sessionId: string;
  durationSeconds: number;
};

export type PageViewTrackingResult = {
  tracked: boolean;
  id: string | null;
  visitor_id: string;
  session_id: string;
  user_id: string | null;
  path: string;
  normalized_path: string;
  page_kind: string;
  target_type: string | null;
  target_id: string | null;
  traffic_source: string;
  traffic_medium: string | null;
  referrer_host: string | null;
  display_mode: AnalyticsDisplayMode;
  is_entry: boolean;
  entry_path: string | null;
};

export type PageViewDurationResult = {
  updated: boolean;
  id: string | null;
  duration_seconds: number | null;
};

export type PageViewEntry = Pick<page_view_event, "entry_path" | "id" | "path"> | null;
