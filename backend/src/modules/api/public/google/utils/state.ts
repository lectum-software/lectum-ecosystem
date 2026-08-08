import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
import jwt, { type JwtPayload } from "jsonwebtoken";
import { getJwtSecret, JWT_ALGORITHM } from "@/modules/api/middlewares/_auth/utils/jwt-secret";
import { isProductionRuntime } from "@/utils/runtime-config";

export const GOOGLE_OAUTH_STATE_COOKIE = "lectum_google_oauth_nonce";
const GOOGLE_OAUTH_STATE_AUDIENCE = "lectum-google-oauth";
const GOOGLE_OAUTH_STATE_ISSUER = "lectum-api";
const GOOGLE_OAUTH_STATE_TTL_MS = 10 * 60 * 1000;
const GOOGLE_OAUTH_STATE_VERSION = "v1";
const GOOGLE_OAUTH_STATE_CONTEXT = "lectum-google-oauth-state";
const GOOGLE_OAUTH_STATE_IV_BYTES = 12;
const GOOGLE_OAUTH_STATE_TAG_BYTES = 16;
const GOOGLE_OAUTH_STATE_MAX_LENGTH = 16_384;
const ALLOWED_QUERY_KEYS = new Set([
  "analytics_session_id",
  "analytics_visitor_id",
  "callbackUrl",
  "delete_token",
  "intent",
  "link_token",
  "redirectTo",
  "role",
  "terms_accepted",
  "terms_version",
]);

type GoogleOAuthStatePayload = {
  device_id: string;
  expires_at: number;
  nonce: string;
  query: Record<string, string>;
};

type LegacyGoogleOAuthStatePayload = JwtPayload & Omit<GoogleOAuthStatePayload, "expires_at">;

const hasControlCharacters = (value: string) =>
  Array.from(value).some((character) => {
    const code = character.charCodeAt(0);
    return code <= 31 || code === 127;
  });

const firstString = (value: unknown) => {
  const candidate = Array.isArray(value) ? value[0] : value;
  return typeof candidate === "string" ? candidate.trim() : "";
};

const sanitizeInternalRedirect = (value: string) => {
  if (!value || value.length > 2048 || !value.startsWith("/") || value.startsWith("//")) return "";
  if (value.includes("\\") || hasControlCharacters(value)) return "";

  try {
    const url = new URL(value, "https://lectum.local");
    if (url.origin !== "https://lectum.local") return "";

    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "";
  }
};

const sanitizeGoogleQuery = (query: Record<string, unknown>) => {
  const sanitized: Record<string, string> = {};

  for (const [key, value] of Object.entries(query)) {
    if (!ALLOWED_QUERY_KEYS.has(key)) continue;

    const normalized = firstString(value);
    if (!normalized) continue;

    if (key === "redirectTo" || key === "callbackUrl") {
      const redirect = sanitizeInternalRedirect(normalized);
      if (redirect) sanitized[key] = redirect;
      continue;
    }

    const maxLength = key === "link_token" || key === "delete_token" ? 4096 : 256;
    if (normalized.length <= maxLength) sanitized[key] = normalized;
  }

  return sanitized;
};

export const isValidGoogleDeviceId = (value: string) => /^[a-zA-Z0-9_-]{16,256}$/.test(value);

export const googleOAuthStateCookieOptions = () => ({
  httpOnly: true,
  maxAge: GOOGLE_OAUTH_STATE_TTL_MS,
  path: "/api/public/google/callback",
  sameSite: "lax" as const,
  secure: isProductionRuntime(),
});

export const googleOAuthStateClearCookieOptions = () => {
  const { maxAge: _maxAge, ...options } = googleOAuthStateCookieOptions();
  return options;
};

const getGoogleOAuthStateEncryptionKey = () =>
  createHash("sha256")
    .update(GOOGLE_OAUTH_STATE_CONTEXT)
    .update("\0")
    .update(getJwtSecret())
    .digest();

const hasValidNonce = (expected: string, received: string) => {
  const expectedNonce = Buffer.from(expected);
  const receivedNonce = Buffer.from(received);

  return (
    expectedNonce.length === receivedNonce.length && timingSafeEqual(expectedNonce, receivedNonce)
  );
};

