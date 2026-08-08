"use client";

import { AppErrorState } from "@/components/ui/app-error-state";

export default function ErrorBoundary({ reset }: { reset: () => void }) {
  return <AppErrorState onRetry={reset} />;
}
