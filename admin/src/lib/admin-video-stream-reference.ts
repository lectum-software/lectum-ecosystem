const VIDEO_ASSET_REFERENCE_PATTERN =
  /^\/api\/private\/video-assets\/([a-z0-9_-]{8,64})\/playback$/i;
const INTERNAL_ORIGIN = "https://lectum-admin.invalid";

export const videoAssetIdFromAdminReference = (src?: string | null) => {
  const value = src?.trim();
  if (!value || value.length > 8192 || value.includes("\\")) return null;

  try {
    const parsed = new URL(value, INTERNAL_ORIGIN);
    if (parsed.search || parsed.hash) return null;
    return parsed.pathname.match(VIDEO_ASSET_REFERENCE_PATTERN)?.[1] ?? null;
  } catch {
    return null;
  }
};

export const isAdminVideoAssetReference = (src?: string | null) =>
  Boolean(videoAssetIdFromAdminReference(src));
