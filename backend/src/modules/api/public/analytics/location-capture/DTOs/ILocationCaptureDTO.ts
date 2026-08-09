export type DeviceType = "mobile" | "tablet" | "desktop" | "unknown";
export type NormalizedOs =
  | "android"
  | "chromeos"
  | "ios"
  | "linux"
  | "macos"
  | "unknown"
  | "windows";
export type NormalizedBrowser =
  | "chrome"
  | "edge"
  | "firefox"
  | "opera"
  | "safari"
  | "samsung"
  | "unknown";

export interface ILocationCaptureDTO {
  p: Record<string, never>;
  q: Record<string, never>;
  b: {
    visitor_id: string;
    session_id?: string;
    device_type?: DeviceType;
    os?: NormalizedOs;
    browser?: NormalizedBrowser;
    viewport_width?: number;
    viewport_height?: number;
  };
}

export type LocationSource = "ip";

export type StoreVisitorLocationInput = {
  visitorId: string;
  sessionId?: string | null;
  userId?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  source: LocationSource;
  confidence?: number | null;
  provider?: string | null;
};

export type FindRecentVisitorLocationInput = {
  visitorId: string;
  userId?: string | null;
  since: Date;
};

export type UpsertVisitorSessionInput = {
  visitorId: string;
  sessionId: string;
  userId?: string | null;
  deviceType?: DeviceType;
  os?: NormalizedOs;
  browser?: NormalizedBrowser;
  viewportWidth?: number;
  viewportHeight?: number;
};

export type LocationResolution = {
  city?: string | null;
  state?: string | null;
  country?: string | null;
  source: LocationSource;
  confidence?: number | null;
  provider?: string | null;
};

export type LocationCaptureResult = {
  captured: boolean;
  linked: boolean;
  authenticated: boolean;
  reason?: "frequency" | "unavailable" | "invalid_ip";
};
