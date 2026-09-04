import type { VideoStreamConfig } from "./config";
import { createSignedVideoPlayback } from "./signing";
import type {
  ImportVideoByUrlInput,
  ProvisionedVideoUpload,
  ProvisionVideoUploadInput,
  VideoStreamDetails,
} from "./types";

type CloudflareVideo = {
  creator?: unknown;
  duration?: unknown;
  input?: { height?: unknown; width?: unknown };
  readyToStream?: unknown;
  status?: { errorReasonCode?: unknown; errReasonCode?: unknown; state?: unknown };
  uid?: unknown;
};

type CloudflareEnvelope<T> = {
  result?: T;
  success?: boolean;
};

const API_BASE = "https://api.cloudflare.com/client/v4";

const toFiniteNumber = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
};

const toDimension = (value: unknown) => {
  const parsed = toFiniteNumber(value);
  return parsed === null ? null : Math.round(parsed);
};

const classifyStatus = (video: CloudflareVideo): VideoStreamDetails["status"] => {
  if (video.readyToStream === true && video.status?.state === "ready") return "ready";
  if (video.status?.state === "error") return "error";
  if (video.status?.state === "pendingupload") return "uploading";
  return "processing";
};

const normalizeProviderErrorCode = (value: unknown) => {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";
  return /^[a-z0-9_-]{1,80}$/.test(normalized) ? normalized : null;
};

const toVideoStreamDetails = (
  video: CloudflareVideo,
  expectedProviderUid?: string,
): VideoStreamDetails | null => {
  const providerUid = typeof video.uid === "string" ? video.uid.trim() : "";
  if (
    !isCloudflareStreamVideoUid(providerUid) ||
    (expectedProviderUid && providerUid !== expectedProviderUid)
  ) {
    return null;
  }

  return {
    durationSeconds: toFiniteNumber(video.duration),
    errorCode: normalizeProviderErrorCode(
      video.status?.errorReasonCode ?? video.status?.errReasonCode,
    ),
    height: toDimension(video.input?.height),
    providerUid,
    status: classifyStatus(video),
    width: toDimension(video.input?.width),
  };
};

const encodeMetadataValue = (value: string) => Buffer.from(value, "utf8").toString("base64");

const buildUploadMetadata = (input: ProvisionVideoUploadInput, allowedOrigins: readonly string[]) =>
  [
    `name ${encodeMetadataValue(`lectum-${input.purpose}-${input.assetId}`)}`,
    `maxDurationSeconds ${encodeMetadataValue(String(input.maxDurationSeconds))}`,
    "requiresignedurls",
    `allowedorigins ${encodeMetadataValue(JSON.stringify(allowedOrigins))}`,
    `thumbnailtimestamppct ${encodeMetadataValue("0.1")}`,
    `expiry ${encodeMetadataValue(input.expiresAt.toISOString())}`,
  ].join(",");

const isCloudflareDirectUploadUrl = (value: string) => {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      url.hostname === "upload.videodelivery.net" &&
      !url.username &&
      !url.password
    );
  } catch {
    return false;
  }
};

export const isCloudflareStreamVideoUid = (value: string) => /^[a-f0-9]{32}$/i.test(value);

const isMigrationCreatorId = (value: string) => /^[a-z0-9_-]{8,64}$/i.test(value);

const isSafeImportSourceUrl = (value: string) => {
  if (!value || value.length > 4_096 || value.includes("\\")) return false;

  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password && !url.hash;
  } catch {
    return false;
  }
};

export class VideoStreamProviderError extends Error {
  readonly operation: string;
  readonly status: number | null;

  constructor(operation: string, status: number | null) {
    super("VIDEO_STREAM_PROVIDER_UNAVAILABLE");
    this.name = "VideoStreamProviderError";
    this.operation = operation;
    this.status = status;
  }
}

export class CloudflareStreamAdapter {
  constructor(
    private readonly config: VideoStreamConfig,
    private readonly fetcher: typeof fetch = fetch,
  ) {}

  private endpoint(path: string) {
    return `${API_BASE}/accounts/${this.config.accountId}/stream${path}`;
  }

  private async request(path: string, init: RequestInit, operation: string) {
    let response: Response;

    try {
      response = await this.fetcher(this.endpoint(path), {
        ...init,
        headers: {
          ...init.headers,
          Authorization: `Bearer ${this.config.apiToken}`,
        },
        signal: AbortSignal.timeout(this.config.requestTimeoutMs),
      });
    } catch {
      throw new VideoStreamProviderError(operation, null);
    }

    if (!response.ok) {
      await response.body?.cancel().catch(() => undefined);
      throw new VideoStreamProviderError(operation, response.status);
    }

    return response;
  }

