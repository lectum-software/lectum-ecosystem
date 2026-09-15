import { VolumeX } from "lucide-react";

type VerticalVideoPlayerMutedOverlayControlProps = {
  onClick: () => void;
  title: string;
};

export const VerticalVideoPlayerMutedOverlayControl = ({
  onClick,
  title,
}: VerticalVideoPlayerMutedOverlayControlProps) => (
  <button
    aria-label={`Ativar som do vídeo: ${title}`}
    className="absolute right-3 z-[3] grid h-10 w-10 place-items-center rounded-full border border-media-foreground/25 bg-media-background/45 text-primary-foreground shadow-lectum-soft backdrop-blur-md transition hover:bg-media-background/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-media-foreground/70 active:scale-95"
    onClick={onClick}
    onPointerDown={(event) => event.stopPropagation()}
    style={{
      bottom: "calc(var(--lectum-bottom-fixed-padding) + 0.25rem)",
    }}
    type="button"
  >
    <VolumeX className="h-5 w-5" aria-hidden="true" />
  </button>
);
