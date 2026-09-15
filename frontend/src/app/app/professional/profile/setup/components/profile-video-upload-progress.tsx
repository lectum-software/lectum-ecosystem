import { Loader2, X } from "lucide-react";

type ProfileVideoUploadProgressProps = {
  onCancel: () => void;
  phase: "uploading";
  progress: number | null;
};

const PHASE_CONTENT = {
  uploading: {
    description: "Mantenha esta tela aberta até o envio terminar.",
    title: "Enviando vídeo",
  },
} as const;

export const ProfileVideoUploadProgress = ({
  onCancel,
  phase,
  progress,
}: ProfileVideoUploadProgressProps) => {
  const content = PHASE_CONTENT[phase];
  const normalizedProgress = progress === null ? null : Math.max(0, Math.min(100, progress));

  return (
    <div aria-live="polite" className="mt-4 rounded-2xl border border-border bg-surface p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2 text-xs font-semibold text-foreground">
          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" aria-hidden="true" />
          <span>{content.title}</span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {normalizedProgress === null ? null : (
            <span className="text-xs font-semibold text-foreground">{normalizedProgress}%</span>
          )}
          <button
            aria-label="Cancelar preparação e envio do vídeo"
            className="inline-flex h-8 items-center gap-1 rounded-full border border-border px-3 text-xs font-semibold text-muted transition hover:border-danger hover:text-danger"
            onClick={onCancel}
            type="button"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
            Cancelar
          </button>
        </div>
      </div>
      <div
        aria-label={`Progresso: ${content.title.toLowerCase()}`}
        aria-valuemax={100}
        aria-valuemin={0}
        aria-valuenow={normalizedProgress ?? undefined}
        className="mt-3 h-2 overflow-hidden rounded-full bg-border"
        role="progressbar"
      >
        <div
          className={
            normalizedProgress === null
              ? "h-full w-1/3 animate-pulse rounded-full bg-primary"
              : "h-full rounded-full bg-primary transition-[width] duration-200"
          }
          style={normalizedProgress === null ? undefined : { width: `${normalizedProgress}%` }}
        />
      </div>
      <p className="mt-2 text-xs leading-5 text-muted">{content.description}</p>
    </div>
  );
};
