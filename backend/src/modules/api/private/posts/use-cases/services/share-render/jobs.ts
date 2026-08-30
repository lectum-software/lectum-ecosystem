import { randomUUID } from "node:crypto";
import { toSafeErrorLog } from "@/utils/safe-error-log";
import { renderShareVideoWithChromium } from "./renderer";
import type { ShareRenderResult, ShareRenderTarget } from "./types";

const SHARE_RENDER_JOB_VERSION = "share-render-job-v3-local-result-cfr30";
const SHARE_RENDER_JOB_TTL_MS = 30 * 60_000;
const SHARE_RENDER_JOB_FAILED_TTL_MS = 5 * 60_000;
const SHARE_RENDER_JOB_MAX_ENTRIES = 6;
const SHARE_RENDER_JOB_MAX_BYTES = 80 * 1024 * 1024;

export type ShareRenderJobStatus = "completed" | "expired" | "failed" | "processing";

export type ShareRenderJobSnapshot = {
  createdAt: Date;
  expiresAt: Date;
  id: string;
  ready: boolean;
  retryAfterMs: number;
  sizeBytes: number | null;
  status: ShareRenderJobStatus;
};

type ShareRenderJobEntry = {
  createdAt: number;
  errorAt: number | null;
  expiresAt: number;
  id: string;
  key: string;
  postId: string;
  promise: Promise<void>;
  replyId: string | null;
  result: ShareRenderResult | null;
  status: Exclude<ShareRenderJobStatus, "expired">;
  updatedAt: number;
  userId: string;
};

const shareRenderJobs = new Map<string, ShareRenderJobEntry>();
const shareRenderJobByKey = new Map<string, string>();

const createShareRenderJobKey = (userId: string, target: ShareRenderTarget) =>
  JSON.stringify([
    SHARE_RENDER_JOB_VERSION,
    userId,
    target.postId,
    target.replyId,
    target.mediaUrl,
    target.cardLabel,
    target.sourceText,
    target.responseText,
    target.shareTitle,
    target.professional.name,
    target.professional.roleLabel,
    target.professional.verified,
  ]);

const totalResultBytes = () => {
  let total = 0;

  for (const job of shareRenderJobs.values()) {
    total += job.result?.sizeBytes ?? 0;
  }

  return total;
};

const deleteShareRenderJob = (job: ShareRenderJobEntry) => {
  shareRenderJobs.delete(job.id);

  if (shareRenderJobByKey.get(job.key) === job.id) {
    shareRenderJobByKey.delete(job.key);
  }
};

const isShareRenderJobExpired = (job: ShareRenderJobEntry, now = Date.now()) => {
  const ttl = job.status === "failed" ? SHARE_RENDER_JOB_FAILED_TTL_MS : SHARE_RENDER_JOB_TTL_MS;
  const reference = job.status === "failed" && job.errorAt ? job.errorAt : job.createdAt;

  return now - reference > ttl || now > job.expiresAt;
};

const pruneShareRenderJobs = (now = Date.now()) => {
  for (const job of shareRenderJobs.values()) {
    if (isShareRenderJobExpired(job, now)) {
      deleteShareRenderJob(job);
    }
  }

  while (
    shareRenderJobs.size > SHARE_RENDER_JOB_MAX_ENTRIES ||
    totalResultBytes() > SHARE_RENDER_JOB_MAX_BYTES
  ) {
    const removable = Array.from(shareRenderJobs.values())
      .filter((job) => job.status !== "processing")
      .sort((a, b) => a.updatedAt - b.updatedAt)[0];
    const oldest = removable ?? shareRenderJobs.values().next().value;
    if (!oldest) break;

    deleteShareRenderJob(oldest);
  }
};

const toSnapshot = (job: ShareRenderJobEntry): ShareRenderJobSnapshot => ({
  createdAt: new Date(job.createdAt),
  expiresAt: new Date(job.expiresAt),
  id: job.id,
  ready: job.status === "completed",
  retryAfterMs: job.status === "processing" ? 3_000 : 0,
  sizeBytes: job.result?.sizeBytes ?? null,
  status: job.status,
});

const matchesShareRenderJobAccess = (
  job: ShareRenderJobEntry,
  input: { postId: string; replyId?: string | null; userId: string },
) =>
  job.userId === input.userId &&
  job.postId === input.postId &&
  (job.replyId ?? null) === (input.replyId ?? null);

const findShareRenderJob = (input: {
  jobId: string;
  postId: string;
  replyId?: string | null;
  userId: string;
}) => {
  pruneShareRenderJobs();

  const job = shareRenderJobs.get(input.jobId);
  if (!job || !matchesShareRenderJobAccess(job, input)) return null;

  if (isShareRenderJobExpired(job)) {
    deleteShareRenderJob(job);
    return null;
  }

  return job;
};

export const startShareRenderJob = (input: {
  target: ShareRenderTarget;
  userId: string;
}): ShareRenderJobSnapshot => {
  pruneShareRenderJobs();

  const key = createShareRenderJobKey(input.userId, input.target);
  const existingJobId = shareRenderJobByKey.get(key);
  const existingJob = existingJobId ? shareRenderJobs.get(existingJobId) : null;

  if (existingJob && existingJob.status !== "failed" && !isShareRenderJobExpired(existingJob)) {
    existingJob.updatedAt = Date.now();
    return toSnapshot(existingJob);
  }

  if (existingJob) deleteShareRenderJob(existingJob);

  const now = Date.now();
  const job: ShareRenderJobEntry = {
    createdAt: now,
    errorAt: null,
    expiresAt: now + SHARE_RENDER_JOB_TTL_MS,
    id: randomUUID(),
    key,
    postId: input.target.postId,
    promise: Promise.resolve(),
    replyId: input.target.replyId,
    result: null,
    status: "processing",
    updatedAt: now,
    userId: input.userId,
  };

  job.promise = renderShareVideoWithChromium(input.target)
    .then((result) => {
      job.result = result;
      job.status = "completed";
      job.updatedAt = Date.now();
      pruneShareRenderJobs();
    })
    .catch((error: unknown) => {
      job.errorAt = Date.now();
      job.status = "failed";
      job.updatedAt = job.errorAt;
      console.warn("[SHARE_RENDER_JOB] Renderizacao assincrona indisponivel.", {
        ...toSafeErrorLog(error),
      });
      pruneShareRenderJobs();
    });

  shareRenderJobs.set(job.id, job);
  shareRenderJobByKey.set(key, job.id);

  return toSnapshot(job);
};

export const getShareRenderJobSnapshot = (input: {
  jobId: string;
  postId: string;
  replyId?: string | null;
  userId: string;
}): ShareRenderJobSnapshot | null => {
  const job = findShareRenderJob(input);

  return job ? toSnapshot(job) : null;
};

export const getShareRenderJobResult = (input: {
  jobId: string;
  postId: string;
  replyId?: string | null;
  userId: string;
}): ShareRenderResult | null => {
  const job = findShareRenderJob(input);
  if (job?.status !== "completed" || !job.result) return null;

  job.updatedAt = Date.now();
  return job.result;
};
