import { createHash } from "node:crypto";
import { z } from "zod";
import { VIDEO_ASSET_PURPOSES } from "@/infra/video-stream/types";

const transportDiagnosticSchema = z
  .object({
    request: z.enum(["HEAD", "PATCH", "POST", "unknown"]),
    source: z.enum(["not_read", "reading", "ready", "failed"]),
    sourceFailure: z.enum([
      "none",
      "unreadable",
      "permission",
      "missing",
      "changed",
      "invalid_range",
      "unknown",
    ]),
  })
  .strict();

export const videoUploadClientEventSchema = z
  .object({
    event: z.enum(["transfer_start", "transfer_complete", "ready", "failed", "canceled"]),
    phase: z.enum(["transfer", "processing"]),
    method: z.enum(["tus", "basic"]),
    reason: z.enum([
      "none",
      "network",
      "http",
      "transport",
      "processing",
      "processing_timeout",
      "canceled",
      "unknown",
    ]),
    httpStatus: z.number().int().min(0).max(599),
    progress: z.number().int().min(0).max(100),
    elapsedMs: z.number().int().min(0).max(86_400_000),
    retryCount: z.number().int().min(0).max(100),
    online: z.boolean(),
    visibility: z.enum(["visible", "hidden"]),
    wasHidden: z.boolean(),
    transport: transportDiagnosticSchema.optional(),
  })
  .strict();

export type VideoUploadClientEvent = z.infer<typeof videoUploadClientEventSchema>;

const purposeSchema = z.enum(VIDEO_ASSET_PURPOSES);

export const resolveVideoUploadRef = (assetId: string) =>
  createHash("sha256").update(assetId).digest("hex").slice(0, 16);

export const toVideoUploadClientEventLog = (
  event: VideoUploadClientEvent,
  asset: { id: string; purpose: string },
) => {
  const purpose = purposeSchema.safeParse(asset.purpose);
  const transport = transportDiagnosticSchema.safeParse(event.transport);
  return {
    event: event.event,
    phase: event.phase,
    method: event.method,
    reason: event.reason,
    httpStatus: event.httpStatus,
    progress: event.progress,
    elapsedMs: event.elapsedMs,
    retryCount: event.retryCount,
    online: event.online,
    visibility: event.visibility,
    wasHidden: event.wasHidden,
    purpose: purpose.success ? purpose.data : null,
    uploadRef: resolveVideoUploadRef(asset.id),
    ...(transport.success ? { transport: transport.data } : {}),
  };
};
