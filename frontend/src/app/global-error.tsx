"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";
import { AppErrorState } from "@/components/ui/app-error-state";

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
        <AppErrorState onRetry={reset} />
      </body>
    </html>
  );
}
