"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";
import { resolveApiError } from "@/api/handle";
import { cn } from "@/lib/utils";

type AdminQueryErrorStateProps = {
  className?: string;
  error?: unknown;
  message?: string;
  onRetry: () => void;
  title: string;
};

export const AdminQueryErrorState = ({
  className,
  error,
  message,
  onRetry,
  title,
}: AdminQueryErrorStateProps) => (
  <section
    className={cn(
      "min-w-0 rounded-card border border-border/80 bg-surface/95 p-6 shadow-admin-soft backdrop-blur",
      className,
    )}
    role="alert"
  >
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex gap-3">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-danger/10 text-danger">
          <AlertTriangle aria-hidden className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-foreground">{title}</h2>
          <p className="mt-1 text-sm text-muted">
            {message || resolveApiError(error) || "Tente novamente em alguns instantes."}
          </p>
        </div>
      </div>
      <button
        className="inline-flex h-11 items-center justify-center gap-2 rounded-control border border-border bg-surface px-4 text-sm font-semibold text-foreground transition hover:border-primary/40 hover:text-primary"
        onClick={onRetry}
        type="button"
      >
        <RefreshCw aria-hidden className="h-4 w-4" />
        Tentar novamente
      </button>
    </div>
  </section>
);
