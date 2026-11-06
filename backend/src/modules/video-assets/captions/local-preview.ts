import { captionsEnabledFor } from "./policy";

// Read-only playback of one explicitly authorized public Stream video in local development.
export function localCaptionPreviewPlayback(
  asset: { id: string; provider_uid: string },
  env: NodeJS.ProcessEnv = process.env,
) {
  if (env.NODE_ENV !== "development" || !captionsEnabledFor(asset.id, env)) return null;
  if (env.VIDEO_CAPTIONS_LOCAL_PUBLIC_UID !== asset.provider_uid) return null;
  if (!/^[a-f0-9]{32}$/.test(asset.provider_uid)) return null;
  const customer = env.VIDEO_CAPTIONS_LOCAL_PUBLIC_CUSTOMER;
  if (!customer || !/^customer-[a-z0-9]+$/.test(customer)) return null;
  try {
    if (new URL(env.BASE ?? "").hostname !== "127.0.0.1") return null;
  } catch {
    return null;
  }
  const base = `https://${customer}.cloudflarestream.com/${asset.provider_uid}`;
  return {
    expiresAt: new Date(Date.now() + 30 * 60 * 1000),
    hlsUrl: `${base}/manifest/video.m3u8`,
    thumbnailUrl: `${base}/thumbnails/thumbnail.jpg`,
  };
}
