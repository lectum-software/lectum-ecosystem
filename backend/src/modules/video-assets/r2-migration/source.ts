import { HeadObjectCommand, type HeadObjectCommandOutput } from "@aws-sdk/client-s3";
import { UPLOAD_LIMITS } from "@/config/multer/limits";
import { isR2Configured, PUBLIC_BUCKET, S3 } from "@/config/multer/s3";
import { videoStreamImportSourceUrl } from "@/utils/video-stream-import-source";
import type { InspectedLegacyVideoSource, LegacyVideoCandidate, R2MigrationPurpose } from "./types";

const VIDEO_MIME_TYPES = new Set(["video/mp4", "video/quicktime", "video/webm"]);
const SOURCE_PROBE_TIMEOUT_MS = 30_000;

const maxBytesByPurpose: Record<R2MigrationPurpose, number> = {
  community_post: UPLOAD_LIMITS.community.postMediaMultipartTotalMb * 1024 * 1024,
  community_reply: UPLOAD_LIMITS.postReply.multipartTotalMb * 1024 * 1024,
  profile_presentation: UPLOAD_LIMITS.psychologist.videoMultipartTotalMb * 1024 * 1024,
};

const mimeTypeByExtension: Record<string, string> = {
  mov: "video/quicktime",
  mp4: "video/mp4",
  webm: "video/webm",
};

type SourceProbeDiagnostic = {
  acceptRangesMatches?: boolean;
  cacheStatus?: "bypass" | "dynamic" | "hit" | "miss" | "other";
  contentLengthMatches?: boolean;
  contentRangeMatches?: boolean;
  httpStatus: number;
  probe: "head" | "range";
};

export class R2MigrationSourceError extends Error {
  constructor(
    readonly reason: string,
    readonly diagnostic?: SourceProbeDiagnostic,
  ) {
    super("R2_MIGRATION_SOURCE_UNAVAILABLE");
    this.name = "R2MigrationSourceError";
  }
}

const resolveMimeType = (contentType: string | undefined, objectKey: string) => {
  const normalized = contentType?.trim().toLowerCase().split(";", 1)[0] ?? "";
  if (VIDEO_MIME_TYPES.has(normalized)) return normalized;
  if (normalized && normalized !== "application/octet-stream") return null;

  const extension = objectKey.toLowerCase().split(".").at(-1) ?? "";
  return mimeTypeByExtension[extension] ?? null;
};

const cancelResponse = async (response: Response) => {
  await response.body?.cancel().catch(() => undefined);
};

const normalizeCacheStatus = (value: string | null): SourceProbeDiagnostic["cacheStatus"] => {
  const normalized = value?.trim().toLowerCase() ?? "";
  if (
    normalized === "bypass" ||
    normalized === "dynamic" ||
    normalized === "hit" ||
    normalized === "miss"
  ) {
    return normalized;
  }
  return "other";
};

export const probeR2MigrationPublicSource = async (
  publicUrl: string,
  expectedSize: number,
  fetcher: typeof fetch = fetch,
) => {
  let head: Response;
  try {
    head = await fetcher(publicUrl, {
      method: "HEAD",
      redirect: "error",
      signal: AbortSignal.timeout(SOURCE_PROBE_TIMEOUT_MS),
    });
  } catch {
    throw new R2MigrationSourceError("public_source_head_failed");
  }

  const headLength = Number(head.headers.get("content-length"));
  const headContentRange = head.headers.get("content-range")?.trim() ?? "";
  const headDiagnostic: SourceProbeDiagnostic = {
    acceptRangesMatches: head.headers.get("accept-ranges")?.trim().toLowerCase() === "bytes",
    cacheStatus: normalizeCacheStatus(head.headers.get("cf-cache-status")),
    contentLengthMatches: headLength === expectedSize,
    contentRangeMatches: headContentRange === `bytes 0-${expectedSize - 1}/${expectedSize}`,
    httpStatus: head.status,
    probe: "head",
  };
  await cancelResponse(head);
  if (
    !head.ok ||
    !headDiagnostic.contentLengthMatches ||
    !headDiagnostic.acceptRangesMatches ||
    !headDiagnostic.contentRangeMatches
  ) {
    throw new R2MigrationSourceError("public_source_head_invalid", headDiagnostic);
  }

  let range: Response;
  try {
    range = await fetcher(publicUrl, {
      headers: { Range: "bytes=0-0" },
      redirect: "error",
      signal: AbortSignal.timeout(SOURCE_PROBE_TIMEOUT_MS),
    });
  } catch {
    throw new R2MigrationSourceError("public_source_range_failed");
  }

  const contentRange = range.headers.get("content-range")?.trim() ?? "";
  const rangeDiagnostic: SourceProbeDiagnostic = {
    acceptRangesMatches: range.headers.get("accept-ranges")?.trim().toLowerCase() === "bytes",
    cacheStatus: normalizeCacheStatus(range.headers.get("cf-cache-status")),
    contentLengthMatches: Number(range.headers.get("content-length")) === 1,
    contentRangeMatches: contentRange === `bytes 0-0/${expectedSize}`,
    httpStatus: range.status,
    probe: "range",
  };
  await cancelResponse(range);
  if (
    range.status !== 206 ||
    !rangeDiagnostic.acceptRangesMatches ||
    !rangeDiagnostic.contentLengthMatches ||
    !rangeDiagnostic.contentRangeMatches
  ) {
    throw new R2MigrationSourceError("public_source_range_invalid", rangeDiagnostic);
  }
};

export const inspectLegacyVideoSource = async (
  candidate: LegacyVideoCandidate,
): Promise<InspectedLegacyVideoSource> => {
  if (!isR2Configured()) throw new R2MigrationSourceError("r2_not_configured");

  let metadata: HeadObjectCommandOutput;
  try {
    metadata = await S3.send(
      new HeadObjectCommand({
        Bucket: PUBLIC_BUCKET,
        Key: candidate.sourceObjectKey,
      }),
    );
  } catch {
    throw new R2MigrationSourceError("r2_object_not_found");
  }

  const sizeBytes = Number(metadata.ContentLength);
  if (
    !Number.isSafeInteger(sizeBytes) ||
    sizeBytes <= 0 ||
    sizeBytes > maxBytesByPurpose[candidate.purpose]
  ) {
    throw new R2MigrationSourceError("r2_object_size_invalid");
  }

  const mimeType = resolveMimeType(metadata.ContentType, candidate.sourceObjectKey);
  if (!mimeType) throw new R2MigrationSourceError("r2_object_type_invalid");

  const publicUrl = videoStreamImportSourceUrl(candidate.sourceObjectKey, {
    productionRuntime: true,
  });
  if (!publicUrl) throw new R2MigrationSourceError("public_base_url_invalid");
  let parsedPublicUrl: URL;
  try {
    parsedPublicUrl = new URL(publicUrl);
  } catch {
    throw new R2MigrationSourceError("public_base_url_invalid");
  }
  if (parsedPublicUrl.protocol !== "https:" || parsedPublicUrl.search || parsedPublicUrl.hash) {
    throw new R2MigrationSourceError("public_base_url_invalid");
  }

  await probeR2MigrationPublicSource(parsedPublicUrl.toString(), sizeBytes);

  return {
    mimeType,
    publicUrl: parsedPublicUrl.toString(),
    sizeBytes,
  };
};
