import type { ErrorEvent, EventHint, Exception, StackFrame, Stacktrace } from "@sentry/nextjs";

const SAFE_ERROR_DETAIL = "Detalhes omitidos pela política de privacidade.";
const SAFE_SENTRY_KEY_PATTERN = /^[a-z0-9_-]{8,128}$/i;
const SAFE_SENTRY_PROJECT_PATTERN = /^\/\d+$/;
const SAFE_SENTRY_ENVIRONMENT_PATTERN = /^[a-z0-9][a-z0-9_-]{0,63}$/i;
const SAFE_SENTRY_SLUG_PATTERN = /^[a-z0-9][a-z0-9_-]{0,63}$/i;
const SAFE_SENTRY_TOKEN_PATTERN = /^[\x21-\x7e]{8,512}$/;
const SAFE_DEBUG_ID_PATTERN = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;
const SAFE_EVENT_ID_PATTERN = /^[a-f0-9]{32}$/i;
const SAFE_EVENT_RELEASE_PATTERN = /^lectum-admin@\d{1,6}\.\d{1,6}\.\d{1,6}$/;
const SAFE_STACK_PLATFORMS = new Set(["javascript", "node"]);
const SAFE_SENTRY_ENVIRONMENTS = new Set(["development", "homolog", "production", "test"]);
const SAFE_EXCEPTION_TYPES = new Set([
  "AbortError",
  "AggregateError",
  "AxiosError",
  "ChunkLoadError",
  "DOMException",
  "Error",
  "EvalError",
  "NetworkError",
  "NotAllowedError",
  "NotFoundError",
  "RangeError",
  "ReferenceError",
  "SyntaxError",
  "TimeoutError",
  "TypeError",
  "URIError",
]);
const SAFE_MECHANISM_TYPES = new Set([
  "chained",
  "generic",
  "instrument",
  "onerror",
  "onunhandledrejection",
]);
const STACK_LOCATION_ABSOLUTE_URL_PATTERN = /^[a-z][a-z0-9+.-]*:\/\//i;
const MAX_STACK_LOCATION_INPUT_LENGTH = 4_096;
const MAX_STACK_POSITION = 10_000_000;
const MIN_SAFE_EVENT_TIMESTAMP = 946_684_800;
const MAX_SAFE_EVENT_TIMESTAMP = 4_102_444_800;
const STACK_ARTIFACT_EXTENSIONS = [
  ".tsx",
  ".jsx",
  ".mjs",
  ".cjs",
  ".css",
  ".wasm",
  ".map",
  ".ts",
  ".js",
];
const SENTRY_HOST_SUFFIX = ".sentry.io";

const DISABLED_SENTRY_INTEGRATIONS = new Set([
  "Breadcrumbs",
  "BrowserProfiling",
  "BrowserSession",
  "BrowserTracing",
  "ChildProcess",
  "Console",
  "Context",
  "ContextLines",
  "ConversationId",
  "CultureContext",
  "ExtraErrorData",
  "Feedback",
  "Http",
  "HttpContext",
  "LocalVariables",
  "LocalVariablesAsync",
  "Modules",
  "NodeFetch",
  "NodeProfiling",
  "NodeSystemError",
  "OnUncaughtException",
  "OnUnhandledRejection",
  "ProcessSession",
  "Profiling",
  "Replay",
  "ReplayCanvas",
  "RequestData",
  "Spotlight",
  "Undici",
  "WinterCGFetch",
]);

export type SentryDsnConfiguration = {
  dsn: string;
  origin: string;
};

export type SentryBuildConfiguration = {
  authToken: string;
  org: string;
  project: string;
};

type SentryBuildEnvironment = Record<string, string | undefined>;

const hasSentryHostname = (hostname: string) =>
  hostname === "sentry.io" || hostname.endsWith(SENTRY_HOST_SUFFIX);

const removeControlCharacters = (value: string) => {
  let sanitized = "";
  for (const character of value) {
    const codePoint = character.codePointAt(0) ?? 0;
    if (codePoint > 0x1f && (codePoint < 0x7f || codePoint > 0x9f)) sanitized += character;
  }

  return sanitized;
};

type NormalizedStackLocation = {
  extension: string;
  key: string;
};

type StackLocationSanitizer = (
  value: string | undefined,
  preferredDebugId?: string,
) => string | undefined;

const getStackArtifactExtension = (value: string) => {
  const normalized = value.toLowerCase();
  return STACK_ARTIFACT_EXTENSIONS.find((extension) => normalized.endsWith(extension)) ?? "";
};

