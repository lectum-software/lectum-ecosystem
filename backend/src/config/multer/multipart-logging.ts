const MULTIPART_UPLOAD_LOG_EVENTS = [
  "ABORT_FAILED",
  "ABORT_REJECTED",
  "ABORT_START",
  "ABORT_SUCCESS",
  "COMPLETE_FAILED",
  "COMPLETE_REJECTED",
  "COMPLETE_START",
  "COMPLETE_SUCCESS",
  "INITIATE_FAILED",
  "INITIATE_REJECTED",
  "INITIATE_START",
  "INITIATE_SUCCESS",
  "PARSE_REJECTED",
  "PART_FAILED",
  "PART_REJECTED",
  "PART_START",
  "PART_SUCCESS",
  "PERSIST_FAILED",
  "PERSIST_REJECTED",
  "PERSIST_START",
  "PERSIST_SUCCESS",
] as const;

const MULTIPART_UPLOAD_LOG_REASONS = [
  "access",
  "field_count",
  "field_name",
  "field_size",
  "file_count",
  "file_signature",
  "file_size",
  "file_type",
  "infrastructure",
  "missing_chunk",
  "part_count",
  "part_size",
  "parts",
  "parse",
  "persistence",
  "request",
  "session",
  "storage_response",
  "storage_unavailable",
  "unexpected_file",
] as const;

export type MultipartUploadLogEvent = (typeof MULTIPART_UPLOAD_LOG_EVENTS)[number];
export type MultipartUploadLogReason = (typeof MULTIPART_UPLOAD_LOG_REASONS)[number];

export type MultipartUploadLogData = {
  chunkSizeBytes?: number;
  elapsedMs?: number;
  expectedBytes?: number;
  mimeType?: string;
  partCount?: number;
  partNumber?: number;
  reason?: MultipartUploadLogReason;
  receivedBytes?: number;
  scope: string;
  sizeBytes?: number;
  traceId?: string;
  ttlSeconds?: number;
};

type MultipartUploadLogLevel = "error" | "info" | "warn";

const SAFE_SCOPE_PATTERN = /^[a-z][a-z0-9_]{0,63}$/;
const SAFE_MIME_TYPE_PATTERN = /^[a-z0-9][a-z0-9.+-]{0,63}\/[a-z0-9][a-z0-9.+-]{0,63}$/;
const SAFE_TRACE_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SAFE_REASONS = new Set<string>(MULTIPART_UPLOAD_LOG_REASONS);

const safeInteger = (value: number | undefined) =>
  typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : undefined;

export const isSafeMultipartTraceId = (value: unknown): value is string =>
  typeof value === "string" && SAFE_TRACE_ID_PATTERN.test(value);

const resolveLogLevel = (event: MultipartUploadLogEvent): MultipartUploadLogLevel => {
  if (event.endsWith("_FAILED")) return "error";
  if (event.endsWith("_REJECTED")) return "warn";
  return "info";
};

export const createMultipartUploadLogEntry = (
  event: MultipartUploadLogEvent,
  input: MultipartUploadLogData,
) => {
  const data: MultipartUploadLogData = {
    scope: SAFE_SCOPE_PATTERN.test(input.scope) ? input.scope : "unknown",
  };

  const numbers = {
    chunkSizeBytes: safeInteger(input.chunkSizeBytes),
    elapsedMs: safeInteger(input.elapsedMs),
    expectedBytes: safeInteger(input.expectedBytes),
    partCount: safeInteger(input.partCount),
    partNumber: safeInteger(input.partNumber),
    receivedBytes: safeInteger(input.receivedBytes),
    sizeBytes: safeInteger(input.sizeBytes),
    ttlSeconds: safeInteger(input.ttlSeconds),
  };

  for (const [key, value] of Object.entries(numbers)) {
    if (value !== undefined) Object.assign(data, { [key]: value });
  }

  if (input.mimeType && SAFE_MIME_TYPE_PATTERN.test(input.mimeType)) {
    data.mimeType = input.mimeType;
  }
  if (input.reason && SAFE_REASONS.has(input.reason)) data.reason = input.reason;
  if (isSafeMultipartTraceId(input.traceId)) data.traceId = input.traceId;

  return {
    data,
    label: `[UPLOAD_MULTIPART_${event}]`,
    level: resolveLogLevel(event),
  } as const;
};

export const logMultipartUpload = (
  event: MultipartUploadLogEvent,
  data: MultipartUploadLogData,
) => {
  const entry = createMultipartUploadLogEntry(event, data);
  console[entry.level](entry.label, entry.data);
};
