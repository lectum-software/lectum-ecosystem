export type LocationCaptureCompletion = {
  authenticated: boolean;
  captured: boolean;
  linked: boolean;
  reason?: "frequency" | "invalid_ip" | "unavailable";
};

export const LOCATION_CAPTURE_RETRY_DELAYS_MS = [5_000, 30_000, 120_000] as const;

export const getLocationCaptureRetryDelay = (retryCount: number) => {
  if (!Number.isInteger(retryCount) || retryCount < 0) return null;

  return LOCATION_CAPTURE_RETRY_DELAYS_MS[retryCount] ?? null;
};

export const shouldRememberLocationCapture = (response: LocationCaptureCompletion) => {
  return response.captured || response.reason === "frequency";
};

export const shouldRememberAuthenticatedLink = (response: LocationCaptureCompletion) => {
  // `linked: false` também pode significar que o vínculo já existia. Captura ou
  // limite de frequência confirmam que o backend concluiu as etapas anteriores.
  return (
    response.authenticated &&
    (response.linked || response.captured || response.reason === "frequency")
  );
};
