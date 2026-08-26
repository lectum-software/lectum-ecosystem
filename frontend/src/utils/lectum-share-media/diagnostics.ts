import type { LectumShareSocialTarget, LectumShareVideoTarget } from "@/utils/lectum-share-target";

export type LectumShareExportStage =
  | "canvas-context"
  | "legacy-export"
  | "mediabunny-can-encode"
  | "mediabunny-conversion-execute"
  | "mediabunny-conversion-init"
  | "mediabunny-conversion-invalid"
  | "mediabunny-import"
  | "mediabunny-output-empty"
  | "source-empty"
  | "source-fetch"
  | "unknown";

type LectumShareDiagnosticTarget = Pick<LectumShareVideoTarget, "kind"> &
  Partial<Pick<LectumShareSocialTarget, "mediaType">>;

type SupportState = "available" | "unavailable";

type RuntimeDiagnostics = {
  browser: string;
  canvasCapture: SupportState;
  mediaRecorder: SupportState;
  runtime: string;
  webcodecs: SupportState;
};

type ShareExportDiagnostic = {
  errorKind?: string;
  previousStage?: LectumShareExportStage;
  profile?: string;
  stage: LectumShareExportStage;
};

const KNOWN_ERROR_KIND_BY_NAME: Record<string, string> = {
  AbortError: "abort-error",
  EncodingError: "encoding-error",
  Error: "error",
  InvalidStateError: "invalid-state-error",
  NetworkError: "network-error",
  NotAllowedError: "not-allowed-error",
  NotSupportedError: "not-supported-error",
  SecurityError: "security-error",
  TimeoutError: "timeout-error",
  TypeError: "type-error",
};

const supportState = (isAvailable: boolean): SupportState =>
  isAvailable ? "available" : "unavailable";

const resolveBrowser = (userAgent: string) => {
  if (/;\s*wv\)|Version\/\d+(?:\.\d+)?\s+Chrome\//iu.test(userAgent)) return "android-webview";
  if (/EdgA|EdgiOS|Edg\//iu.test(userAgent)) return "edge";
  if (/CriOS|Chrome|Chromium/iu.test(userAgent)) return "chrome";
  if (/FxiOS|Firefox/iu.test(userAgent)) return "firefox";
  if (/Safari/iu.test(userAgent)) return "safari";
  return "unknown";
};

const resolveRuntime = (userAgent: string) => {
  if (/\bAndroid\b/iu.test(userAgent)) return "android";
  if (/\b(iPhone|iPad|iPod)\b/iu.test(userAgent)) return "ios";
  if (/\b(Windows|Macintosh|Linux)\b/iu.test(userAgent)) return "desktop";
  return "unknown";
};

const resolveRuntimeDiagnostics = (): RuntimeDiagnostics => {
  const userAgent = typeof navigator === "undefined" ? "" : navigator.userAgent;

  return {
    browser: resolveBrowser(userAgent),
    canvasCapture: supportState(
      typeof HTMLCanvasElement !== "undefined" &&
        typeof HTMLCanvasElement.prototype.captureStream === "function",
    ),
    mediaRecorder: supportState(typeof MediaRecorder !== "undefined"),
    runtime: resolveRuntime(userAgent),
    webcodecs: supportState(typeof VideoEncoder !== "undefined"),
  };
};

const resolveErrorKind = (error: unknown) => {
  if (!error || typeof error !== "object" || !("name" in error)) return "unknown-error";

  const name = String((error as { name?: unknown }).name ?? "");
  return KNOWN_ERROR_KIND_BY_NAME[name] ?? "unknown-error";
};

export class LectumShareDiagnosticError extends Error {
  readonly cause: unknown;
  readonly diagnostic: ShareExportDiagnostic;

  constructor(
    stage: LectumShareExportStage,
    cause?: unknown,
    details: Partial<ShareExportDiagnostic> = {},
  ) {
    super("Falha controlada no preparo do video com arte.");
    this.name = "LectumShareDiagnosticError";
    this.cause = cause;
    this.diagnostic = {
      errorKind: details.errorKind ?? resolveErrorKind(cause),
      previousStage: details.previousStage,
      profile: details.profile,
      stage,
    };
  }
}

export const toLectumShareDiagnosticError = (
  error: unknown,
  stage: LectumShareExportStage,
  details: Partial<ShareExportDiagnostic> = {},
) =>
  error instanceof LectumShareDiagnosticError
    ? error
    : new LectumShareDiagnosticError(stage, error, details);

const diagnosticTags = (
  target: LectumShareDiagnosticTarget,
  destination: string,
  diagnostic: ShareExportDiagnostic,
) => {
  const runtime = resolveRuntimeDiagnostics();

  return {
    "lectum.browser": runtime.browser,
    "lectum.canvas_capture": runtime.canvasCapture,
    "lectum.destination": destination,
    "lectum.error_kind": diagnostic.errorKind ?? "unknown-error",
    "lectum.feature": "share-video-artifact",
    "lectum.media_recorder": runtime.mediaRecorder,
    "lectum.media_type": target.mediaType ?? "none",
    "lectum.previous_stage": diagnostic.previousStage ?? "none",
    "lectum.profile": diagnostic.profile ?? "none",
    "lectum.runtime": runtime.runtime,
    "lectum.stage": diagnostic.stage,
    "lectum.target_kind": target.kind,
    "lectum.webcodecs": runtime.webcodecs,
  };
};

export const reportLectumShareExportFailure = async ({
  destination,
  error,
  target,
}: {
  destination: string;
  error: unknown;
  target: LectumShareDiagnosticTarget;
}) => {
  if (typeof window === "undefined") return;

  const diagnosticError = toLectumShareDiagnosticError(error, "unknown");

  try {
    const Sentry = await import("@sentry/nextjs");
    Sentry.withScope((scope) => {
      for (const [key, value] of Object.entries(
        diagnosticTags(target, destination, diagnosticError.diagnostic),
      )) {
        scope.setTag(key, value);
      }

      scope.setLevel("error");
      Sentry.captureException(diagnosticError);
    });
  } catch {
    // Observabilidade best effort: a tentativa de diagnóstico nunca deve bloquear o fluxo do usuário.
  }
};
