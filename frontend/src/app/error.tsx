"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";
import { AppErrorState } from "@/components/ui/app-error-state";

type ErrorBoundaryProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ErrorBoundary({ error, reset }: ErrorBoundaryProps) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return <AppErrorState onRetry={reset} />;
}
