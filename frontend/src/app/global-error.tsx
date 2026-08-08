"use client";

import { AppErrorState } from "@/components/ui/app-error-state";

export default function GlobalError({ reset }: { reset: () => void }) {
  return (
    <html lang="pt-BR">
      <body>
        <AppErrorState onRetry={reset} />
      </body>
    </html>
  );
}
