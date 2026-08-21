import * as Sentry from "@sentry/nextjs";
import { getAdminSentryOptions } from "./lib/sentry-runtime";

const sentryOptions = getAdminSentryOptions();

if (sentryOptions) {
  Sentry.init(sentryOptions);
}
