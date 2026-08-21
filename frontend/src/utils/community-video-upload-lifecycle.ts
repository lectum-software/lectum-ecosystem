import type { MediaUploadProgress } from "./media-preparation";

export type CommunityVideoUploadOperation = {
  complete: () => void;
  onProgress: (progress: MediaUploadProgress) => void;
  signal: AbortSignal;
};

export const createCommunityVideoUploadOperation = ({
  controller,
  onComplete,
  onProgress,
}: {
  controller: AbortController;
  onComplete: () => void;
  onProgress: (progress: MediaUploadProgress) => void;
}): CommunityVideoUploadOperation => {
  let completed = false;

  return {
    complete: () => {
      if (completed) return;
      completed = true;
      onComplete();
    },
    onProgress: (progress) => {
      if (!completed && !controller.signal.aborted) onProgress(progress);
    },
    signal: controller.signal,
  };
};
