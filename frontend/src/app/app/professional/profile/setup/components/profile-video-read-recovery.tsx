"use client";

import type { RefObject } from "react";
import { VideoFileReadRecovery } from "@/components/community/video-file-read-recovery";

export function ProfileVideoReadRecovery({
  disabled,
  fileInputRef,
  onCloseGuidance,
  onDiscard,
}: {
  disabled?: boolean;
  fileInputRef: RefObject<HTMLInputElement | null>;
  onCloseGuidance: () => void;
  onDiscard: () => void;
}) {
  return (
    <div className="mt-4">
      <VideoFileReadRecovery
        disabled={disabled}
        fileInputRef={fileInputRef}
        onDiscard={onDiscard}
        onOpenDialog={onCloseGuidance}
      />
    </div>
  );
}
