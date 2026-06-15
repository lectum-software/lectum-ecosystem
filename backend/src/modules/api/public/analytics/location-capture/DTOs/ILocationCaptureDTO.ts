import type { visitor_location } from "@/interfaces/objects";

export interface ILocationCaptureDTO {
  p: Record<string, never>;
  q: Record<string, never>;
  b: {
    visitor_id: string;
    session_id?: string;
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
  source?: LocationSource;
  location?: Pick<visitor_location, "city" | "state" | "country" | "source" | "confidence">;
};
