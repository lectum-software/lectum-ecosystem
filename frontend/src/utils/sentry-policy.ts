import type { ErrorEvent, EventHint, Exception, StackFrame, Stacktrace } from "@sentry/nextjs";

const SAFE_ERROR_MESSAGE = "Falha capturada pela aplicação.";
const MAX_DSN_LENGTH = 2_048;
const MAX_ENVIRONMENT_LENGTH = 64;
const SENTRY_PROJECT_ID_PATTERN = /^\d+$/;
const SENTRY_PUBLIC_KEY_PATTERN = /^[A-Za-z0-9_-]{16,128}$/;
const SENTRY_ENVIRONMENT_PATTERN = /^[A-Za-z0-9_.-]+$/;
const SENTRY_BUILD_SLUG_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/;
const SENTRY_BUILD_TOKEN_PATTERN = /^[\x21-\x7e]{8,512}$/;
const SENTRY_RELEASE_VERSION_PATTERN = /^[A-Za-z0-9][A-Za-z0-9.+-]{0,63}$/;
const SAFE_EVENT_ID_PATTERN = /^[a-f0-9]{32}$/i;
const SAFE_DEBUG_ID_PATTERN = /^(?:[a-f0-9]{32}|[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12})$/i;
const SAFE_EVENT_RELEASE_PATTERN = /^lectum-frontend@\d{1,6}\.\d{1,6}\.\d{1,6}$/;
const SAFE_CODE_EXTENSION_PATTERN = /\.(?:cjs|js|jsx|map|mjs|ts|tsx)$/i;
const MAX_STACK_LOCATION_INPUT_LENGTH = 4_096;
const MAX_STACK_POSITION = 10_000_000;
const STACK_LOCATION_ABSOLUTE_URL_PATTERN = /^[a-z][a-z0-9+.-]*:\/\//i;
const SAFE_STACK_PLATFORMS = new Set(["javascript", "node"]);
const SAFE_SENTRY_ENVIRONMENTS = new Set(["development", "homolog", "production", "test"]);
const MIN_SAFE_EVENT_TIMESTAMP = 946_684_800;
const MAX_SAFE_EVENT_TIMESTAMP = 4_102_444_800;
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

type ParsedSentryDsn = {
  dsn: string;
  origin: string;
};

export type SentryRuntimeConfiguration = ParsedSentryDsn & {
  environment: string;
};

type SentryBuildEnvironment = Record<string, string | undefined>;

export type SentryBuildConfiguration = {
  authToken: string;
  org: string;
  project: string;
};

const hasControlCharacter = (value: string) =>
  Array.from(value).some((character) => {
    const code = character.charCodeAt(0);
    return code <= 31 || code === 127;
  });

const isSentryCloudHostname = (hostname: string) =>
  hostname === "sentry.io" || hostname.endsWith(".sentry.io");

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

