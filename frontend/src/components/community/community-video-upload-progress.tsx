import { Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MediaUploadProgress } from "@/utils/media-preparation";

type CommunityVideoUploadProgressProps = {
  className?: string;
  onCancel: () => void;
  progress: MediaUploadProgress;
};

const PHASE_TITLES = {
  analyzing: "Preparando arquivo",
  optimizing: "Preparando arquivo",
  uploading: "Enviando vídeo",
} as const;

export const CommunityVideoUploadProgress = ({
  className,
  onCancel,
  progress,
}: CommunityVideoUploadProgressProps) => {
  const percentage =
    progress.percentage === null ? null : Math.max(0, Math.min(100, progress.percentage));
  const title = PHASE_TITLES[progress.stage];

  return (
    <div
      aria-live="polite"
      className={cn("rounded-2xl border border-border bg-surface-muted/55 p-3", className)}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="inline-flex min-w-0 items-center gap-2 text-xs font-semibold text-foreground">
          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" aria-hidden="true" />
          {title}
          {percentage === null ? null : <span className="text-muted">{percentage}%</span>}
        </span>
        <button
          aria-label="Cancelar preparação e envio do vídeo"
          className="inline-flex h-8 shrink-0 items-center gap-1 rounded-full border border-border bg-surface px-3 text-xs font-semibold text-muted transition hover:border-danger hover:text-danger focus:outline-none focus:ring-4 focus:ring-danger/10"
          onClick={onCancel}
          type="button"
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
          Cancelar
        </button>
      </div>
      <div
        aria-label={`Progresso: ${title.toLowerCase()}`}
        aria-valuemax={100}
        aria-valuemin={0}
        aria-valuenow={percentage ?? undefined}
        className="mt-2 h-1.5 overflow-hidden rounded-full bg-border"
        role="progressbar"
      >
        <div
          className={
            percentage === null
              ? "h-full w-1/3 animate-pulse rounded-full bg-primary"
              : "h-full rounded-full bg-primary transition-[width] duration-200"
          }
          style={percentage === null ? undefined : { width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};
