import { createHash } from "node:crypto";

export type VideoRetentionReason = "legacy_r2_inventory" | "replaced" | "removed";
export type VideoRetentionProvider = "cloudflare_r2" | "cloudflare_stream";

export const videoRetentionIdentity = (
  provider: VideoRetentionProvider,
  namespace: string,
  objectKey: string,
) =>
  createHash("sha256")
    .update(JSON.stringify([provider, namespace, objectKey]))
    .digest("hex");

// A missing policy date is a hold, never an implicit permission to purge.
export const isVideoRetentionReviewDue = (reviewAfter: Date | null, now: Date) =>
  reviewAfter !== null && reviewAfter.getTime() <= now.getTime();

export const shouldRetainCanceledVideo = (asset: { ready_at: Date | null; status: string }) =>
  asset.ready_at !== null || asset.status === "ready";

export const isLegacyR2VideoKey = (key: string) =>
  key.startsWith("psychologist/video/") || key.startsWith("posts/share-artifacts/");

export const r2InventoryReference = (bucket: string, key: string) =>
  createHash("sha256").update(`${bucket}/${key}`).digest("hex").slice(0, 16);
