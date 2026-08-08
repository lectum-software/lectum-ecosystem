import { callEndpoint } from "@/api/generator";
import { handleReq } from "@/api/handle";
import { getBearerToken } from "@/hooks/cookies/token";

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
  source?: "ip";
  location?: {
    city?: string | null;
    state?: string | null;
    country?: string | null;
    source?: string | null;
    confidence?: number | null;
  };
  session?: {
    captured: boolean;
    device_type: LocationCaptureRequest["device_type"];
    reason?: "missing_session_id";
    data?: {
      id?: string | null;
      visitor_id?: string | null;
      session_id?: string | null;
      user_id?: string | null;
      device_type?: LocationCaptureRequest["device_type"] | null;
      os?: LocationCaptureRequest["os"] | null;
      browser?: LocationCaptureRequest["browser"] | null;
      viewport_width?: number | null;
      viewport_height?: number | null;
      first_seen_at?: string | null;
      last_seen_at?: string | null;
    };
  };
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
  display_mode: DisplayMode;
  is_entry: boolean;
  entry_path: string | null;
};

export type PageViewDurationRequest = {
  visitor_id: string;
  session_id: string;
  duration_seconds: number;
  occurred_at?: string;
};

export type PageViewDurationResponse = {
  updated: boolean;
  id: string | null;
  duration_seconds: number | null;
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
  id: string | null;
  visitor_id: string;
  session_id: string;
  user_id: string | null;
  action_type: ImportantActionTrackingRequest["action_type"];
  path: string | null;
  page_kind: string;
  target_type: string | null;
  target_id: string | null;
  display_mode: DisplayMode;
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
  id: string | null;
  visitor_id: string;
  session_id: string;
  user_id: string | null;
  target_type: ContentVideoWatchTargetType;
  target_id: string;
  completed: boolean;
  skipped_reason?: "self_view" | null;
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
  id: string | null;
  visitor_id: string;
  session_id: string;
  user_id: string | null;
  target_type: ContentAttentionTargetType;
  target_id: string;
  attention_seconds: number;
  skipped_reason?: "self_view" | null;
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

export const sendPageViewDurationBeacon = (id: string, body: PageViewDurationRequest) => {
  if (typeof window === "undefined") return false;

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
  const url = `${apiUrl}/api/public/analytics/page-view/${encodeURIComponent(id)}/duration`;
  const payload = JSON.stringify(body);

  try {
    void fetch(url, {
      body: payload,
      headers: {
        "Content-Type": "application/json",
      },
      keepalive: true,
      method: "POST",
    });

    return true;
  } catch {
    return false;
  }
};
export const sendContentVideoWatchBeacon = (body: ContentVideoWatchTrackingRequest) => {
  if (typeof window === "undefined") return false;

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
  const url = `${apiUrl}/api/public/analytics/content-video-watch`;
  const token = getBearerToken();
  const payload = JSON.stringify(body);

  try {
    void fetch(url, {
      body: payload,
      credentials: "include",
      headers: {
        "Accept-Language": "pt",
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      keepalive: true,
      method: "POST",
    });

    return true;
  } catch {
    return false;
  }
};

export const sendContentAttentionBeacon = (body: ContentAttentionTrackingRequest) => {
  if (typeof window === "undefined") return false;

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
  const url = `${apiUrl}/api/public/analytics/content-attention`;
  const token = getBearerToken();
  const payload = JSON.stringify(body);

  try {
    void fetch(url, {
      body: payload,
      credentials: "include",
      headers: {
        "Accept-Language": "pt",
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      keepalive: true,
      method: "POST",
    });

    return true;
  } catch {
    return false;
  }
};
