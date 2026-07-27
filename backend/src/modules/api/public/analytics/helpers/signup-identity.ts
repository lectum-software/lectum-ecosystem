export const PATIENT_SIGNUP_ANALYTICS_IDENTITY_TYPE = "patient_signup_analytics_identity";
export const PSYCHOLOGIST_SIGNUP_ANALYTICS_IDENTITY_TYPE = "psychologist_signup_analytics_identity";

const ANALYTICS_ID_MAX_LENGTH = 160;

type SignupAnalyticsIdentityRole = "paciente" | "psicologo";
type SignupAnalyticsIdentitySource =
  | "google_registration"
  | "patient_registration"
  | "psychologist_registration";

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

const buildSignupAnalyticsIdentityData = (params: {
  identity: SignupAnalyticsIdentity;
  role: SignupAnalyticsIdentityRole;
  source: SignupAnalyticsIdentitySource;
}) => ({
  captured_at: new Date().toISOString(),
  role: params.role,
  source: params.source,
  visitor_id: params.identity.visitor_id,
  ...(params.identity.session_id ? { session_id: params.identity.session_id } : {}),
});

export const buildPatientSignupAnalyticsIdentityData = (params: {
  identity: SignupAnalyticsIdentity;
  source: "google_registration" | "patient_registration";
}) =>
  buildSignupAnalyticsIdentityData({
    identity: params.identity,
    role: "paciente",
    source: params.source,
  });

export const buildPsychologistSignupAnalyticsIdentityData = (params: {
  identity: SignupAnalyticsIdentity;
  source: "google_registration" | "psychologist_registration";
}) =>
  buildSignupAnalyticsIdentityData({
    identity: params.identity,
    role: "psicologo",
    source: params.source,
  });

const extractSignupAnalyticsVisitorId = (data: unknown) => {
  if (!data || Array.isArray(data) || typeof data !== "object") return null;

  return normalizeAnalyticsId((data as Record<string, unknown>).visitor_id);
};

export const extractPatientSignupAnalyticsVisitorId = extractSignupAnalyticsVisitorId;
export const extractPsychologistSignupAnalyticsVisitorId = extractSignupAnalyticsVisitorId;
