import { Minimize2 } from "lucide-react";

export function VerticalVideoExitButton({
  title,
  onClose,
}: {
  title: string;
  onClose: () => void;
}) {
  return (
    <button
      aria-label={`Sair do vídeo ampliado: ${title}`}
      className="absolute right-3 z-[3] grid h-11 w-11 place-items-center rounded-full border border-media-foreground/20 bg-media-background/40 text-primary-foreground shadow-lectum-soft backdrop-blur-md transition hover:bg-media-background/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-media-foreground/70 active:scale-95"
      data-lectum-inline-video-exit="true"
      onClick={onClose}
      onPointerDown={(event) => event.stopPropagation()}
      style={{ top: "calc(env(safe-area-inset-top) + 12px)" }}
      type="button"
    >
      <Minimize2 className="h-5 w-5" aria-hidden="true" strokeWidth={2.3} />
    </button>
  );
}
