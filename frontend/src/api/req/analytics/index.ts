import { callEndpoint } from "@/api/generator";
import { handleReq } from "@/api/handle";

export type LocationCaptureRequest = {
  visitor_id: string;
  session_id?: string;
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
