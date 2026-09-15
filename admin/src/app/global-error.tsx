"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";
import { ErrorSplash } from "@/components/admin-shell/error-splash";

type GlobalErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="pt-BR">
      <body>
        <ErrorSplash onRetry={reset} />
      </body>
    </html>
  );
}
