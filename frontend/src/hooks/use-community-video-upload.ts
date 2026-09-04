"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  type CommunityVideoUploadOperation,
  createCommunityVideoUploadOperation,
} from "@/utils/community-video-upload-lifecycle";
import type { MediaUploadProgress } from "@/utils/media-preparation";

export type { CommunityVideoUploadOperation } from "@/utils/community-video-upload-lifecycle";

export const useCommunityVideoUpload = () => {
  const activeControllerRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);
  const [videoUploadProgress, setVideoUploadProgress] = useState<MediaUploadProgress | null>(null);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      activeControllerRef.current?.abort();
      activeControllerRef.current = null;
    };
  }, []);

  const abortActiveVideoUpload = useCallback(() => {
    const controller = activeControllerRef.current;
    if (!controller || controller.signal.aborted) return false;

    controller.abort();
    return true;
  }, []);

  const cancelActiveVideoUpload = useCallback(() => {
    if (abortActiveVideoUpload()) {
      toast.info("Envio de vídeo cancelado.");
    }
  }, [abortActiveVideoUpload]);

  const beginVideoUpload = useCallback((): CommunityVideoUploadOperation => {
    activeControllerRef.current?.abort();

    const controller = new AbortController();
    activeControllerRef.current = controller;
    setVideoUploadProgress({
      percentage: 0,
      phase: "uploading",
      stage: "uploading",
    });

    return createCommunityVideoUploadOperation({
      controller,
      onComplete: () => {
        if (activeControllerRef.current !== controller) return;
        activeControllerRef.current = null;
        if (mountedRef.current) setVideoUploadProgress(null);
      },
      onProgress: (progress) => {
        if (
          mountedRef.current &&
          activeControllerRef.current === controller &&
          !controller.signal.aborted
        ) {
          setVideoUploadProgress(progress);
        }
      },
    });
  }, []);

  return {
    abortActiveVideoUpload,
    beginVideoUpload,
    cancelActiveVideoUpload,
    videoUploadProgress,
  };
};