const normalizeStatePayload = (
  payload: unknown,
  cookieNonce: string,
  expiresAt: unknown,
): GoogleOAuthStatePayload | null => {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;

  const record = payload as Record<string, unknown>;
  const deviceId = typeof record.device_id === "string" ? record.device_id : "";
  const nonce = typeof record.nonce === "string" ? record.nonce : "";
  const query = record.query;
  const expiration = Number(expiresAt);

  if (
    !isValidGoogleDeviceId(deviceId) ||
    !nonce ||
    !hasValidNonce(nonce, cookieNonce) ||
    !query ||
    typeof query !== "object" ||
    Array.isArray(query) ||
    !Number.isSafeInteger(expiration) ||
    expiration <= Date.now()
  ) {
    return null;
  }

  return {
    device_id: deviceId,
    expires_at: expiration,
    nonce,
    query: sanitizeGoogleQuery(query as Record<string, unknown>),
  };
};

const encryptGoogleOAuthState = (payload: GoogleOAuthStatePayload) => {
  const iv = randomBytes(GOOGLE_OAUTH_STATE_IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", getGoogleOAuthStateEncryptionKey(), iv);
  cipher.setAAD(Buffer.from(GOOGLE_OAUTH_STATE_CONTEXT));
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(payload), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [
    GOOGLE_OAUTH_STATE_VERSION,
    iv.toString("base64url"),
    encrypted.toString("base64url"),
    tag.toString("base64url"),
  ].join(".");
};

const decryptGoogleOAuthState = (state: string, cookieNonce: string) => {
  const [version, encodedIv, encodedPayload, encodedTag, ...extra] = state.split(".");
  if (
    version !== GOOGLE_OAUTH_STATE_VERSION ||
    !encodedIv ||
    !encodedPayload ||
    !encodedTag ||
    extra.length > 0
  ) {
    return null;
  }

  const iv = Buffer.from(encodedIv, "base64url");
  const encrypted = Buffer.from(encodedPayload, "base64url");
  const tag = Buffer.from(encodedTag, "base64url");

  if (
    iv.length !== GOOGLE_OAUTH_STATE_IV_BYTES ||
    encrypted.length === 0 ||
    tag.length !== GOOGLE_OAUTH_STATE_TAG_BYTES
  ) {
    return null;
  }

  const decipher = createDecipheriv("aes-256-gcm", getGoogleOAuthStateEncryptionKey(), iv);
  decipher.setAAD(Buffer.from(GOOGLE_OAUTH_STATE_CONTEXT));
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
  const payload = JSON.parse(decrypted) as unknown;
  const expiresAt =
    payload && typeof payload === "object" && !Array.isArray(payload)
      ? (payload as Record<string, unknown>).expires_at
      : undefined;

  return normalizeStatePayload(payload, cookieNonce, expiresAt);
};

const verifyLegacyGoogleOAuthState = (state: string, cookieNonce: string) => {
  const payload = jwt.verify(state, getJwtSecret(), {
    algorithms: [JWT_ALGORITHM],
    audience: GOOGLE_OAUTH_STATE_AUDIENCE,
    issuer: GOOGLE_OAUTH_STATE_ISSUER,
  }) as LegacyGoogleOAuthStatePayload;
  const expiresAt = typeof payload.exp === "number" ? payload.exp * 1000 : 0;

  return normalizeStatePayload(payload, cookieNonce, expiresAt);
};

export const createGoogleOAuthState = (deviceId: string, query: Record<string, unknown>) => {
  const nonce = randomBytes(32).toString("base64url");
  const state = encryptGoogleOAuthState({
    device_id: deviceId,
    expires_at: Date.now() + GOOGLE_OAUTH_STATE_TTL_MS,
    nonce,
    query: sanitizeGoogleQuery(query),
  });

  return { nonce, state };
};

export const verifyGoogleOAuthState = (
  state: unknown,
  cookieNonce: unknown,
): GoogleOAuthStatePayload | null => {
  if (
    typeof state !== "string" ||
    typeof cookieNonce !== "string" ||
    state.length === 0 ||
    state.length > GOOGLE_OAUTH_STATE_MAX_LENGTH
  ) {
    return null;
  }

  try {
    return state.startsWith(`${GOOGLE_OAUTH_STATE_VERSION}.`)
      ? decryptGoogleOAuthState(state, cookieNonce)
      : verifyLegacyGoogleOAuthState(state, cookieNonce);
  } catch {
    return null;
  }
};
