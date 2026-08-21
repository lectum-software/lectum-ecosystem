import {
  isVideoUploadCanceled,
  type PreparedVideo,
  prepareVideo,
  type VideoPreparationProgress,
} from "../video-preparation";
import { ProfileVideoUploadCanceledError } from "./types";

type PrepareProfileVideoOptions = {
  onProgress?: (progress: VideoPreparationProgress) => void;
  signal?: AbortSignal;
};

export const prepareProfileVideo = (
  file: File,
  options: PrepareProfileVideoOptions = {},
): Promise<PreparedVideo> => {
  const remapCancellation = (error: unknown): never => {
    if (isVideoUploadCanceled(error)) throw new ProfileVideoUploadCanceledError();
    throw error;
  };

  try {
    return prepareVideo(file, {
      ...options,
      purpose: "profile-presentation",
    }).catch(remapCancellation);
  } catch (error) {
    if (isVideoUploadCanceled(error)) throw new ProfileVideoUploadCanceledError();
    throw error;
  }
};