const normalizeStackLocation = (value: string | undefined): NormalizedStackLocation | null => {
  if (typeof value !== "string") return null;

  const normalized = removeControlCharacters(
    value.slice(0, MAX_STACK_LOCATION_INPUT_LENGTH),
  ).trim();
  if (!normalized) return null;

  let pathValue: string;
  if (STACK_LOCATION_ABSOLUTE_URL_PATTERN.test(normalized)) {
    try {
      const url = new URL(normalized);
      url.username = "";
      url.password = "";
      url.search = "";
      url.hash = "";
      pathValue = url.pathname;
    } catch {
      return null;
    }
  } else if (normalized.startsWith("//")) {
    try {
      const url = new URL(`https:${normalized}`);
      pathValue = url.pathname;
    } catch {
      return null;
    }
  } else {
    pathValue = normalized.split(/[?#]/u, 1)[0] ?? "";
  }

  const portablePath = pathValue
    .replaceAll("\\", "/")
    .replace(/\/{2,}/gu, "/")
    .trim();
  if (!portablePath) return null;

  return {
    extension: getStackArtifactExtension(portablePath),
    key: portablePath,
  };
};

const createStackLocationSanitizer = (): StackLocationSanitizer => {
  const identifiers = new Map<string, string>();
  const debugIdentifiers = new Map<string, string>();
  let runtimeIdentifier = 0;

  return (value, preferredDebugId) => {
    const normalized = normalizeStackLocation(value);
    if (!normalized) return undefined;

    const existingIdentifier = identifiers.get(normalized.key);
    if (existingIdentifier) return existingIdentifier;

    const existingDebugIdentifier = preferredDebugId
      ? debugIdentifiers.get(preferredDebugId)
      : undefined;
    const identifier =
      existingDebugIdentifier ??
      (preferredDebugId
        ? `sourcemap/${preferredDebugId}${normalized.extension || ".js"}`
        : `runtime/frame-${(++runtimeIdentifier).toString().padStart(3, "0")}${normalized.extension}`);
    identifiers.set(normalized.key, identifier);
    if (preferredDebugId) debugIdentifiers.set(preferredDebugId, identifier);
    return identifier;
  };
};

const sanitizeStackPosition = (value: number | undefined) =>
  typeof value === "number" &&
  Number.isSafeInteger(value) &&
  value >= 0 &&
  value <= MAX_STACK_POSITION
    ? value
    : undefined;

const sanitizeDebugId = (value: string | undefined) =>
  typeof value === "string" && SAFE_DEBUG_ID_PATTERN.test(value) ? value : undefined;

const sanitizeStackPlatform = (value: string | undefined) =>
  typeof value === "string" && SAFE_STACK_PLATFORMS.has(value) ? value : undefined;

const sanitizeStackFrame = (
  frame: StackFrame,
  sanitizeStackLocation: StackLocationSanitizer,
): StackFrame => ({
  abs_path: sanitizeStackLocation(frame.abs_path, sanitizeDebugId(frame.debug_id)),
  colno: sanitizeStackPosition(frame.colno),
  debug_id: sanitizeDebugId(frame.debug_id),
  filename: sanitizeStackLocation(frame.filename, sanitizeDebugId(frame.debug_id)),
  in_app: typeof frame.in_app === "boolean" ? frame.in_app : undefined,
  lineno: sanitizeStackPosition(frame.lineno),
  platform: sanitizeStackPlatform(frame.platform),
});

const sanitizeDebugMeta = (
  debugMeta: ErrorEvent["debug_meta"],
  sanitizeStackLocation: StackLocationSanitizer,
) => {
  if (
    debugMeta !== undefined &&
    (!debugMeta || typeof debugMeta !== "object" || Array.isArray(debugMeta))
  ) {
    throw new TypeError("Invalid error debug metadata.");
  }
  if (
    debugMeta?.images !== undefined &&
    (!Array.isArray(debugMeta.images) ||
      debugMeta.images.some((image) => !image || typeof image !== "object" || Array.isArray(image)))
  ) {
    throw new TypeError("Invalid error debug images.");
  }

  const images = debugMeta?.images?.flatMap((image) => {
    if (image.type !== "sourcemap") return [];

    const debugId = sanitizeDebugId(image.debug_id);
    const codeFile = sanitizeStackLocation(image.code_file, debugId);
    if (!codeFile || !debugId) return [];

    return [{ code_file: codeFile, debug_id: debugId, type: "sourcemap" as const }];
  });

  return images?.length ? { images } : undefined;
};

const sanitizeStacktrace = (
  stacktrace: Stacktrace | undefined,
  sanitizeStackLocation: StackLocationSanitizer,
): Stacktrace | undefined => {
  if (!stacktrace) return undefined;
  if (typeof stacktrace !== "object" || Array.isArray(stacktrace)) {
    throw new TypeError("Invalid error stacktrace.");
  }
  if (
    stacktrace.frames !== undefined &&
    (!Array.isArray(stacktrace.frames) ||
      stacktrace.frames.some(
        (frame) => !frame || typeof frame !== "object" || Array.isArray(frame),
      ))
  ) {
    throw new TypeError("Invalid error stack frames.");
  }

  return {
    frames: stacktrace.frames?.map((frame) => sanitizeStackFrame(frame, sanitizeStackLocation)),
  };
};

const sanitizeException = (
  exception: Exception,
  sanitizeStackLocation: StackLocationSanitizer,
): Exception => ({
  mechanism: exception.mechanism
    ? {
        handled:
          typeof exception.mechanism.handled === "boolean"
            ? exception.mechanism.handled
            : undefined,
        synthetic:
          typeof exception.mechanism.synthetic === "boolean"
            ? exception.mechanism.synthetic
            : undefined,
        type: SAFE_MECHANISM_TYPES.has(exception.mechanism.type ?? "")
          ? exception.mechanism.type
          : "generic",
      }
    : undefined,
  stacktrace: sanitizeStacktrace(exception.stacktrace, sanitizeStackLocation),
  type: SAFE_EXCEPTION_TYPES.has(exception.type ?? "") ? exception.type : "Error",
  value: SAFE_ERROR_DETAIL,
});

export const parseSentryDsn = (value?: string | null): SentryDsnConfiguration | null => {
  const normalized = value?.trim();
  if (!normalized) return null;

  try {
    const url = new URL(normalized);
    const hasSafeProtocolAndPort =
      url.protocol === "https:" && (url.port === "" || url.port === "443");
    const hasPublicKey = SAFE_SENTRY_KEY_PATTERN.test(url.username) && url.password.length === 0;
    const hasProject = SAFE_SENTRY_PROJECT_PATTERN.test(url.pathname);
    const hasOnlyDsnParts = url.search.length === 0 && url.hash.length === 0;

    if (
      !hasSafeProtocolAndPort ||
      !hasPublicKey ||
      !hasProject ||
      !hasOnlyDsnParts ||
      !hasSentryHostname(url.hostname)
    ) {
      return null;
    }

    return { dsn: url.toString(), origin: url.origin };
  } catch {
    return null;
  }
};

export const resolveSentryBuildConfiguration = (
  environment: SentryBuildEnvironment,
): SentryBuildConfiguration | null => {
  const authToken = environment.SENTRY_AUTH_TOKEN?.trim();
  const org = environment.SENTRY_ORG?.trim();
  const project = environment.SENTRY_PROJECT?.trim();

  if (
    !authToken ||
    !SAFE_SENTRY_TOKEN_PATTERN.test(authToken) ||
    !org ||
    !SAFE_SENTRY_SLUG_PATTERN.test(org) ||
    !project ||
    !SAFE_SENTRY_SLUG_PATTERN.test(project)
  ) {
    return null;
  }

  return { authToken, org, project };
};

export const parseSentryEnvironment = (configuredEnvironment?: string) => {
  const normalized = configuredEnvironment?.trim().toLowerCase();
  if (
    !normalized ||
    !SAFE_SENTRY_ENVIRONMENT_PATTERN.test(normalized) ||
    !SAFE_SENTRY_ENVIRONMENTS.has(normalized)
  ) {
    return null;
  }

  return normalized;
};

export const filterSentryErrorIntegrations = <IntegrationType extends { name: string }>(
  integrations: IntegrationType[],
) => integrations.filter((integration) => !DISABLED_SENTRY_INTEGRATIONS.has(integration.name));

const sanitizeSentryErrorEventUnsafe = (event: ErrorEvent): ErrorEvent | null => {
  if (!event || typeof event !== "object" || Array.isArray(event)) return null;
  if (event.type !== undefined) return null;
  if (event.level !== undefined && event.level !== "error" && event.level !== "fatal") return null;
  if (
    !event.exception ||
    typeof event.exception !== "object" ||
    Array.isArray(event.exception) ||
    !Array.isArray(event.exception.values) ||
    !event.exception.values.length ||
    event.exception.values.some(
      (exception) => !exception || typeof exception !== "object" || Array.isArray(exception),
    )
  ) {
    return null;
  }

  const sanitizeStackLocation = createStackLocationSanitizer();
  const debugMeta = sanitizeDebugMeta(event.debug_meta, sanitizeStackLocation);
  const environment = parseSentryEnvironment(event.environment);
  const timestamp =
    typeof event.timestamp === "number" &&
    Number.isFinite(event.timestamp) &&
    event.timestamp >= MIN_SAFE_EVENT_TIMESTAMP &&
    event.timestamp <= MAX_SAFE_EVENT_TIMESTAMP
      ? event.timestamp
      : undefined;
  return {
    debug_meta: debugMeta,
    environment: environment ?? undefined,
    event_id:
      event.event_id && SAFE_EVENT_ID_PATTERN.test(event.event_id) ? event.event_id : undefined,
    level: event.level === "fatal" ? "fatal" : "error",
    platform:
      event.platform && SAFE_STACK_PLATFORMS.has(event.platform) ? event.platform : undefined,
    release:
      event.release && SAFE_EVENT_RELEASE_PATTERN.test(event.release) ? event.release : undefined,
    timestamp,
    type: undefined,
    exception: {
      values: event.exception.values.map((exception) =>
        sanitizeException(exception, sanitizeStackLocation),
      ),
    },
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

export const SENTRY_PRIVATE_DATA_COLLECTION = {
  cookies: false,
  databaseQueryData: false,
  frameContextLines: 0,
  genAI: { inputs: false, outputs: false },
  graphQL: { document: false, variables: false },
  httpBodies: [],
  httpHeaders: { request: false, response: false },
  stackFrameVariables: false,
  urlQueryParams: false,
  userInfo: false,
};
