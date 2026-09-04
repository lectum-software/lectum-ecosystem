import type { Redis } from "ioredis";
import type { VideoServiceConfig } from "../../config/env.js";
import { requireVideoJobId } from "./paths.js";
import { availableStorageBytes } from "./storage.js";

const RESERVATIONS_KEY = "{lectum-video}:storage-reservations";

const ACQUIRE_RESERVATION_SCRIPT = `
local now = tonumber(ARGV[1])
local job_id = ARGV[2]
local requested = tonumber(ARGV[3])
local expires_at = tonumber(ARGV[4])
local available = tonumber(ARGV[5])
local minimum_free = tonumber(ARGV[6])
local maximum_reservations = tonumber(ARGV[7])
local entries = redis.call("HGETALL", KEYS[1])
local reserved = 0
local count = 0

for index = 1, #entries, 2 do
  local field = entries[index]
  local value = entries[index + 1]
  local separator = string.find(value, "|")
  local bytes = separator and tonumber(string.sub(value, 1, separator - 1)) or nil
  local expiration = separator and tonumber(string.sub(value, separator + 1)) or nil

  if not bytes or not expiration or expiration <= now then
    redis.call("HDEL", KEYS[1], field)
  elseif field ~= job_id then
    reserved = reserved + bytes
    count = count + 1
  end
end

if count >= maximum_reservations then
  return -1
end

if available - reserved - requested < minimum_free then
  return -2
end

redis.call("HSET", KEYS[1], job_id, tostring(requested) .. "|" .. tostring(expires_at))
return 1
`;

const RESIZE_RESERVATION_SCRIPT = `
if redis.call("HEXISTS", KEYS[1], ARGV[1]) == 0 then
  return 0
end
redis.call("HSET", KEYS[1], ARGV[1], ARGV[2] .. "|" .. ARGV[3])
return 1
`;

const reservationExpiry = (config: VideoServiceConfig) =>
  Date.now() + config.storageReservationTtlSeconds * 1_000;

const requirePositiveSafeInteger = (value: number) => {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error("video_storage_reservation_invalid");
  }
  return value;
};

export const acquireVideoStorageReservation = async (input: {
  config: VideoServiceConfig;
  connection: Redis;
  expectedInputBytes: number;
  jobId: string;
}) => {
  const jobId = requireVideoJobId(input.jobId);
  const requestedBytes = requirePositiveSafeInteger(
    input.expectedInputBytes + input.config.maxOutputBytes,
  );
  const availableBytes = await availableStorageBytes(input.config.storageRoot);
  const result = Number(
    await input.connection.eval(
      ACQUIRE_RESERVATION_SCRIPT,
      1,
      RESERVATIONS_KEY,
      String(Date.now()),
      jobId,
      String(requestedBytes),
      String(reservationExpiry(input.config)),
      String(availableBytes),
      String(input.config.minFreeSpaceBytes),
      String(input.config.maxQueuedJobs),
    ),
  );

  if (result === -1) throw new Error("video_queue_capacity_exhausted");
  if (result !== 1) throw new Error("video_storage_capacity_exhausted");
};

export const retainVideoOutputReservation = async (
  connection: Redis,
  config: VideoServiceConfig,
  jobId: string,
) => {
  const result = Number(
    await connection.eval(
      RESIZE_RESERVATION_SCRIPT,
      1,
      RESERVATIONS_KEY,
      requireVideoJobId(jobId),
      String(config.maxOutputBytes),
      String(reservationExpiry(config)),
    ),
  );
  if (result !== 1) throw new Error("video_storage_reservation_missing");
};

export const releaseVideoStorageReservation = async (connection: Redis, jobId: string) => {
  await connection.hdel(RESERVATIONS_KEY, requireVideoJobId(jobId));
};
