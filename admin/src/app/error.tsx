"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";
import { ErrorSplash } from "@/components/admin-shell/error-splash";

type ErrorBoundaryProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ErrorBoundary({ error, reset }: ErrorBoundaryProps) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return <ErrorSplash onRetry={reset} />;
}
