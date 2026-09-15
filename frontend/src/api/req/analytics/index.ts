import { USER_COOKIE_AUTH_HEADERS } from "@/api/auth-cookie";
import { callEndpoint } from "@/api/generator";
import { handleReq } from "@/api/handle";
import { getBearerToken } from "@/hooks/cookies/token";
import { getPublicApiSource } from "@/utils/public-asset-sources";

export type LocationCaptureRequest = {
  visitor_id: string;
  session_id?: string;
  device_type?: "desktop" | "mobile" | "tablet" | "unknown";
  os?: "android" | "chromeos" | "ios" | "linux" | "macos" | "unknown" | "windows";
  browser?: "chrome" | "edge" | "firefox" | "opera" | "safari" | "samsung" | "unknown";
  viewport_width?: number;
  viewport_height?: number;
};

export type LocationCaptureResponse = {
  captured: boolean;
  linked: boolean;
  authenticated: boolean;
  reason?: "frequency" | "unavailable" | "invalid_ip";
};

export const captureVisitorLocation = async (body: LocationCaptureRequest) => {
  const handle = callEndpoint({
    route: "/api/public/analytics/location-capture",
    method: "POST",
    body,
  });

  return handleReq<LocationCaptureResponse>({
    ...handle,
    hideError: true,
    signOutOnUnauthorized: false,
  });
};

export type DisplayMode = "browser" | "standalone" | "fullscreen" | "minimal-ui" | "unknown";

export type PageViewTrackingRequest = {
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
  display_mode?: DisplayMode;
  occurred_at?: string;
};

export type PageViewTrackingResponse = {
  tracked: boolean;
  id: string | null;
};

export type PageViewDurationRequest = {
  visitor_id: string;
  session_id: string;
  duration_seconds: number;
  occurred_at?: string;
};

export type PageViewDurationResponse = {
  updated: boolean;
};

export type ImportantActionTrackingRequest = {
  visitor_id: string;
  session_id: string;
  action_type:
    | "psychologist_directory_filter_search"
    | "psychologist_profile_publications_tab_open"
    | "psychologist_profile_reviews_tab_open"
    | "psychologist_video_favorite"
    | "psychologist_video_profile_access"
    | "psychologist_video_share"
    | "psychologist_video_whatsapp_click"
    | "pwa_install_prompt_accepted"
    | "pwa_installed"
    | "whatsapp_click";
  path?: string;
  page_kind?: string;
  target_id?: string;
  target_type?: string;
  display_mode?: DisplayMode;
  occurred_at?: string;
};

export type ImportantActionTrackingResponse = {
  tracked: boolean;
};

export type ContentVideoWatchTargetType = "post" | "reply";

export type ContentVideoWatchTrackingRequest = {
  visitor_id: string;
  session_id: string;
  target_type: ContentVideoWatchTargetType;
  target_id: string;
  video_url?: string | null;
  duration_seconds?: number | null;
  watched_seconds?: number | null;
  max_position_seconds?: number | null;
  replay_count?: number | null;
  completed?: boolean;
  retention_buckets?: number[];
};

export type ContentVideoWatchTrackingResponse = {
  tracked: boolean;
  skipped_reason?: "self_view" | "session_unavailable" | null;
};

export type ContentAttentionTargetType = "post" | "reply";

export type ContentAttentionTrackingRequest = {
  visitor_id: string;
  session_id: string;
  target_type: ContentAttentionTargetType;
  target_id: string;
  attention_seconds: number;
  path?: string | null;
};

export type ContentAttentionTrackingResponse = {
  tracked: boolean;
  skipped_reason?: "self_view" | "session_unavailable" | null;
};

export const trackPageView = async (body: PageViewTrackingRequest) => {
  const handle = callEndpoint({
    route: "/api/public/analytics/page-view",
    method: "POST",
    body,
  });

  return handleReq<PageViewTrackingResponse>({
    ...handle,
    hideError: true,
    signOutOnUnauthorized: false,
  });
};

export const updatePageViewDuration = async (id: string, body: PageViewDurationRequest) => {
  const handle = callEndpoint({
    route: "/api/public/analytics/page-view/:id/duration",
    method: "POST",
    params: { id },
    body,
  });

  return handleReq<PageViewDurationResponse>({
    ...handle,
    hideError: true,
    signOutOnUnauthorized: false,
  });
};

export const trackImportantAction = async (body: ImportantActionTrackingRequest) => {
  const handle = callEndpoint({
    route: "/api/public/analytics/action",
    method: "POST",
    body,
  });

  return handleReq<ImportantActionTrackingResponse>({
    ...handle,
    hideError: true,
    signOutOnUnauthorized: false,
  });
};

export const trackContentVideoWatch = async (body: ContentVideoWatchTrackingRequest) => {
  const handle = callEndpoint({
    route: "/api/public/analytics/content-video-watch",
    method: "POST",
    body,
  });

  return handleReq<ContentVideoWatchTrackingResponse>({
    ...handle,
    hideError: true,
    signOutOnUnauthorized: false,
  });
};

export const trackContentAttention = async (body: ContentAttentionTrackingRequest) => {
  const handle = callEndpoint({
    route: "/api/public/analytics/content-attention",
    method: "POST",
    body,
  });

  return handleReq<ContentAttentionTrackingResponse>({
    ...handle,
    hideError: true,
    signOutOnUnauthorized: false,
  });
};

const sendAnalyticsKeepalive = (
  path: string,
  body:
    | PageViewDurationRequest
    | ContentVideoWatchTrackingRequest
    | ContentAttentionTrackingRequest,
  authenticated = false,
) => {
  if (typeof window === "undefined") return false;

  const apiUrl = getPublicApiSource()?.origin;
  if (!apiUrl) return false;

  try {
    const token = authenticated ? getBearerToken() : undefined;
    const request = fetch(`${apiUrl}${path}`, {
      body: JSON.stringify(body),
      credentials: authenticated ? "include" : undefined,
      headers: {
        "Accept-Language": "pt",
        "Content-Type": "application/json",
        ...(authenticated ? USER_COOKIE_AUTH_HEADERS : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      keepalive: true,
      method: "POST",
    });

    void request.catch(() => undefined);
    return true;
  } catch {
    return false;
  }
};

export const sendPageViewDurationBeacon = (id: string, body: PageViewDurationRequest) => {
  return sendAnalyticsKeepalive(
    `/api/public/analytics/page-view/${encodeURIComponent(id)}/duration`,
    body,
  );
};

export const sendContentVideoWatchBeacon = (body: ContentVideoWatchTrackingRequest) => {
  return sendAnalyticsKeepalive("/api/public/analytics/content-video-watch", body, true);
};

export const sendContentAttentionBeacon = (body: ContentAttentionTrackingRequest) => {
  return sendAnalyticsKeepalive("/api/public/analytics/content-attention", body, true);
};
