export type VideoAssetPurpose = "profile_presentation" | "community_post" | "community_reply";

export type VideoAssetStatus = "uploading" | "processing" | "ready" | "error" | "canceled";
export type VideoAssetUploadMethod = "basic" | "tus";

export type VideoAssetUploadRequest = {
  contextId?: string;
  mimeType: string;
  purpose: VideoAssetPurpose;
  size: number;
};

export type VideoAssetUploadResponse = {
  asset_id: string;
  expires_at: string;
  max_file_size: number;
  status: "uploading";
  upload_method?: VideoAssetUploadMethod;
  upload_url: string;
};

export type VideoAssetStatusResponse = {
  asset_id: string;
  duration_seconds: number | null;
  height: number | null;
  media_url: string | null;
  status: VideoAssetStatus;
  width: number | null;
};

export type VideoAssetPlaybackResponse = {
  expires_at: string;
  hls_url: string;
  thumbnail_url: string;
};

// Diagnóstico fechado: não incluir URL, mensagem livre, arquivo ou dados de usuário.
export type VideoAssetUploadEvent = {
  event: "transfer_start" | "transfer_complete" | "ready" | "failed" | "canceled";
  phase: "transfer" | "processing";
  method: VideoAssetUploadMethod;
  reason:
    | "none"
    | "network"
    | "http"
    | "transport"
    | "processing"
    | "processing_timeout"
    | "canceled"
    | "unknown";
  httpStatus: number;
  progress: number;
  elapsedMs: number;
  retryCount: number;
  online: boolean;
  visibility: "visible" | "hidden";
  wasHidden: boolean;
  transport?: {
    request: "HEAD" | "PATCH" | "POST" | "unknown";
    source: "not_read" | "reading" | "ready" | "failed";
    sourceFailure:
      | "none"
      | "unreadable"
      | "permission"
      | "missing"
      | "changed"
      | "invalid_range"
      | "unknown";
  };
};
