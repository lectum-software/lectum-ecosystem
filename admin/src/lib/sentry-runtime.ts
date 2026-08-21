import {
  filterSentryErrorIntegrations,
  parseSentryDsn,
  parseSentryEnvironment,
  SENTRY_PRIVATE_DATA_COLLECTION,
  sanitizeSentryErrorEvent,
} from "./sentry-policy";

const getRelease = (version?: string) => {
  const normalized = version?.trim();
  return normalized ? `lectum-admin@${normalized}` : undefined;
};

export const getAdminSentryOptions = () => {
  const dsnConfiguration = parseSentryDsn(process.env.NEXT_PUBLIC_SENTRY_DSN);
  const environment = parseSentryEnvironment(process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT);
  if (!dsnConfiguration || !environment) return null;

  return {
    beforeBreadcrumb: () => null,
    beforeSend: sanitizeSentryErrorEvent,
    dataCollection: SENTRY_PRIVATE_DATA_COLLECTION,
    dsn: dsnConfiguration.dsn,
    enableLogs: false,
    enableMetrics: false,
    environment,
    integrations: filterSentryErrorIntegrations,
    maxBreadcrumbs: 0,
    propagateTraceparent: false,
    profileSessionSampleRate: 0,
    profilesSampleRate: 0,
    release: getRelease(process.env.LECTUM_APP_VERSION),
    replaysOnErrorSampleRate: 0,
    replaysSessionSampleRate: 0,
    sampleRate: 1,
    sendClientReports: false,
    tracePropagationTargets: [],
    tracesSampleRate: 0,
  };
};
