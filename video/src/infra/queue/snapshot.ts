import type { Job, JobState } from "bullmq";
import type {
  PublicVideoJob,
  PublicVideoJobStatus,
  VideoJobData,
  VideoJobResult,
} from "../../domain/jobs/contracts.js";

const timestampToIso = (value?: number) =>
  typeof value === "number" && Number.isFinite(value) ? new Date(value).toISOString() : null;

const progressValue = (value: unknown) => {
  const number = typeof value === "number" ? value : 0;
  return Math.min(100, Math.max(0, Math.round(number)));
};

const statusFor = (
  state: JobState | "unknown",
  data: VideoJobData,
  failedReason?: string,
): PublicVideoJobStatus => {
  if (data.cancelRequested && (state === "active" || state === "waiting" || state === "delayed")) {
    return "cancel_requested";
  }
  if (state === "completed") return "completed";
  if (state === "active") return "processing";
  if (state === "failed") return failedReason === "canceled" ? "canceled" : "failed";
  return "queued";
};

const failureCodeFor = (
  status: PublicVideoJobStatus,
  failedReason?: string,
): PublicVideoJob["failure_code"] => {
  if (status === "canceled") return "canceled";
  if (status !== "failed") return null;
  return failedReason === "invalid_video" ? "invalid_video" : "processing_failed";
};

export const toPublicVideoJob = async (
  job: Job<VideoJobData, VideoJobResult, string>,
): Promise<PublicVideoJob> => {
  const state = await job.getState();
  const status = statusFor(state, job.data, job.failedReason);
  const result = status === "completed" ? job.returnvalue : null;

  return {
    completed_at: status === "completed" ? timestampToIso(job.finishedOn) : null,
    created_at: timestampToIso(job.timestamp) ?? job.data.createdAt,
    download_url: status === "completed" ? `/api/private/jobs/${job.id}/output` : null,
    failed_at: status === "failed" || status === "canceled" ? timestampToIso(job.finishedOn) : null,
    failure_code: failureCodeFor(status, job.failedReason),
    job_id: String(job.id),
    output_size_bytes: result?.outputSizeBytes ?? null,
    progress: status === "completed" ? 100 : progressValue(job.progress),
    started_at: timestampToIso(job.processedOn),
    status,
  };
};
