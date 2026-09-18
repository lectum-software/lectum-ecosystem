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
    aria-label={`Ativar som do v\u00eddeo: ${title}`}
    className="absolute top-1/2 left-1/2 z-[3] grid h-14 w-14 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-media-foreground/25 bg-media-background/50 text-primary-foreground shadow-lectum-soft backdrop-blur-md transition hover:scale-[1.03] hover:bg-media-background/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-media-foreground/70 active:scale-95"
    data-lectum-muted-overlay-control="center"
    onClick={onClick}
    onPointerDown={(event) => event.stopPropagation()}
    type="button"
  >
    <VolumeX className="h-6 w-6" aria-hidden="true" />
  </button>
);
