import * as Sentry from "@sentry/node";
import type { Application } from "express";
import packageMetadata from "../../../package.json";
import {
  createSafeOperationalError,
  normalizeSentryBoundary,
  normalizeSentryClassification,
  normalizeSentryOperation,
  resolveSentryRuntimeConfig,
  sanitizeSentryErrorEvent,
  shouldCaptureExpressError,
} from "./sentry-policy";

const ERROR_FLUSH_TIMEOUT_MS = 2_000;
const FATAL_FORCE_EXIT_TIMEOUT_MS = ERROR_FLUSH_TIMEOUT_MS + 250;
const ALLOWED_DEFAULT_INTEGRATIONS = new Set([
  "EventFilters",
  "FunctionToString",
  "InboundFilters",
  "LinkedErrors",
]);

type OperationalErrorContext = {
  boundary: string;
  classification: string;
  operation?: number | string;
};

let initialized = false;
let fatalHandlersRegistered = false;
let fatalTerminationStarted = false;

const createErrorOnlyIntegrations = () => [
  ...Sentry.getDefaultIntegrationsWithoutPerformance().filter((integration) =>
    ALLOWED_DEFAULT_INTEGRATIONS.has(integration.name),
  ),
  Sentry.dedupeIntegration(),
  Sentry.httpIntegration({
    breadcrumbs: false,
    disableIncomingRequestSpans: true,
    ignoreIncomingRequestBody: () => true,
    maxIncomingRequestBodySize: "none",
    spans: false,
    tracePropagation: false,
    trackIncomingRequestsAsSessions: false,
  }),
  Sentry.expressIntegration(),
];

export const flushSentry = async (timeout = ERROR_FLUSH_TIMEOUT_MS) => {
  if (!initialized) return true;

  try {
    return await Sentry.flush(timeout);
  } catch {
    return false;
  }
};

export const captureOperationalError = (error: unknown, context: OperationalErrorContext) => {
  if (!initialized) return;

  try {
    const classification = normalizeSentryClassification(context.classification);
    const boundary = normalizeSentryBoundary(context.boundary);
    const operation = normalizeSentryOperation(context.operation);
    const safeError = createSafeOperationalError(error, classification);

    Sentry.withScope((scope) => {
      scope.setLevel("error");
      scope.setTag("lectum.boundary", boundary);
      if (operation) scope.setTag("lectum.operation", operation);
      Sentry.captureException(safeError);
    });
  } catch {
    // Observabilidade nunca pode interromper o fluxo de erro da aplicação.
  }
};

const terminateAfterFatalError = (error: unknown, classification: string) => {
  if (fatalTerminationStarted) {
    process.exit(1);
  }
  fatalTerminationStarted = true;

  captureOperationalError(error, {
    boundary: "process",
    classification,
  });
  console.error("[PROCESS] O backend será encerrado após uma falha não tratada.");

  const forceExitTimer = setTimeout(() => process.exit(1), FATAL_FORCE_EXIT_TIMEOUT_MS);
  void flushSentry().finally(() => {
    clearTimeout(forceExitTimer);
    process.exit(1);
  });
};

const registerFatalProcessHandlers = () => {
  if (fatalHandlersRegistered) return;
  fatalHandlersRegistered = true;

  process.on("uncaughtException", (error) => {
    terminateAfterFatalError(error, "UncaughtException");
  });
  process.on("unhandledRejection", (reason) => {
    terminateAfterFatalError(reason, "UnhandledRejection");
  });
};

export const initializeSentry = () => {
  registerFatalProcessHandlers();

  if (initialized) return true;

  const config = resolveSentryRuntimeConfig(process.env);
  if (!config.enabled || !config.dsn) return false;

  try {
    Sentry.init({
      beforeSend: sanitizeSentryErrorEvent,
      dataCollection: {
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
      },
      debug: false,
      defaultIntegrations: createErrorOnlyIntegrations(),
      dsn: config.dsn,
      enableLogs: false,
      enableMetrics: false,
      environment: config.environment,
      includeLocalVariables: false,
      includeServerName: false,
      maxBreadcrumbs: 0,
      profileSessionSampleRate: 0,
      registerEsmLoaderHooks: false,
      release: `lectum-backend@${packageMetadata.version}`,
      sendClientReports: false,
      sendDefaultPii: false,
      shutdownTimeout: ERROR_FLUSH_TIMEOUT_MS,
      tracePropagationTargets: [],
      tracesSampleRate: 0,
    });
    initialized = Sentry.isEnabled();
    return initialized;
  } catch {
    initialized = false;
    console.warn("[OBSERVABILITY] Monitoramento indisponível; o backend continuará protegido.");
    return false;
  }
};

export const setupSentryExpressErrorHandler = (application: Application) => {
  if (!initialized) return;

  try {
    Sentry.setupExpressErrorHandler(application, {
      shouldHandleError: shouldCaptureExpressError,
    });
  } catch {
    console.warn("[OBSERVABILITY] Captura HTTP indisponível; a API continuará operando.");
  }
};
