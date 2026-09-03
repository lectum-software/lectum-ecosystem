import { createSign } from "node:crypto";
import type { VideoStreamConfig } from "./config";
import type { SignedVideoPlayback } from "./types";

const base64Url = (value: Buffer | string) => Buffer.from(value).toString("base64url");

export const signVideoPlaybackToken = (
  config: Pick<VideoStreamConfig, "signingKey" | "signingKeyId">,
  providerUid: string,
  expiresAt: Date,
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
