import type { Redis } from "ioredis";

const keyFor = (jobId: string) => `lectum:video:cancel:${jobId}`;

export const requestVideoJobCancellation = async (
  connection: Redis,
  jobId: string,
  ttlSeconds: number,
) => {
  await connection.set(keyFor(jobId), "1", "EX", ttlSeconds);
};

export const isVideoJobCancellationRequested = async (connection: Redis, jobId: string) =>
  (await connection.get(keyFor(jobId))) === "1";

export const clearVideoJobCancellation = async (connection: Redis, jobId: string) => {
  await connection.del(keyFor(jobId));
};
