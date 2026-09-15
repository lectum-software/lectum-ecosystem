import type { ErrorEvent, EventHint, Exception, StackFrame } from "@sentry/node";

const SAFE_CLASSIFICATIONS = new Set([
  "BackendBootError",
  "BackendShutdownError",
  "BillingDunningSchedulerError",
  "CampaignSchedulerError",
  "DigestSchedulerError",
  "HttpControllerError",
  "UncaughtException",
  "UnhandledRejection",
  "UnknownError",
]);
const SAFE_BOUNDARIES = new Set(["boot", "http_controller", "process", "scheduler", "shutdown"]);
const SAFE_OPERATION_PATTERN = /^_?[A-Za-z][A-Za-z0-9]*(?:[._:-][A-Za-z0-9]+)+$/;
const SAFE_ENVIRONMENTS = new Set(["development", "homolog", "production", "staging", "test"]);
const SAFE_RELEASE_PATTERN = /^lectum-backend@\d+\.\d+\.\d+(?:-[A-Za-z0-9.-]+)?$/;
const SAFE_EVENT_ID_PATTERN = /^[a-f0-9]{32}$/;
const SAFE_SENTRY_PUBLIC_KEY_PATTERN = /^[a-f0-9]{32}$/i;
const SAFE_SENTRY_PROJECT_PATH_PATTERN = /^\/\d{1,20}$/;
const SAFE_FRAME_EXTENSION_PATTERN = /\.(cjs|js|jsx|mjs|ts|tsx)(?:[?#].*)?$/i;
const SAFE_STACK_PLATFORMS = new Set(["javascript", "node"]);
const SENSITIVE_OPERATION_PATTERN = /(?:credential|credencial|secret|token|password|senha)/i;
const LONG_DIGIT_SEQUENCE_PATTERN = /\d{7,}/;
const MIN_SAFE_EVENT_TIMESTAMP = 1_577_836_800;
const MAX_SAFE_EVENT_TIMESTAMP = 4_102_444_800;
const OPERATIONAL_ERROR_NAME = "LectumOperationalError";
const UNHANDLED_ERROR_NAME = "UnhandledServerError";

export type SentryRuntimeEnvironment = {
  NODE_ENV?: string;
  SENTRY_DSN?: string;
  SENTRY_ENVIRONMENT?: string;
};

export type SentryRuntimeConfig = {
  dsn?: string;
  enabled: boolean;
  environment: string;
};

const normalizeEnvironment = (environment: SentryRuntimeEnvironment) => {
  const candidate = environment.SENTRY_ENVIRONMENT?.trim();

  return candidate && SAFE_ENVIRONMENTS.has(candidate) ? candidate : undefined;
};

export const parseSentryDsn = (value: unknown) => {
  if (typeof value !== "string" || !value.trim()) return undefined;

  try {
    const parsed = new URL(value.trim());
    const isSentrySaasHost =
      parsed.hostname === "sentry.io" || parsed.hostname.endsWith(".sentry.io");

    if (
      parsed.protocol !== "https:" ||
      !isSentrySaasHost ||
      !SAFE_SENTRY_PUBLIC_KEY_PATTERN.test(parsed.username) ||
      parsed.password ||
      parsed.port ||
      parsed.search ||
      parsed.hash ||
      !SAFE_SENTRY_PROJECT_PATH_PATTERN.test(parsed.pathname)
    ) {
      return undefined;
    }

    return parsed.toString();
  } catch {
    return undefined;
  }
};

export const resolveSentryRuntimeConfig = (
  environment: SentryRuntimeEnvironment,
): SentryRuntimeConfig => {
  const dsn = parseSentryDsn(environment.SENTRY_DSN);
  const sentryEnvironment = normalizeEnvironment(environment);
  const enabled = Boolean(dsn && sentryEnvironment);

  return {
    dsn: enabled ? dsn : undefined,
    enabled,
    environment: sentryEnvironment ?? "unknown",
  };
};

export const normalizeSentryClassification = (value: unknown, fallback = "UnknownError") =>
  typeof value === "string" && SAFE_CLASSIFICATIONS.has(value) ? value : fallback;

export const normalizeSentryBoundary = (value: unknown) =>
  typeof value === "string" && SAFE_BOUNDARIES.has(value) ? value : "runtime";

export const normalizeSentryOperation = (value: unknown) => {
  const candidate = typeof value === "number" ? String(value) : value;

  return typeof candidate === "string" &&
    candidate.length <= 80 &&
    SAFE_OPERATION_PATTERN.test(candidate) &&
    !SENSITIVE_OPERATION_PATTERN.test(candidate) &&
    !LONG_DIGIT_SEQUENCE_PATTERN.test(candidate)
    ? candidate
    : undefined;
};

const safeStackLines = (error: unknown) => {
  if (!(error instanceof Error) || typeof error.stack !== "string") return [];

  return error.stack
    .split("\n")
    .slice(1)
    .filter((line) => /^\s*at\s+/.test(line))
    .slice(0, 80);
};

export const createSafeOperationalError = (error: unknown, classification: string) => {
  const safeClassification = normalizeSentryClassification(classification);
  const safeError = new Error(safeClassification);
  const stackLines = safeStackLines(error);

  safeError.name = OPERATIONAL_ERROR_NAME;
  safeError.stack = [`${OPERATIONAL_ERROR_NAME}: ${safeClassification}`, ...stackLines].join("\n");

  return safeError;
};

const sanitizeFramePath = (value: unknown, frameIndex: number) => {
  if (typeof value !== "string" || !value) return undefined;

  const extension = value.match(SAFE_FRAME_EXTENSION_PATTERN)?.[1]?.toLowerCase() ?? "js";
  const identifier = value.startsWith("node:")
    ? "node"
    : `frame-${(frameIndex + 1).toString().padStart(3, "0")}`;

  return `runtime/${identifier}.${extension}`;
};

const sanitizeStackFrame = (frame: StackFrame, frameIndex: number): StackFrame => ({
  ...(sanitizeFramePath(frame.filename ?? frame.abs_path, frameIndex)
    ? { filename: sanitizeFramePath(frame.filename ?? frame.abs_path, frameIndex) }
    : {}),
  ...(typeof frame.platform === "string" && SAFE_STACK_PLATFORMS.has(frame.platform)
    ? { platform: frame.platform }
    : {}),
  ...(Number.isSafeInteger(frame.lineno) &&
  Number(frame.lineno) > 0 &&
  Number(frame.lineno) <= 10_000_000
    ? { lineno: frame.lineno }
    : {}),
  ...(Number.isSafeInteger(frame.colno) &&
  Number(frame.colno) >= 0 &&
  Number(frame.colno) <= 10_000_000
    ? { colno: frame.colno }
    : {}),
  ...(typeof frame.in_app === "boolean" ? { in_app: frame.in_app } : {}),
});

const sanitizeException = (exception: Exception): Exception => {
  const isControlled = exception.type === OPERATIONAL_ERROR_NAME;
  const controlledValue = isControlled
    ? normalizeSentryClassification(exception.value, "UnknownError")
    : undefined;
  const frames = exception.stacktrace?.frames?.map(sanitizeStackFrame);

  return {
    type: isControlled ? OPERATIONAL_ERROR_NAME : UNHANDLED_ERROR_NAME,
    ...(controlledValue ? { value: controlledValue } : {}),
    ...(exception.mechanism
      ? {
          mechanism: {
            type: "generic",
            ...(typeof exception.mechanism?.handled === "boolean"
              ? { handled: exception.mechanism.handled }
              : {}),
          },
        }
      : {}),
    ...(frames?.length ? { stacktrace: { frames } } : {}),
  };
};

const sanitizeTags = (tags: ErrorEvent["tags"]) => {
  if (!tags) return undefined;

  const sanitized: NonNullable<ErrorEvent["tags"]> = {};
  if (tags["lectum.boundary"] !== undefined) {
    sanitized["lectum.boundary"] = normalizeSentryBoundary(tags["lectum.boundary"]);
  }
  const operation = normalizeSentryOperation(tags["lectum.operation"]);
  if (operation) sanitized["lectum.operation"] = operation;

  return Object.keys(sanitized).length ? sanitized : undefined;
};

const sanitizeSentryErrorEventUnsafe = (event: ErrorEvent): ErrorEvent | null => {
  const exceptions = event.exception?.values?.map(sanitizeException).filter(Boolean);
  const tags = sanitizeTags(event.tags);
  if (!exceptions?.length) return null;
  if (event.level && event.level !== "error" && event.level !== "fatal") return null;

  return {
    type: undefined,
    ...(event.event_id && SAFE_EVENT_ID_PATTERN.test(event.event_id)
      ? { event_id: event.event_id }
      : {}),
    ...(typeof event.timestamp === "number" &&
    Number.isFinite(event.timestamp) &&
    event.timestamp >= MIN_SAFE_EVENT_TIMESTAMP &&
    event.timestamp <= MAX_SAFE_EVENT_TIMESTAMP
      ? { timestamp: event.timestamp }
      : {}),
    ...(event.level ? { level: event.level } : {}),
    ...(event.platform === "node" ? { platform: event.platform } : {}),
    ...(event.release && SAFE_RELEASE_PATTERN.test(event.release)
      ? { release: event.release }
      : {}),
    ...(event.environment && SAFE_ENVIRONMENTS.has(event.environment)
      ? { environment: event.environment }
      : {}),
    exception: { values: exceptions },
    ...(tags ? { tags } : {}),
  };
};

export const sanitizeSentryErrorEvent = (
  event: ErrorEvent,
  hint?: EventHint,
): ErrorEvent | null => {
  try {
    if (hint) {
      hint.attachments = undefined;
      hint.captureContext = undefined;
      hint.data = undefined;
    }

    return sanitizeSentryErrorEventUnsafe(event);
  } catch {
    return null;
  }
};

const readHttpStatus = (error: unknown) => {
  if (!error || typeof error !== "object") return undefined;

  const candidate = error as {
    name?: unknown;
    output?: { statusCode?: unknown };
    status?: unknown;
    status_code?: unknown;
    statusCode?: unknown;
  };
  if (candidate.name === "ZodError") return 400;

  for (const value of [
    candidate.status,
    candidate.statusCode,
    candidate.status_code,
    candidate.output?.statusCode,
  ]) {
    const parsed = Number(value);
    if (Number.isInteger(parsed) && parsed >= 400 && parsed <= 599) return parsed;
  }

  return undefined;
};

export const shouldCaptureExpressError = (error: unknown) => {
  const status = readHttpStatus(error);

  return status === undefined || status >= 500;
};
