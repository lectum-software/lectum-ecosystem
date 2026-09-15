import { createSign } from "node:crypto";
import type { VideoStreamConfig } from "./config";
import type { SignedVideoDownload, SignedVideoPlayback } from "./types";

const base64Url = (value: Buffer | string) => Buffer.from(value).toString("base64url");

type SignVideoPlaybackTokenOptions = {
  downloadable?: boolean;
  original?: boolean;
};

const tokenPayloadOptions = (options: SignVideoPlaybackTokenOptions = {}) => ({
  ...(options.downloadable ? { downloadable: true } : {}),
  ...(options.original ? { flags: { original: true } } : {}),
});

export const signVideoPlaybackToken = (
  config: Pick<VideoStreamConfig, "signingKey" | "signingKeyId">,
  providerUid: string,
  expiresAt: Date,
  options: SignVideoPlaybackTokenOptions = {},
) => {
  const nowSeconds = Math.floor(Date.now() / 1_000);
  const header = base64Url(
    JSON.stringify({
      alg: "RS256",
      kid: config.signingKeyId,
      typ: "JWT",
    }),
  );
  const payload = base64Url(
    JSON.stringify({
      exp: Math.floor(expiresAt.getTime() / 1_000),
      kid: config.signingKeyId,
      nbf: nowSeconds - 5,
      sub: providerUid,
      ...tokenPayloadOptions(options),
    }),
  );
  const unsignedToken = `${header}.${payload}`;
  const signer = createSign("RSA-SHA256");
  signer.update(unsignedToken);
  signer.end();

  return `${unsignedToken}.${signer.sign(config.signingKey).toString("base64url")}`;
};

export const createSignedVideoPlayback = (
  config: Pick<
    VideoStreamConfig,
    "customerCode" | "playbackTtlSeconds" | "signingKey" | "signingKeyId"
  >,
  providerUid: string,
): SignedVideoPlayback => {
  const expiresAt = new Date(Date.now() + config.playbackTtlSeconds * 1_000);
  const token = signVideoPlaybackToken(config, providerUid, expiresAt);
  const base = `https://customer-${config.customerCode}.cloudflarestream.com/${token}`;

  return {
    expiresAt,
    hlsUrl: `${base}/manifest/video.m3u8`,
    thumbnailUrl: `${base}/thumbnails/thumbnail.jpg?time=1s&fit=crop`,
  };
};

const normalizeDownloadFilename = (fileName?: string | null) => {
  const normalized = String(fileName ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\.mp4$/iu, "")
    .replace(/[^a-zA-Z0-9_-]+/gu, "-")
    .replace(/-+/gu, "-")
    .replace(/^-+|-+$/gu, "")
    .slice(0, 120);

  return normalized || "lectum-video";
};

export const createSignedVideoDownload = (
  config: Pick<
    VideoStreamConfig,
    "customerCode" | "playbackTtlSeconds" | "signingKey" | "signingKeyId"
  >,
  providerUid: string,
  options: { fileName?: string | null; original?: boolean } = {},
): SignedVideoDownload => {
  const expiresAt = new Date(Date.now() + config.playbackTtlSeconds * 1_000);
  const token = signVideoPlaybackToken(config, providerUid, expiresAt, {
    downloadable: true,
    original: options.original ?? false,
  });
  const base = `https://customer-${config.customerCode}.cloudflarestream.com/${token}`;
  const filename = normalizeDownloadFilename(options.fileName);

  return {
    downloadUrl: `${base}/downloads/default.mp4?filename=${encodeURIComponent(filename)}`,
    expiresAt,
  };
};
