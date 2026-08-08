"use client";

import { ErrorSplash } from "@/components/admin-shell/error-splash";

export default function ErrorBoundary({ reset }: { reset: () => void }) {
  return <ErrorSplash onRetry={reset} />;
}
