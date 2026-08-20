"use client";

import type { ChangeEvent } from "react";
import { useState } from "react";
import { toast } from "sonner";
import type { PsychologistProfileVideoUploadInput } from "@/api/callers/psychologist-free-profile";
import { isAllowedProfileVideo } from "@/utils/profile-video-upload";

type ProfileVideoUploadOptions = {
  maxSizeMb: number;
  onFileSelected: () => void;
  startUpload: (input: PsychologistProfileVideoUploadInput, onSettled: () => void) => void;
};

export const useProfileVideoUpload = ({
  maxSizeMb,
  onFileSelected,
  startUpload,
}: ProfileVideoUploadOptions) => {
  const [progress, setProgress] = useState<number | null>(null);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;
    onFileSelected();

    if (file.size > maxSizeMb * 1024 * 1024) {
      toast.error(`Envie um vídeo de até ${maxSizeMb}MB.`);
      return;
    }

    if (!isAllowedProfileVideo(file)) {
      toast.error("Envie um vídeo MP4, MOV ou WebM.");
      return;
    }

    setProgress(0);
    startUpload({ file, onProgress: setProgress }, () => setProgress(null));
  };

  return { handleFileChange, progress };
};
