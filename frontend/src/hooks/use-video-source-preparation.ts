"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { MediaUploadProgress } from "@/utils/media-preparation";
import { isMediaUploadCanceled } from "@/utils/upload-lifecycle";
import { type PreparedVideoSource, prepareVideoSource } from "@/utils/video-source-preparation";

// O dono da seleção retém a cópia até substituir/descartar/concluir, inclusive em retry.
export const useVideoSourcePreparation = () => {
  const active = useRef<{ controller: AbortController; prepared?: PreparedVideoSource } | null>(
    null,
  );
  const mounted = useRef(true);
  const [preparationProgress, setPreparationProgress] = useState<MediaUploadProgress | null>(null);
  const clearVideo = useCallback(() => {
    const previous = active.current;
    active.current = null;
    previous?.controller.abort();
    void previous?.prepared?.cleanup();
    if (mounted.current) setPreparationProgress(null);
  }, []);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      clearVideo();
    };
  }, [clearVideo]);
  const prepareVideo = useCallback(
    async (file: File): Promise<File | null> => {
      clearVideo();
      const current = {
        controller: new AbortController(),
        prepared: undefined as PreparedVideoSource | undefined,
      };
      active.current = current;
      setPreparationProgress({ phase: "preparing", stage: "analyzing", percentage: 0 });
      try {
        const prepared = await prepareVideoSource(file, {
          signal: current.controller.signal,
          onProgress: (percentage) => {
            if (
              mounted.current &&
              active.current === current &&
              !current.controller.signal.aborted
            ) {
              setPreparationProgress({ phase: "preparing", stage: "analyzing", percentage });
            }
          },
        });
        if (!mounted.current || active.current !== current || current.controller.signal.aborted) {
          await prepared.cleanup();
          return null;
        }
        current.prepared = prepared;
        return prepared.file;
      } catch (error) {
        if (current.controller.signal.aborted || isMediaUploadCanceled(error)) return null;
        if (active.current === current) active.current = null;
        throw error;
      } finally {
        if (mounted.current && active.current === current) setPreparationProgress(null);
        // Uma falha ainda precisa remover progresso, sem apagar uma seleção mais recente.
        if (mounted.current && !active.current) setPreparationProgress(null);
      }
    },
    [clearVideo],
  );
  return {
    prepareVideo,
    clearVideo,
    preparationProgress,
    isPreparingVideo: preparationProgress !== null,
  };
};
