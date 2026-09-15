import * as Sentry from "@sentry/nextjs";
import { createSentryOptions } from "./utils/sentry-policy";

const sentryOptions = createSentryOptions(
  process.env.NEXT_PUBLIC_SENTRY_DSN,
  process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT,
);

if (sentryOptions) Sentry.init(sentryOptions);
