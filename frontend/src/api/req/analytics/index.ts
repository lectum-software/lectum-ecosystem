import { callEndpoint } from "@/api/generator";
import { handleReq } from "@/api/handle";

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
