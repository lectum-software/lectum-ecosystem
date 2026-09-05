export const VIDEO_QUEUE_NAME = "lectum-video-processing";
export const VIDEO_JOB_NAME = "compress";

export type VideoJobOperation = "compress" | "social_share";

export type SocialShareRenderMetadata = {
  cardLabel: string;
  professionalName: string;
  professionalRoleLabel: string;
  professionalVerified: boolean;
  responseText: string | null;
  sourceText: string;
};

export type CompressionVideoJobData = {
  cancelRequested: boolean;
  createdAt: string;
  operation: "compress";
};

export type SocialShareVideoJobData = {
  cancelRequested: boolean;
  createdAt: string;
  metadata: SocialShareRenderMetadata;
  operation: "social_share";
  sourceUrl: string;
};

export type VideoJobData = CompressionVideoJobData | SocialShareVideoJobData;

export type VideoJobResult = {
  durationSeconds: number;
  outputSizeBytes: number;
};

export type PublicVideoJobStatus =
  | "queued"
  | "processing"
  | "completed"
  | "failed"
  | "cancel_requested"
  | "canceled";

export type PublicVideoJob = {
  completed_at: string | null;
  created_at: string;
  download_url: string | null;
  failed_at: string | null;
  failure_code: "canceled" | "invalid_video" | "processing_failed" | null;
  job_id: string;
  output_size_bytes: number | null;
  progress: number;
  started_at: string | null;
  status: PublicVideoJobStatus;
};

export class VideoProcessingError extends Error {
  readonly code: "canceled" | "invalid_video" | "processing_failed";
  readonly retryable: boolean;

  constructor(
    code: VideoProcessingError["code"],
    options: { cause?: unknown; retryable?: boolean } = {},
  ) {
    super(code, options.cause === undefined ? undefined : { cause: options.cause });
    this.name = "VideoProcessingError";
    this.code = code;
    this.retryable = options.retryable ?? false;
  }
}
