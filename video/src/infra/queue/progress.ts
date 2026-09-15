import type { Job } from "bullmq";
import { VideoProcessingError } from "../../domain/jobs/contracts.js";

export const createVideoProgressWriter = (job: Pick<Job, "updateProgress">) => {
  let pending = Promise.resolve();
  let failure: unknown;

  return {
    write: (percentage: number) => {
      pending = pending
        .then(async () => {
          if (failure) return;
          await job.updateProgress(Math.max(3, percentage));
        })
        .catch((error: unknown) => {
          failure = error;
        });
    },
    flush: async () => {
      await pending;
      if (failure) {
        throw new VideoProcessingError("processing_failed", { cause: failure, retryable: true });
      }
    },
  };
};
