"use client";

import { useVideoAssetPlayback } from "@/api/callers/video-assets";
import { CaptionIcon } from "./caption-icon";
import {
  setDirectoryCaptionPreference,
  useDirectoryCaptionPreference,
} from "./directory-preference";

export function DirectoryCaptionButton({
  reference,
  muted,
  disabled,
  desktop = false,
}: {
  reference?: string | null;
  muted: boolean;
  disabled?: boolean;
  desktop?: boolean;
}) {
  const playback = useVideoAssetPlayback(reference);
  const preference = useDirectoryCaptionPreference();
  const enabled = preference ?? muted;
  if (!playback.data?.captions?.cues.length) return null;
  return (
    <div className="grid justify-items-center gap-1 text-center" data-directory-caption-action>
      <button
        type="button"
        aria-label={enabled ? "Desativar legendas" : "Ativar legendas"}
        title={enabled ? "Desativar legendas" : "Ativar legendas"}
        aria-pressed={enabled}
        disabled={disabled}
        tabIndex={disabled ? -1 : undefined}
        className={
          desktop
            ? "grid h-11 w-11 place-items-center rounded-full bg-media-background/70 text-media-foreground disabled:opacity-45"
            : "grid h-11 w-11 place-items-center bg-transparent text-media-foreground disabled:opacity-45"
        }
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => {
          event.stopPropagation();
          setDirectoryCaptionPreference(!enabled);
        }}
      >
        <CaptionIcon active={enabled} size={32} />
      </button>
      {desktop ? <span className="text-[10px] font-bold text-muted">Legendas</span> : null}
    </div>
  );
}
