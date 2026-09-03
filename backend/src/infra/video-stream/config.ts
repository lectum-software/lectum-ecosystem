import { createPrivateKey, type KeyObject } from "node:crypto";
import { parsePublicHttpOrigins } from "@/utils/public-origin";
import { isPublishedRuntime, parsePositiveInteger } from "@/utils/runtime-config";

const DEFAULT_REQUEST_TIMEOUT_MS = 15_000;
const DEFAULT_UPLOAD_EXPIRY_SECONDS = 2 * 60 * 60;
const DEFAULT_PLAYBACK_TTL_SECONDS = 30 * 60;
const DEFAULT_MAX_DURATION_SECONDS = 10 * 60;

export type VideoStreamConfig = {
  accountId: string;
  allowedOrigins: string[];
  apiToken: string;
  customerCode: string;
  playbackTtlSeconds: number;
  requestTimeoutMs: number;
  signingKey: KeyObject;
  signingKeyId: string;
  uploadExpirySeconds: number;
  webhookSecret: string;
};

const enabledValues = new Set(["1", "true", "yes"]);

export const isVideoStreamEnabled = (env: NodeJS.ProcessEnv = process.env) =>
  enabledValues.has(env.CLOUDFLARE_STREAM_ENABLED?.trim().toLowerCase() ?? "");

const safeIdentifier = (value: string | undefined, max = 128) => {
  const normalized = value?.trim() ?? "";
  return normalized.length > 0 && normalized.length <= max && /^[a-zA-Z0-9_-]+$/.test(normalized)
    ? normalized
    : null;
};

const resolveAllowedOrigins = (env: NodeJS.ProcessEnv) => {
  const productionRuntime = isPublishedRuntime(env.NODE_ENV);
  const configured = parsePublicHttpOrigins(env.CLOUDFLARE_STREAM_ALLOWED_ORIGINS, {
    productionRuntime,
  });
  const origins =
    configured.length > 0 ? configured : parsePublicHttpOrigins(env.WEB_URL, { productionRuntime });

  return origins.map((origin) => new URL(origin).host);
};

const decodeSigningKey = (value: string | undefined) => {
  const encoded = value?.trim();
  if (!encoded) return null;

  try {
    const pem = Buffer.from(encoded, "base64").toString("utf8");
    if (!pem.includes("BEGIN RSA PRIVATE KEY") && !pem.includes("BEGIN PRIVATE KEY")) {
      return null;
    }

    return createPrivateKey(pem);
  } catch {
    return null;
  }
};

export const getVideoStreamConfig = (
  env: NodeJS.ProcessEnv = process.env,
): VideoStreamConfig | null => {
  if (!isVideoStreamEnabled(env)) return null;

  const accountId = safeIdentifier(env.CLOUDFLARE_STREAM_ACCOUNT_ID, 64);
  const apiToken = env.CLOUDFLARE_STREAM_API_TOKEN?.trim() || null;
  const customerCode = safeIdentifier(env.CLOUDFLARE_STREAM_CUSTOMER_CODE, 128);
  const signingKeyId = safeIdentifier(env.CLOUDFLARE_STREAM_SIGNING_KEY_ID, 64);
  const signingKey = decodeSigningKey(env.CLOUDFLARE_STREAM_SIGNING_PRIVATE_KEY_BASE64);
  const webhookSecret = env.CLOUDFLARE_STREAM_WEBHOOK_SECRET?.trim() || null;
  const allowedOrigins = resolveAllowedOrigins(env);

  if (
    !accountId ||
    !apiToken ||
    !customerCode ||
    !signingKeyId ||
    !signingKey ||
    !webhookSecret ||
    allowedOrigins.length === 0
  ) {
    return null;
  }

  return {
    accountId,
    allowedOrigins,
    apiToken,
    customerCode,
    playbackTtlSeconds: parsePositiveInteger(
      env.CLOUDFLARE_STREAM_PLAYBACK_TTL_SECONDS,
      DEFAULT_PLAYBACK_TTL_SECONDS,
      { max: 24 * 60 * 60, min: 60 },
    ),
    requestTimeoutMs: parsePositiveInteger(
      env.CLOUDFLARE_STREAM_REQUEST_TIMEOUT_MS,
      DEFAULT_REQUEST_TIMEOUT_MS,
      { max: 60_000, min: 1_000 },
    ),
    signingKey,
    signingKeyId,
    uploadExpirySeconds: parsePositiveInteger(
      env.CLOUDFLARE_STREAM_UPLOAD_EXPIRY_SECONDS,
      DEFAULT_UPLOAD_EXPIRY_SECONDS,
      { max: 24 * 60 * 60, min: 15 * 60 },
    ),
    webhookSecret,
  };
};

export const getVideoStreamMaxDurationSeconds = (env: NodeJS.ProcessEnv = process.env) =>
  parsePositiveInteger(env.CLOUDFLARE_STREAM_MAX_DURATION_SECONDS, DEFAULT_MAX_DURATION_SECONDS, {
    max: 60 * 60,
    min: 30,
  });
