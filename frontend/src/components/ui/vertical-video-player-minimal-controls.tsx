import { Pause, Play } from "lucide-react";
import type { MouseEventHandler } from "react";

export function VerticalVideoPlayerMinimalControls({
  isPaused,
  title,
  onClick,
}: {
  isPaused: boolean;
  title: string;
  onClick: MouseEventHandler<HTMLButtonElement>;
}) {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[2] bg-gradient-to-t from-media-background/80 via-media-background/45 to-transparent px-4 pt-12 pb-[var(--lectum-bottom-fixed-padding)]">
      <div className="pointer-events-auto flex items-center">
        <button
          aria-label={isPaused ? `Reproduzir video: ${title}` : `Pausar video: ${title}`}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface/95 text-foreground shadow-[var(--lectum-shadow-soft)] transition hover:scale-[1.03] hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-media-foreground/70"
          onClick={onClick}
          type="button"
        >
          {isPaused ? (
            <Play className="h-4 w-4 fill-current" />
          ) : (
            <Pause className="h-4 w-4 fill-current" />
          )}
        </button>
      </div>
    </div>
  );
}
