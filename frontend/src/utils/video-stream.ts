const VIDEO_ASSET_REFERENCE =
  /^\/api\/(?:private|public)\/video-assets\/([a-z0-9_-]{8,64})\/playback$/i;

export const TUS_CHUNK_SIZE_BYTES = 5 * 1024 * 1024;

export const isCloudflareStreamUploadEnabled = () =>
  process.env.NEXT_PUBLIC_CLOUDFLARE_STREAM_ENABLED?.trim().toLowerCase() === "true";

export const videoAssetIdFromReference = (value?: string | null) => {
  const raw = value?.trim();
  if (!raw || raw.length > 8192 || raw.includes("\\")) return null;

  try {
    const parsed = new URL(raw, "https://lectum.invalid");
    if (parsed.search || parsed.hash) return null;
    return parsed.pathname.match(VIDEO_ASSET_REFERENCE)?.[1] ?? null;
  } catch {
    return null;
  }
};

export const isVideoAssetReference = (value?: string | null) =>
  Boolean(videoAssetIdFromReference(value));

export const videoAssetPlaybackApiPaths = (assetId: string) => {
  const encodedAssetId = encodeURIComponent(assetId);

  return {
    legacy: `/api/private/video-assets/${encodedAssetId}/playback`,
    public: `/api/public/video-assets/${encodedAssetId}/playback`,
  };
};

export const shouldFallbackToLegacyVideoPlayback = ({
  code,
  status,
}: {
  code?: string;
  status?: number;
}) => status === 404 && !code;

export const shouldFallbackToLegacyVideoUpload = ({ status }: { status?: number }) =>
  status === undefined ||
  status === 404 ||
  status === 405 ||
  status === 408 ||
  status === 429 ||
  (typeof status === "number" && status >= 500);

export const shouldFallbackToLegacyVideoUploadAfterProvisionError = ({
  isProvisionError,
  status,
}: {
  isProvisionError: boolean;
  status?: number;
}) => isProvisionError && shouldFallbackToLegacyVideoUpload({ status });

export const shouldCleanupVideoAssetAfterFailure = (uploadCompleted: boolean, error: unknown) =>
  !uploadCompleted || (error instanceof DOMException && error.name === "AbortError");

export const isVideoPlaybackFresh = (
  expiresAt?: string | null,
  now = Date.now(),
  minimumValidityMs = 15_000,
) => {
  if (!expiresAt) return false;
  const expiresAtMs = new Date(expiresAt).getTime();
  return Number.isFinite(expiresAtMs) && expiresAtMs > now + minimumValidityMs;
};

export const selectAdaptiveVideoPlaybackAdapter = ({
  hlsJsSupported,
  nativeHlsSupported,
}: {
  hlsJsSupported: boolean;
  nativeHlsSupported: boolean;
}) =>
  (nativeHlsSupported ? "native" : hlsJsSupported ? "hls.js" : "unsupported") as
    | "native"
    | "hls.js"
    | "unsupported";
