const VIDEO_PLAYBACK_PATH = /^\/api\/private\/video-assets\/([a-z0-9_-]{8,64})\/playback$/i;

export const videoAssetPlaybackReference = (assetId: string) =>
  `/api/private/video-assets/${encodeURIComponent(assetId)}/playback`;

export const videoAssetIdFromReference = (value?: string | null) => {
  const raw = value?.trim();
  if (!raw || raw.length > 512 || raw.includes("\\")) return null;

  try {
    const url = new URL(raw, "https://lectum.invalid");
    if (url.search || url.hash) return null;
    return url.pathname.match(VIDEO_PLAYBACK_PATH)?.[1] ?? null;
  } catch {
    return null;
  }
};

export const isVideoAssetPlaybackReference = (value?: string | null) =>
  Boolean(videoAssetIdFromReference(value));

export const normalizeVideoAssetPlaybackReference = (value?: string | null) => {
  const assetId = videoAssetIdFromReference(value);
  return assetId ? videoAssetPlaybackReference(assetId) : null;
};
