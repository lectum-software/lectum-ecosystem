import {
  isVideoOptimizationWorkerResponse,
  isVideoUploadCanceled,
  type PreparedVideo,
  type VideoOptimizationWorkerResponse,
  type VideoPreparationProgress,
  type VideoPreparationStage,
  VideoUploadCanceledError,
} from "../video-preparation/types";

export type ProfileVideoPreparationStage = VideoPreparationStage;
export type ProfileVideoPreparationProgress = VideoPreparationProgress;
export type PreparedProfileVideo = PreparedVideo;

export type ProfileVideoOptimizationWorkerRequest =
  | { file: File; type: "start" }
  | { type: "cancel" };

export type ProfileVideoOptimizationWorkerResponse = VideoOptimizationWorkerResponse;

export class ProfileVideoUploadCanceledError extends VideoUploadCanceledError {
  constructor() {
    super();
    this.message = "profile_video_upload_canceled";
  }
}

export const isProfileVideoUploadCanceled = (error: unknown) =>
  error instanceof ProfileVideoUploadCanceledError || isVideoUploadCanceled(error);

export const throwIfProfileVideoUploadCanceled = (signal?: AbortSignal) => {
  if (signal?.aborted) throw new ProfileVideoUploadCanceledError();
};
export const isProfileVideoOptimizationWorkerResponse = isVideoOptimizationWorkerResponse;
