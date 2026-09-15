"use client";

import type { ChangeEvent } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { PsychologistProfileVideoUploadInput } from "@/api/callers/psychologist-free-profile";
import { prepareUpload } from "@/utils/media-preparation";
import { isAllowedProfileVideo } from "@/utils/profile-video-upload";
import { isMediaUploadCanceled, throwIfMediaUploadCanceled } from "@/utils/upload-lifecycle";

export type ProfileVideoUploadPhase = "uploading";

type ProfileVideoUploadOptions = {
  onFileSelected: () => void;
  startUpload: (input: PsychologistProfileVideoUploadInput) => Promise<unknown>;
};

export const useProfileVideoUpload = ({
  onFileSelected,
  startUpload,
}: ProfileVideoUploadOptions) => {
  const activeControllerRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);
  const [videoUploadPhase, setVideoUploadPhase] = useState<ProfileVideoUploadPhase | null>(null);
  const [videoUploadProgress, setVideoUploadProgress] = useState<number | null>(null);

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
      let uploadStarted = false;
      let prepared: Awaited<ReturnType<typeof prepareUpload>> | null = null;
      activeControllerRef.current = controller;
      setVideoUploadPhase("uploading");
      setVideoUploadProgress(0);

      try {
        prepared = await prepareUpload({
          file,
          purpose: "profile-presentation-video",
          signal: controller.signal,
        });
        throwIfMediaUploadCanceled(controller.signal);

        uploadStarted = true;
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
        if (isMediaUploadCanceled(error)) return;
        if (!uploadStarted) {
          toast.error("Não foi possível validar o vídeo. Escolha outro arquivo e tente novamente.");
        }
        // Erros após o início do transporte usam a mensagem pública centralizada da mutation.
      } finally {
        await prepared?.cleanup?.();
        if (activeControllerRef.current === controller) activeControllerRef.current = null;
        if (mountedRef.current) {
          setVideoUploadPhase(null);
          setVideoUploadProgress(null);
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

      if (!isAllowedProfileVideo(file)) {
        toast.error("Envie um vídeo MP4, MOV ou WebM.");
        return;
      }

      void uploadFile(file);
    },
    [onFileSelected, uploadFile],
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
  };
};
