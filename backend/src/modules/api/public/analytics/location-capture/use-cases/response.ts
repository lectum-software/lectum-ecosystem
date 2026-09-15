import type { LocationCaptureResult } from "../DTOs/ILocationCaptureDTO";

export const buildLocationCaptureResult = (
  result: LocationCaptureResult,
): LocationCaptureResult => ({
  authenticated: result.authenticated,
  captured: result.captured,
  linked: result.linked,
  ...(result.reason ? { reason: result.reason } : {}),
});
