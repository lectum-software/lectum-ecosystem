import type { VideoStreamConfig } from "./config";
import { createSignedVideoDownload, createSignedVideoPlayback } from "./signing";
import type {
  ImportVideoByUrlInput,
  ProvisionedVideoUpload,
  ProvisionVideoUploadInput,
  SignedVideoDownload,
  VideoAssetUploadMethod,
  VideoStreamDetails,
  VideoStreamDownloadDetails,
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

type CloudflareDirectUploadResult = {
  uid?: unknown;
  uploadURL?: unknown;
};

type CloudflareDownload = {
  percentComplete?: unknown;
  status?: unknown;
  url?: unknown;
};

type CloudflareDownloadsResult = {
  audio?: CloudflareDownload;
  default?: CloudflareDownload;
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

const toVideoDownloadDetails = (
  download?: CloudflareDownload | null,
): VideoStreamDownloadDetails | null => {
  if (!download || typeof download !== "object") return null;
  const status = typeof download.status === "string" ? download.status.trim().toLowerCase() : "";
  if (status !== "ready" && status !== "inprogress" && status !== "error") return null;
  const percent = Number(download.percentComplete);

  return {
    percentComplete: Number.isFinite(percent) && percent >= 0 ? Math.min(100, percent) : null,
    status,
  };
};

const encodeMetadataValue = (value: string) => Buffer.from(value, "utf8").toString("base64");

export const buildUploadMetadata = (
  input: ProvisionVideoUploadInput,
  allowedOrigins: readonly string[],
) =>
  [
    `name ${encodeMetadataValue(`lectum-${input.purpose}-${input.assetId}`)}`,
    `maxDurationSeconds ${encodeMetadataValue(String(input.maxDurationSeconds))}`,
    "requiresignedurls",
    // TUS recebe domínios separados por vírgula dentro do Base64, não um array JSON.
    // Aspas/colchetes viravam parte dos domínios no Stream e bloqueavam o playback.
    `allowedorigins ${encodeMetadataValue(allowedOrigins.join(","))}`,
    `thumbnailtimestamppct ${encodeMetadataValue("0.1")}`,
    `expiry ${encodeMetadataValue(input.expiresAt.toISOString())}`,
  ].join(",");

const buildDirectUploadBody = (
  input: ProvisionVideoUploadInput,
  allowedOrigins: readonly string[],
) => ({
  allowedOrigins,
  creator: input.assetId,
  expiry: input.expiresAt.toISOString(),
  maxDurationSeconds: input.maxDurationSeconds,
  meta: {
    lectum_asset_id: input.assetId,
    name: `lectum-${input.purpose}-${input.assetId}`,
    operation: "direct_creator_upload",
    upload_method: "basic" satisfies VideoAssetUploadMethod,
  },
  requireSignedURLs: true,
  thumbnailTimestampPct: 0.1,
});

export type VideoStreamContractFailure =
  | "invalid_json"
  | "invalid_envelope"
  | "invalid_uid"
  | "upload_url_missing"
  | "upload_url_invalid"
  | "upload_url_protocol"
  | "upload_url_host"
  | "upload_url_credentials"
  | "upload_url_port"
  | "upload_url_fragment"
  | "uid_lookup_failed"
  | "uid_lookup_missing";

const DIRECT_UPLOAD_HOSTS = new Set(["upload.videodelivery.net", "upload.cloudflarestream.com"]);

// Aceitar os dois endpoints de ingestão, não qualquer subdomínio de playback.
// O caminho/query são capabilities opacas: nunca reconstruir, extrair UID ou logar.
export const getCloudflareDirectUploadUrlFailure = (
  value: string,
): VideoStreamContractFailure | null => {
  if (!value) return "upload_url_missing";
  if (
    value.length > 16_384 ||
    value.includes("\\") ||
    Array.from(value).some((character) => {
      const code = character.charCodeAt(0);
      return code <= 32 || code === 127;
    })
  ) {
    return "upload_url_invalid";
  }

  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return "upload_url_protocol";
    if (!DIRECT_UPLOAD_HOSTS.has(url.hostname)) return "upload_url_host";
    if (url.username || url.password) return "upload_url_credentials";
    if (url.port) return "upload_url_port";
    if (url.hash) return "upload_url_fragment";
    return null;
  } catch {
    return "upload_url_invalid";
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
  readonly reason: VideoStreamContractFailure | undefined;

  constructor(operation: string, status: number | null, reason?: VideoStreamContractFailure) {
    super("VIDEO_STREAM_PROVIDER_UNAVAILABLE");
    this.name = "VideoStreamProviderError";
    this.operation = operation;
    this.status = status;
    this.reason = reason;
  }

  get canFallbackToTus() {
    // Timeout/5xx/contrato 2xx podem já ter reservado um vídeo. Não criar outro.
    return (
      this.operation === "provision_direct_upload" &&
      this.status !== null &&
      [400, 404, 405, 415, 422].includes(this.status)
    );
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

  private async provisionTusUpload(
    input: ProvisionVideoUploadInput,
  ): Promise<ProvisionedVideoUpload> {
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

    const uploadUrlFailure = getCloudflareDirectUploadUrlFailure(uploadUrl);
    if (uploadUrlFailure) {
      throw new VideoStreamProviderError(
        "provision_upload_contract",
        response.status,
        uploadUrlFailure,
      );
    }

    if (isCloudflareStreamVideoUid(providerUid)) {
      return { providerUid, uploadMethod: "tus", uploadUrl };
    }

    let details: VideoStreamDetails | null = null;
    try {
      details = await this.findVideoByCreator(input.assetId);
    } catch {
      throw new VideoStreamProviderError(
        "provision_upload_contract",
        response.status,
        "uid_lookup_failed",
      );
    }

    if (!details) {
      throw new VideoStreamProviderError(
        "provision_upload_contract",
        response.status,
        "uid_lookup_missing",
      );
    }

    return { providerUid: details.providerUid, uploadMethod: "tus", uploadUrl };
  }

  private async provisionBasicUpload(
    input: ProvisionVideoUploadInput,
  ): Promise<ProvisionedVideoUpload> {
    const response = await this.request(
      "/direct_upload",
      {
        body: JSON.stringify(buildDirectUploadBody(input, this.config.allowedOrigins)),
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Upload-Creator": input.assetId,
        },
      },
      "provision_direct_upload",
    );

    let envelope: CloudflareEnvelope<CloudflareDirectUploadResult>;
    try {
      envelope = (await response.json()) as CloudflareEnvelope<CloudflareDirectUploadResult>;
    } catch {
      throw new VideoStreamProviderError(
        "provision_direct_upload_contract",
        response.status,
        "invalid_json",
      );
    }

    if (!envelope || typeof envelope !== "object" || envelope.success !== true) {
      throw new VideoStreamProviderError(
        "provision_direct_upload_contract",
        response.status,
        "invalid_envelope",
      );
    }
    const providerUid = typeof envelope.result?.uid === "string" ? envelope.result.uid.trim() : "";
    const uploadUrl =
      typeof envelope.result?.uploadURL === "string" ? envelope.result.uploadURL.trim() : "";

    if (!isCloudflareStreamVideoUid(providerUid)) {
      throw new VideoStreamProviderError(
        "provision_direct_upload_contract",
        response.status,
        "invalid_uid",
      );
    }
    const uploadUrlFailure = getCloudflareDirectUploadUrlFailure(uploadUrl);
    if (uploadUrlFailure) {
      throw new VideoStreamProviderError(
        "provision_direct_upload_contract",
        response.status,
        uploadUrlFailure,
      );
    }

    return { providerUid, uploadMethod: "basic", uploadUrl };
  }

  async provisionUpload(input: ProvisionVideoUploadInput): Promise<ProvisionedVideoUpload> {
    return input.uploadMethod === "basic"
      ? this.provisionBasicUpload(input)
      : this.provisionTusUpload(input);
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

  async getVideoDownload(providerUid: string): Promise<VideoStreamDownloadDetails | null> {
    if (!isCloudflareStreamVideoUid(providerUid)) {
      throw new VideoStreamProviderError("get_download_contract", null);
    }
    const response = await this.request(
      `/${encodeURIComponent(providerUid)}/downloads`,
      {},
      "get_download",
    );
    let envelope: CloudflareEnvelope<CloudflareDownloadsResult>;

    try {
      envelope = (await response.json()) as CloudflareEnvelope<CloudflareDownloadsResult>;
    } catch {
      throw new VideoStreamProviderError("get_download_contract", response.status);
    }

    if (envelope.success !== true || !envelope.result || typeof envelope.result !== "object") {
      throw new VideoStreamProviderError("get_download_contract", response.status);
    }

    return toVideoDownloadDetails(envelope.result.default ?? null);
  }

  async createVideoDownload(providerUid: string): Promise<VideoStreamDownloadDetails> {
    if (!isCloudflareStreamVideoUid(providerUid)) {
      throw new VideoStreamProviderError("create_download_contract", null);
    }
    const response = await this.request(
      `/${encodeURIComponent(providerUid)}/downloads`,
      { method: "POST" },
      "create_download",
    );
    let envelope: CloudflareEnvelope<CloudflareDownloadsResult>;

    try {
      envelope = (await response.json()) as CloudflareEnvelope<CloudflareDownloadsResult>;
    } catch {
      throw new VideoStreamProviderError("create_download_contract", response.status);
    }

    const details = envelope.result ? toVideoDownloadDetails(envelope.result.default) : null;
    if (envelope.success !== true || !details) {
      throw new VideoStreamProviderError("create_download_contract", response.status);
    }

    return details;
  }

  async ensureVideoDownload(providerUid: string): Promise<VideoStreamDownloadDetails> {
    const current = await this.getVideoDownload(providerUid);
    if (current) return current;

    return this.createVideoDownload(providerUid);
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

  createDownload(
    providerUid: string,
    options: { fileName?: string | null; original?: boolean } = {},
  ): SignedVideoDownload {
    if (!isCloudflareStreamVideoUid(providerUid)) {
      throw new VideoStreamProviderError("create_download_url_contract", null);
    }
    return createSignedVideoDownload(this.config, providerUid, options);
  }
}