const normalizeStackLocation = (value?: string): NormalizedStackLocation | null => {
  if (typeof value !== "string") return null;

  const normalized = removeControlCharacters(
    value.slice(0, MAX_STACK_LOCATION_INPUT_LENGTH),
  ).trim();
  if (!normalized) return null;

  let pathValue: string;
  if (STACK_LOCATION_ABSOLUTE_URL_PATTERN.test(normalized)) {
    try {
      const url = new URL(normalized);
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
    .replace(/^\/+|\/+$/gu, "")
    .trim();
  if (!portablePath) return null;

  return {
    extension: portablePath.match(SAFE_CODE_EXTENSION_PATTERN)?.[0]?.toLowerCase() ?? "",
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

const sanitizeDebugId = (value?: string) =>
  value && SAFE_DEBUG_ID_PATTERN.test(value) ? value : undefined;

const sanitizeStackNumber = (value?: number) =>
  Number.isSafeInteger(value) && Number(value) >= 0 && Number(value) <= MAX_STACK_POSITION
    ? value
    : undefined;

const sanitizeStackFrame = (
  frame: StackFrame,
  sanitizeStackLocation: StackLocationSanitizer,
): StackFrame => ({
  abs_path: sanitizeStackLocation(frame.abs_path, sanitizeDebugId(frame.debug_id)),
  colno: sanitizeStackNumber(frame.colno),
  debug_id: sanitizeDebugId(frame.debug_id),
  filename: sanitizeStackLocation(frame.filename, sanitizeDebugId(frame.debug_id)),
  in_app: typeof frame.in_app === "boolean" ? frame.in_app : undefined,
  lineno: sanitizeStackNumber(frame.lineno),
  platform: frame.platform && SAFE_STACK_PLATFORMS.has(frame.platform) ? frame.platform : undefined,
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

export const parseSentryPublicDsn = (value?: string | null): ParsedSentryDsn | null => {
  const raw = value?.trim();
  if (
    !raw ||
    raw.length > MAX_DSN_LENGTH ||
    raw.includes("\\") ||
    raw.includes("*") ||
    hasControlCharacter(raw)
  ) {
    return null;
  }

  try {
    const url = new URL(raw);
    const projectSegments = url.pathname.split("/").filter(Boolean);

    if (
      url.protocol !== "https:" ||
      !isSentryCloudHostname(url.hostname) ||
      !SENTRY_PUBLIC_KEY_PATTERN.test(url.username) ||
      url.password ||
      url.port ||
      url.search ||
      url.hash ||
      projectSegments.length !== 1 ||
      !SENTRY_PROJECT_ID_PATTERN.test(projectSegments[0] ?? "")
    ) {
      return null;
    }

    return { dsn: raw, origin: url.origin };
  } catch {
    return null;
  }
};

export const parseSentryEnvironment = (value?: string | null) => {
  const environment = value?.trim().toLowerCase();

  if (
    !environment ||
    environment.length > MAX_ENVIRONMENT_LENGTH ||
    !SENTRY_ENVIRONMENT_PATTERN.test(environment) ||
    !SAFE_SENTRY_ENVIRONMENTS.has(environment)
  ) {
    return null;
  }

  return environment;
};

export const resolveSentryRuntimeConfiguration = (
  dsnValue?: string | null,
  environmentValue?: string | null,
): SentryRuntimeConfiguration | null => {
  const dsnConfiguration = parseSentryPublicDsn(dsnValue);
  const environment = parseSentryEnvironment(environmentValue);
  return dsnConfiguration && environment ? { ...dsnConfiguration, environment } : null;
};

export const getSentryIngestOrigin = (dsnValue?: string | null, environmentValue?: string | null) =>
  resolveSentryRuntimeConfiguration(dsnValue, environmentValue)?.origin ?? null;

export const resolveSentryBuildConfiguration = (
  environment: SentryBuildEnvironment,
): SentryBuildConfiguration | null => {
  const authToken = environment.SENTRY_AUTH_TOKEN?.trim();
  const org = environment.SENTRY_ORG?.trim();
  const project = environment.SENTRY_PROJECT?.trim();

  if (
    !authToken ||
    !SENTRY_BUILD_TOKEN_PATTERN.test(authToken) ||
    !org ||
    !SENTRY_BUILD_SLUG_PATTERN.test(org) ||
    !project ||
    !SENTRY_BUILD_SLUG_PATTERN.test(project)
  ) {
    return null;
  }

  return { authToken, org, project };
};

export const resolveSentryRelease = (version?: string | null) => {
  const normalized = version?.trim();
  return normalized && SENTRY_RELEASE_VERSION_PATTERN.test(normalized)
    ? `lectum-frontend@${normalized}`
    : undefined;
};

export const SENTRY_DATA_COLLECTION = {
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

export const filterSentryErrorIntegrations = <IntegrationType extends { name: string }>(
  integrations: IntegrationType[],
) => integrations.filter(({ name }) => !DISABLED_SENTRY_INTEGRATIONS.has(name));

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
): Exception => {
  return {
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
    value: SAFE_ERROR_MESSAGE,
  };
};

const sanitizeSentryEventUnsafe = (event: ErrorEvent): ErrorEvent | null => {
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
  const environment = parseSentryEnvironment(event.environment);
  const timestamp =
    typeof event.timestamp === "number" &&
    Number.isFinite(event.timestamp) &&
    event.timestamp >= MIN_SAFE_EVENT_TIMESTAMP &&
    event.timestamp <= MAX_SAFE_EVENT_TIMESTAMP
      ? event.timestamp
      : undefined;
  const sanitizedEvent: ErrorEvent = {
    debug_meta: sanitizeDebugMeta(event.debug_meta, sanitizeStackLocation),
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
  };

  sanitizedEvent.exception = {
    values: event.exception.values.map((exception) =>
      sanitizeException(exception, sanitizeStackLocation),
    ),
  };

  return sanitizedEvent;
};

export const sanitizeSentryEvent = (event: ErrorEvent): ErrorEvent | null => {
  try {
    return sanitizeSentryEventUnsafe(event);
  } catch {
    return null;
  }
};

const sanitizeSentryHint = (hint: EventHint) => {
  hint.attachments = undefined;
  hint.captureContext = undefined;
  hint.data = undefined;
};

export const createSentryOptions = (dsnValue?: string | null, environmentValue?: string | null) => {
  const runtimeConfiguration = resolveSentryRuntimeConfiguration(dsnValue, environmentValue);
  if (!runtimeConfiguration) return null;

  return {
    beforeBreadcrumb: () => null,
    beforeSend: (event: ErrorEvent, hint: EventHint) => {
      try {
        sanitizeSentryHint(hint);
        return sanitizeSentryEvent(event);
      } catch {
        return null;
      }
    },
    dataCollection: SENTRY_DATA_COLLECTION,
    debug: false,
    dsn: runtimeConfiguration.dsn,
    enableMetrics: false,
    enableLogs: false,
    enabled: true,
    environment: runtimeConfiguration.environment,
    integrations: filterSentryErrorIntegrations,
    maxBreadcrumbs: 0,
    profilesSampleRate: 0,
    profileSessionSampleRate: 0,
    propagateTraceparent: false,
    replaysOnErrorSampleRate: 0,
    replaysSessionSampleRate: 0,
    sampleRate: 1,
    sendClientReports: false,
    tracePropagationTargets: [],
    tracesSampleRate: 0,
  };
};
