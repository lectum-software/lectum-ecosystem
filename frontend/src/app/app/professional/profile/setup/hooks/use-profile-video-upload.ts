"use client";

import type { ChangeEvent } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { PsychologistProfileVideoUploadInput } from "@/api/callers/psychologist-free-profile";
import {
  isProfileVideoUploadCanceled,
  prepareProfileVideo,
  throwIfProfileVideoUploadCanceled,
} from "@/utils/profile-video-optimization";
import { isAllowedProfileVideo } from "@/utils/profile-video-upload";

export type ProfileVideoUploadPhase = "analyzing" | "optimizing" | "uploading";

type ProfileVideoUploadOptions = {
  maxSizeMb: number;
  onFileSelected: () => void;
  startUpload: (input: PsychologistProfileVideoUploadInput) => Promise<unknown>;
};

type VideoUploadSummary = {
  originalSize: number;
  preparedSize: number;
};

export const useProfileVideoUpload = ({
  maxSizeMb,
  onFileSelected,
  startUpload,
}: ProfileVideoUploadOptions) => {
  const activeControllerRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);
  const [videoUploadPhase, setVideoUploadPhase] = useState<ProfileVideoUploadPhase | null>(null);
  const [videoUploadProgress, setVideoUploadProgress] = useState<number | null>(null);
  const [videoUploadSummary, setVideoUploadSummary] = useState<VideoUploadSummary | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      activeControllerRef.current?.abort();
    };
  }, []);

  const uploadFile = useCallback(
    async (file: File) => {
      const controller = new AbortController();
      activeControllerRef.current = controller;
      setVideoUploadPhase("analyzing");
      setVideoUploadProgress(null);
      setVideoUploadSummary(null);

      try {
        const prepared = await prepareProfileVideo(file, {
          onProgress: ({ percentage, stage }) => {
            if (!mountedRef.current || controller.signal.aborted) return;
            setVideoUploadPhase(stage);
            setVideoUploadProgress(percentage);
          },
          signal: controller.signal,
        });
        throwIfProfileVideoUploadCanceled(controller.signal);

        if (prepared.optimized) {
          setVideoUploadSummary({
            originalSize: prepared.originalSize,
            preparedSize: prepared.preparedSize,
          });
        }
        setVideoUploadPhase("uploading");
        setVideoUploadProgress(0);
        await startUpload({
          file: prepared.file,
          onProgress: (percentage) => {
            if (mountedRef.current && !controller.signal.aborted) {
              setVideoUploadProgress(percentage);
            }
          },
          signal: controller.signal,
        });
      } catch (error) {
        if (isProfileVideoUploadCanceled(error)) return;
        // O callback da mutation mantém a mensagem pública centralizada e sem detalhes técnicos.
      } finally {
        if (activeControllerRef.current === controller) activeControllerRef.current = null;
        if (mountedRef.current) {
          setVideoUploadPhase(null);
          setVideoUploadProgress(null);
          setVideoUploadSummary(null);
        }
      }
    },
    [startUpload],
  );

  const handleVideoChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.target.value = "";

      if (!file || activeControllerRef.current) return;
      onFileSelected();

      if (file.size > maxSizeMb * 1024 * 1024) {
        toast.error(`Envie um vídeo de até ${maxSizeMb}MB.`);
        return;
      }
      if (!isAllowedProfileVideo(file)) {
        toast.error("Envie um vídeo MP4, MOV ou WebM.");
        return;
      }

      void uploadFile(file);
    },
    [maxSizeMb, onFileSelected, uploadFile],
  );

  const cancelVideoUpload = useCallback(() => {
    if (!activeControllerRef.current) return;
    activeControllerRef.current.abort();
    toast.info("Envio de vídeo cancelado.");
  }, []);

  return {
    cancelVideoUpload,
    handleVideoChange,
    videoUploadBusy: videoUploadPhase !== null,
    videoUploadPhase,
    videoUploadProgress,
    videoUploadSummary,
  };
};
