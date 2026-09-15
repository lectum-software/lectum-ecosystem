import {
  GetObjectCommand,
  type GetObjectCommandOutput,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import { matchesDeclaredFileType } from "@/config/multer/file-signature";
import { isR2Configured, PUBLIC_BUCKET, S3 } from "@/config/multer/s3";
import { r2InventoryReference } from "./policy";
import {
  retainVideoObject,
  retentionRecordMatchesObject,
  VideoRetentionRepository,
} from "./repository";

const MAX_OBJECTS = 10_000;
const PREFIX_BYTES = 4_096;
const videoTypes = ["video/mp4", "video/quicktime", "video/webm"];
const imageTypes = ["image/jpeg", "image/png", "image/webp"];

export const catalogLegacyR2Videos = async (options: {
  apply: boolean;
  limit: number;
  reviewAfter?: Date;
}) => {
  if (!Number.isSafeInteger(options.limit) || options.limit < 1 || options.limit > 50) {
    throw new Error("invalid_limit");
  }
  if (!isR2Configured()) throw new Error("configuration_required");
  const repository = new VideoRetentionRepository();
  const report = {
    listed: 0,
    inspected: 0,
    images: 0,
    unknown: 0,
    existing: 0,
    conflicts: 0,
    eligible: 0,
    recorded: 0,
    failed: 0,
    inventoryComplete: false,
    objectsWritten: 0,
    objectsDeleted: 0,
    items: [] as {
      ref: string;
      outcome: "eligible" | "recorded" | "existing" | "conflict" | "failed";
    }[],
  };
  let token: string | undefined;
  outer: do {
    const page = await S3.send(
      new ListObjectsV2Command({
        Bucket: PUBLIC_BUCKET,
        MaxKeys: 100,
        ContinuationToken: token,
      }),
      { abortSignal: AbortSignal.timeout(15_000) },
    );
    for (const object of page.Contents ?? []) {
      if (++report.listed > MAX_OBJECTS || report.items.length >= options.limit) break outer;
      const key = object.Key;
      if (!key || !object.ETag || !Number.isSafeInteger(object.Size) || object.Size! <= 0) {
        report.unknown++;
        continue;
      }
      const sizeBytes = BigInt(object.Size!);
      const ref = r2InventoryReference(PUBLIC_BUCKET, key);
      const existing = await repository.findR2Object(PUBLIC_BUCKET, key);
      if (existing) {
        if (retentionRecordMatchesObject(existing, object.ETag, sizeBytes)) report.existing++;
        else {
          report.conflicts++;
          report.items.push({ ref, outcome: "conflict" });
        }
        continue;
      }
      let response: GetObjectCommandOutput | undefined;
      try {
        response = await S3.send(
          new GetObjectCommand({
            Bucket: PUBLIC_BUCKET,
            Key: key,
            IfMatch: object.ETag,
            Range: `bytes=0-${Math.min(PREFIX_BYTES, object.Size!) - 1}`,
          }),
          { abortSignal: AbortSignal.timeout(15_000) },
        );
        if (
          response.$metadata.httpStatusCode !== 206 ||
          !response.Body ||
          response.ETag !== object.ETag ||
          !Number.isSafeInteger(response.ContentLength) ||
          response.ContentLength !== Math.min(PREFIX_BYTES, object.Size!)
        )
          throw new Error("bounded_read_required");
        const prefix = Buffer.from(await response.Body.transformToByteArray());
        if (prefix.length !== response.ContentLength) throw new Error("bounded_read_required");
        report.inspected++;
        if (!videoTypes.some((mimeType) => matchesDeclaredFileType(prefix, mimeType))) {
          if (imageTypes.some((mimeType) => matchesDeclaredFileType(prefix, mimeType)))
            report.images++;
          else report.unknown++;
          continue;
        }
        if (!options.apply) {
          report.eligible++;
          report.items.push({ ref, outcome: "eligible" });
          continue;
        }
        const created = await retainVideoObject({
          provider: "cloudflare_r2",
          namespace: PUBLIC_BUCKET,
          objectKey: key,
          reason: "legacy_r2_inventory",
          sizeBytes,
          etag: object.ETag,
          reviewAfter: options.reviewAfter,
        });
        if (created) {
          report.recorded++;
          report.items.push({ ref, outcome: "recorded" });
        } else {
          const concurrent = await repository.findR2Object(PUBLIC_BUCKET, key);
          if (concurrent && retentionRecordMatchesObject(concurrent, object.ETag, sizeBytes)) {
            report.existing++;
            report.items.push({ ref, outcome: "existing" });
          } else {
            report.conflicts++;
            report.items.push({ ref, outcome: "conflict" });
          }
        }
      } catch {
        report.failed++;
        report.items.push({ ref, outcome: "failed" });
      } finally {
        if (response?.Body && "destroy" in response.Body) response.Body.destroy();
      }
    }
    if (!page.IsTruncated) {
      report.inventoryComplete = true;
      break;
    }
    if (!page.NextContinuationToken || page.NextContinuationToken === token)
      throw new Error("pagination_invalid");
    token = page.NextContinuationToken;
  } while (token);
  return report;
};