  async provisionUpload(input: ProvisionVideoUploadInput): Promise<ProvisionedVideoUpload> {
    const response = await this.request(
      "?direct_user=true",
      {
        method: "POST",
        headers: {
          "Tus-Resumable": "1.0.0",
          "Upload-Creator": input.assetId,
          "Upload-Length": String(input.sizeBytes),
          "Upload-Metadata": buildUploadMetadata(input, this.config.allowedOrigins),
        },
      },
      "provision_upload",
    );
    const uploadUrl = response.headers.get("location")?.trim() ?? "";
    const providerUid = response.headers.get("stream-media-id")?.trim() ?? "";

    if (!isCloudflareDirectUploadUrl(uploadUrl) || !isCloudflareStreamVideoUid(providerUid)) {
      throw new VideoStreamProviderError("provision_upload_contract", response.status);
    }

    return { providerUid, uploadUrl };
  }

  async importVideoByUrl(input: ImportVideoByUrlInput): Promise<VideoStreamDetails> {
    if (!isMigrationCreatorId(input.assetId) || !isSafeImportSourceUrl(input.sourceUrl)) {
      throw new VideoStreamProviderError("import_video_contract", null);
    }

    const response = await this.request(
      "/copy",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          allowedOrigins: this.config.allowedOrigins,
          creator: input.assetId,
          input: input.sourceUrl,
          meta: {
            lectum_asset_id: input.assetId,
            operation: "r2_to_stream",
          },
          requireSignedURLs: true,
          thumbnailTimestampPct: 0.1,
        }),
      },
      "import_video",
    );

    let envelope: CloudflareEnvelope<CloudflareVideo>;
    try {
      envelope = (await response.json()) as CloudflareEnvelope<CloudflareVideo>;
    } catch {
      throw new VideoStreamProviderError("import_video_contract", response.status);
    }

    const details = envelope.result ? toVideoStreamDetails(envelope.result) : null;
    if (envelope.success !== true || envelope.result?.creator !== input.assetId || !details) {
      throw new VideoStreamProviderError("import_video_contract", response.status);
    }

    return details;
  }

  async findVideoByCreator(assetId: string): Promise<VideoStreamDetails | null> {
    if (!isMigrationCreatorId(assetId)) {
      throw new VideoStreamProviderError("find_video_by_creator_contract", null);
    }

    const query = new URLSearchParams({
      creator: assetId,
      include_counts: "false",
      limit: "10",
    });
    const response = await this.request(`?${query}`, {}, "find_video_by_creator");
    let envelope: CloudflareEnvelope<CloudflareVideo[]>;

    try {
      envelope = (await response.json()) as CloudflareEnvelope<CloudflareVideo[]>;
    } catch {
      throw new VideoStreamProviderError("find_video_by_creator_contract", response.status);
    }

    if (
      envelope.success !== true ||
      !Array.isArray(envelope.result) ||
      envelope.result.length > 1 ||
      envelope.result.some((video) => video.creator !== assetId)
    ) {
      throw new VideoStreamProviderError("find_video_by_creator_contract", response.status);
    }

    const matches = envelope.result.map((video) => toVideoStreamDetails(video));
    const validMatches = matches.filter((details): details is VideoStreamDetails =>
      Boolean(details),
    );

    if (validMatches.length !== envelope.result.length) {
      throw new VideoStreamProviderError("find_video_by_creator_contract", response.status);
    }

    return validMatches[0] ?? null;
  }

  async getVideo(providerUid: string): Promise<VideoStreamDetails> {
    if (!isCloudflareStreamVideoUid(providerUid)) {
      throw new VideoStreamProviderError("get_video_contract", null);
    }
    const response = await this.request(`/${encodeURIComponent(providerUid)}`, {}, "get_video");
    let envelope: CloudflareEnvelope<CloudflareVideo>;

    try {
      envelope = (await response.json()) as CloudflareEnvelope<CloudflareVideo>;
    } catch {
      throw new VideoStreamProviderError("get_video_contract", response.status);
    }

    const details = envelope.result ? toVideoStreamDetails(envelope.result, providerUid) : null;
    if (envelope.success !== true || !details) {
      throw new VideoStreamProviderError("get_video_contract", response.status);
    }

    return details;
  }

  async deleteVideo(providerUid: string) {
    if (!isCloudflareStreamVideoUid(providerUid)) {
      throw new VideoStreamProviderError("delete_video_contract", null);
    }
    await this.request(`/${encodeURIComponent(providerUid)}`, { method: "DELETE" }, "delete_video");
  }

  createPlayback(providerUid: string) {
    if (!isCloudflareStreamVideoUid(providerUid)) {
      throw new VideoStreamProviderError("create_playback_contract", null);
    }
    return createSignedVideoPlayback(this.config, providerUid);
  }
}
