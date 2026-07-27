export const PATIENT_SIGNUP_ANALYTICS_IDENTITY_TYPE = "patient_signup_analytics_identity";

const ANALYTICS_ID_MAX_LENGTH = 160;

export type SignupAnalyticsIdentityInput = {
  analytics_session_id?: string | null;
  analytics_visitor_id?: string | null;
};

export type SignupAnalyticsIdentity = {
  session_id?: string;
  visitor_id: string;
};

const normalizeAnalyticsId = (value: unknown) => {
  if (typeof value !== "string") return null;

  const normalized = value.trim();
  if (!normalized || normalized.length > ANALYTICS_ID_MAX_LENGTH) return null;
  if (!/^[a-zA-Z0-9:_-]+$/.test(normalized)) return null;

  return normalized;
};

export const resolveSignupAnalyticsIdentity = (
  input: SignupAnalyticsIdentityInput,
): SignupAnalyticsIdentity | null => {
  const visitorId = normalizeAnalyticsId(input.analytics_visitor_id);
  const sessionId = normalizeAnalyticsId(input.analytics_session_id);

  if (!visitorId) return null;

  return {
    ...(sessionId ? { session_id: sessionId } : {}),
    visitor_id: visitorId,
  };
};

export const buildPatientSignupAnalyticsIdentityData = (params: {
  identity: SignupAnalyticsIdentity;
  source: "google_registration" | "patient_registration";
}) => ({
  captured_at: new Date().toISOString(),
  role: "paciente",
  source: params.source,
  visitor_id: params.identity.visitor_id,
  ...(params.identity.session_id ? { session_id: params.identity.session_id } : {}),
});

export const extractPatientSignupAnalyticsVisitorId = (data: unknown) => {
  if (!data || Array.isArray(data) || typeof data !== "object") return null;

  return normalizeAnalyticsId((data as Record<string, unknown>).visitor_id);
};
