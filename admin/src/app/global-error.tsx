"use client";

import { ErrorSplash } from "@/components/admin-shell/error-splash";

export default function GlobalError({ reset }: { reset: () => void }) {
  return (
    <html lang="pt-BR">
      <body>
        <ErrorSplash onRetry={reset} />
      </body>
    </html>
  );
}
