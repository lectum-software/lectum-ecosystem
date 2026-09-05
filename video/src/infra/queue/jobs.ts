import { createId } from "@paralleldrive/cuid2";
import type { Job } from "bullmq";
import type { Redis } from "ioredis";
import type { VideoServiceConfig } from "../../config/env.js";
import {
  type SocialShareRenderMetadata,
  VIDEO_JOB_NAME,
  type VideoJobData,
  type VideoJobResult,
} from "../../domain/jobs/contracts.js";
import { releaseVideoStorageReservation } from "../storage/reservations.js";
import { removeVideoJobStorage } from "../storage/storage.js";
import { clearVideoJobCancellation, requestVideoJobCancellation } from "./cancellation.js";
import type { VideoQueue } from "./client.js";

export const countOpenVideoJobs = async (queue: VideoQueue) => {
  const counts = await queue.getJobCounts("active", "delayed", "prioritized", "waiting");
  return (
    (counts.active ?? 0) + (counts.delayed ?? 0) + (counts.prioritized ?? 0) + (counts.waiting ?? 0)
  );
};

export const createVideoJobId = () => createId();

export const enqueueCompressionJob = async (
  queue: VideoQueue,
  jobId: string,
): Promise<Job<VideoJobData, VideoJobResult, typeof VIDEO_JOB_NAME>> =>
  queue.add(
    VIDEO_JOB_NAME,
    {
      cancelRequested: false,
      createdAt: new Date().toISOString(),
      operation: "compress",
    },
    { jobId },
  );

export const enqueueSocialShareJob = async (
  queue: VideoQueue,
  input: {
    jobId: string;
    metadata: SocialShareRenderMetadata;
    sourceUrl: string;
  },
): Promise<Job<VideoJobData, VideoJobResult, typeof VIDEO_JOB_NAME>> =>
  queue.add(
    VIDEO_JOB_NAME,
    {
      cancelRequested: false,
      createdAt: new Date().toISOString(),
      metadata: input.metadata,
      operation: "social_share",
      sourceUrl: input.sourceUrl,
    },
    { jobId: input.jobId },
  );

export const activeVideoJobIds = async (queue: VideoQueue) => {
  const jobs = await queue.getJobs(["active", "delayed", "prioritized", "waiting"]);
  return new Set(jobs.map((job) => String(job.id)));
};

export type RemoveVideoJobResult = "cancel_requested" | "not_found" | "removed";

export const removeOrCancelVideoJob = async (input: {
  config: VideoServiceConfig;
  connection: Redis;
  jobId: string;
  queue: VideoQueue;
}): Promise<RemoveVideoJobResult> => {
  const job = await input.queue.getJob(input.jobId);
  if (!job) {
    await Promise.allSettled([
      clearVideoJobCancellation(input.connection, input.jobId),
      releaseVideoStorageReservation(input.connection, input.jobId),
      removeVideoJobStorage(input.config, input.jobId),
    ]);
    return "not_found";
  }

  const state = await job.getState();
  if (state === "active") {
    await requestVideoJobCancellation(
      input.connection,
      input.jobId,
      Math.ceil(input.config.jobTimeoutMs / 1000) + 300,
    );
    return "cancel_requested";
  }

  await job.remove();
  await clearVideoJobCancellation(input.connection, input.jobId).catch(() => undefined);
  await releaseVideoStorageReservation(input.connection, input.jobId).catch(() => undefined);
  await removeVideoJobStorage(input.config, input.jobId);
  return "removed";
};
