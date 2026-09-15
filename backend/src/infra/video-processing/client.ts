import type { VideoProcessingServiceConfig } from "./config";

const MAX_JSON_RESPONSE_BYTES = 16 * 1_024;
const SERVICE_VERSION_PATTERN = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;

type VideoProcessingOperation = "authentication" | "readiness" | "version";
type VideoProcessingFailure = "authentication" | "contract" | "not_ready" | "unreachable";

type JsonRecord = Record<string, unknown>;
type SuccessEnvelope = {
  data: JsonRecord;
  status: number;
  success: true;
};

export type VideoProcessingConnectionCheck = {
  authentication: "valid";
  readiness: "ready";
  version: string;
};

export class VideoProcessingServiceError extends Error {
  readonly failure: VideoProcessingFailure;
  readonly operation: VideoProcessingOperation;
  readonly status: number | null;

  constructor(
    operation: VideoProcessingOperation,
    failure: VideoProcessingFailure,
    status: number | null,
  ) {
    super("VIDEO_PROCESSING_SERVICE_UNAVAILABLE");
    this.name = "VideoProcessingServiceError";
    this.failure = failure;
    this.operation = operation;
    this.status = status;
  }
}

const isRecord = (value: unknown): value is JsonRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const readLimitedJson = async (response: Response, operation: VideoProcessingOperation) => {
  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
  if (!contentType.startsWith("application/json")) {
    await response.body?.cancel().catch(() => undefined);
    throw new VideoProcessingServiceError(operation, "contract", response.status);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new VideoProcessingServiceError(operation, "contract", response.status);

  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > MAX_JSON_RESPONSE_BYTES) {
        await reader.cancel().catch(() => undefined);
        throw new VideoProcessingServiceError(operation, "contract", response.status);
      }
      chunks.push(value);
    }

    const body = Buffer.concat(
      chunks.map((chunk) => Buffer.from(chunk)),
      totalBytes,
    ).toString("utf8");
    return JSON.parse(body) as unknown;
  } catch (error) {
    if (error instanceof VideoProcessingServiceError) throw error;
    throw new VideoProcessingServiceError(operation, "contract", response.status);
  }
};

const isSuccessEnvelope = (payload: unknown, status: number): payload is SuccessEnvelope =>
  isRecord(payload) &&
  payload.success === true &&
  payload.status === status &&
  isRecord(payload.data);

export class VideoProcessingServiceClient {
  constructor(
    private readonly config: VideoProcessingServiceConfig,
    private readonly fetcher: typeof fetch = fetch,
  ) {}

  private async request(path: string, operation: VideoProcessingOperation, authenticated = false) {
    try {
      return await this.fetcher(`${this.config.baseUrl}${path}`, {
        headers: {
          Accept: "application/json",
          ...(authenticated ? { Authorization: `Bearer ${this.config.apiKey}` } : {}),
        },
        redirect: "error",
        signal: AbortSignal.timeout(this.config.requestTimeoutMs),
      });
    } catch {
      throw new VideoProcessingServiceError(operation, "unreachable", null);
    }
  }

  async checkReadiness() {
    const operation = "readiness" as const;
    const response = await this.request("/ready", operation);
    if (response.status !== 200) {
      await response.body?.cancel().catch(() => undefined);
      throw new VideoProcessingServiceError(operation, "not_ready", response.status);
    }

    const payload = await readLimitedJson(response, operation);
    if (!isSuccessEnvelope(payload, 200) || payload.data.status !== "ready") {
      throw new VideoProcessingServiceError(operation, "contract", response.status);
    }
  }

  async getVersion() {
    const operation = "version" as const;
    const response = await this.request("/version", operation);
    if (response.status !== 200) {
      await response.body?.cancel().catch(() => undefined);
      throw new VideoProcessingServiceError(operation, "contract", response.status);
    }

    const payload = await readLimitedJson(response, operation);
    const version = isSuccessEnvelope(payload, 200) ? payload.data.version : null;
    if (typeof version !== "string" || !SERVICE_VERSION_PATTERN.test(version)) {
      throw new VideoProcessingServiceError(operation, "contract", response.status);
    }

    return version;
  }

  async verifyAuthentication() {
    const operation = "authentication" as const;
    const response = await this.request("/api/private/jobs/connection-check", operation, true);
    if (response.status === 401 || response.status === 403) {
      await response.body?.cancel().catch(() => undefined);
      throw new VideoProcessingServiceError(operation, "authentication", response.status);
    }
    if (response.status !== 404) {
      await response.body?.cancel().catch(() => undefined);
      throw new VideoProcessingServiceError(operation, "contract", response.status);
    }

    const payload = await readLimitedJson(response, operation);
    if (
      !isRecord(payload) ||
      payload.success !== false ||
      payload.status !== 404 ||
      payload.code !== "job_not_found"
    ) {
      throw new VideoProcessingServiceError(operation, "contract", response.status);
    }
  }

  async checkConnection(): Promise<VideoProcessingConnectionCheck> {
    await this.checkReadiness();
    const version = await this.getVersion();
    await this.verifyAuthentication();

    return { authentication: "valid", readiness: "ready", version };
  }
}
