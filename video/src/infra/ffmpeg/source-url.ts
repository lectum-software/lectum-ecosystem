import { lookup } from "node:dns/promises";

const MAX_REMOTE_SOURCE_URL_LENGTH = 4_096;
const REMOTE_VIDEO_EXTENSIONS = [".m3u8", ".mov", ".mp4", ".webm"] as const;

const CLOUDFLARE_STREAM_SIGNED_HLS =
  /^https:\/\/customer-[a-zA-Z0-9_-]{1,128}\.cloudflarestream\.com\/eyJ[a-zA-Z0-9_-]+\.eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\/manifest\/video\.m3u8$/;

const hasControlCharacter = (value: string) =>
  Array.from(value).some((character) => {
    const code = character.charCodeAt(0);
    return code <= 31 || code === 127;
  });

const isPrivateOrReservedIpv4 = (address: string) => {
  const parts = address.split(".").map((part) => Number(part));
  if (
    parts.length !== 4 ||
    parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)
  ) {
    return true;
  }

  const [a = 0, b = 0] = parts;

  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 192 && b === 0) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224
  );
};

const isPrivateOrReservedIpv6 = (address: string) => {
  const normalized = address.toLowerCase();
  if (
    normalized === "::" ||
    normalized === "::1" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("fe8") ||
    normalized.startsWith("fe9") ||
    normalized.startsWith("fea") ||
    normalized.startsWith("feb")
  ) {
    return true;
  }

  const mappedIpv4 = normalized.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/)?.[1];
  return mappedIpv4 ? isPrivateOrReservedIpv4(mappedIpv4) : false;
};

const isSafeResolvedAddress = (address: string, family: number) => {
  if (family === 4) return !isPrivateOrReservedIpv4(address);
  if (family === 6) return !isPrivateOrReservedIpv6(address);
  return false;
};

const hasAllowedVideoPath = (url: URL) => {
  const pathName = decodeURIComponent(url.pathname).toLowerCase();

  if (CLOUDFLARE_STREAM_SIGNED_HLS.test(url.toString())) return true;
  if (pathName.startsWith("/public/files/posts/media/")) return true;

  return REMOTE_VIDEO_EXTENSIONS.some((extension) => pathName.endsWith(extension));
};

export const parseRemoteVideoSourceUrl = (value: string) => {
  const raw = value.trim();

  if (
    !raw ||
    raw.length > MAX_REMOTE_SOURCE_URL_LENGTH ||
    raw.includes("\\") ||
    raw.startsWith("//") ||
    hasControlCharacter(raw)
  ) {
    return null;
  }

  try {
    const url = new URL(raw);
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.hash ||
      !url.hostname ||
      !hasAllowedVideoPath(url)
    ) {
      return null;
    }

    return url;
  } catch {
    return null;
  }
};

export const assertSafeRemoteVideoSourceUrl = async (value: string) => {
  const url = parseRemoteVideoSourceUrl(value);
  if (!url) throw new Error("remote_video_source_invalid");

  const addresses = await lookup(url.hostname, { all: true, verbatim: true }).catch(() => []);
  if (
    addresses.length === 0 ||
    addresses.some((address) => !isSafeResolvedAddress(address.address, address.family))
  ) {
    throw new Error("remote_video_source_invalid");
  }

  return url.toString();
};
