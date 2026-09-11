import { lookup } from "node:dns/promises";
import { BlockList, isIP } from "node:net";

const MAX_REMOTE_SOURCE_ORIGIN_LENGTH = 2_048;
const MAX_REMOTE_SOURCE_URL_LENGTH = 4_096;
const REMOTE_VIDEO_REQUEST_USER_AGENT = "LectumVideoService/1.0";
const REMOTE_VIDEO_EXTENSIONS = [".mov", ".mp4", ".webm"] as const;
const FIRST_PARTY_LECTUM_PUBLIC_MEDIA_HOSTNAMES = new Set([
  "api.lectum.com.br",
  "homolog-api.lectum.com.br",
]);

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

const globalIpv6 = new BlockList();
globalIpv6.addSubnet("2000::", 3, "ipv6");
const reservedIpv6 = new BlockList();
reservedIpv6.addSubnet("2001::", 23, "ipv6");
reservedIpv6.addSubnet("2001:db8::", 32, "ipv6");
reservedIpv6.addSubnet("2002::", 16, "ipv6");
reservedIpv6.addSubnet("3fff::", 20, "ipv6");

const isPrivateOrReservedIpv6 = (address: string) =>
  !globalIpv6.check(address, "ipv6") || reservedIpv6.check(address, "ipv6");

export const isSafeResolvedVideoAddress = (address: string, family: number) => {
  if (family === 4) return !isPrivateOrReservedIpv4(address);
  if (family === 6) return !isPrivateOrReservedIpv6(address);
  return false;
};

const isPrivateOrReservedHostname = (hostname: string) => {
  const normalized = hostname
    .trim()
    .toLowerCase()
    .replace(/^\[|\]$/g, "")
    .replace(/\.+$/g, "");

  if (!normalized || normalized === "localhost" || normalized.endsWith(".localhost")) {
    return true;
  }

  const family = isIP(normalized);
  return family !== 0 && !isSafeResolvedVideoAddress(normalized, family);
};

const hasAllowedVideoPath = (url: URL) => {
  const pathName = decodeURIComponent(url.pathname).toLowerCase();

  if (CLOUDFLARE_STREAM_SIGNED_HLS.test(url.toString())) return true;
  // A public playlist can delegate reads to private URLs or local files. Only the
  // trusted Stream manifest is allowed to reach FFmpeg's network demuxer.
  if (pathName.endsWith(".m3u8")) return false;
  if (hasLectumPublicPostMediaPath(url)) return true;

  return REMOTE_VIDEO_EXTENSIONS.some((extension) => pathName.endsWith(extension));
};

const hasLectumPublicPostMediaPath = (url: URL) =>
  /^\/public\/files\/posts\/media\/[a-zA-Z0-9_-][a-zA-Z0-9_.-]*$/u.test(url.pathname);

export const isRemoteVideoHlsSource = (value: string) => {
  try {
    const url = new URL(value);
    return url.pathname.toLowerCase().endsWith(".m3u8");
  } catch {
    return false;
  }
};

export const isFirstPartyLectumPublicPostMediaUrl = (url: URL) =>
  url.protocol === "https:" &&
  !url.port &&
  FIRST_PARTY_LECTUM_PUBLIC_MEDIA_HOSTNAMES.has(url.hostname.toLowerCase()) &&
  !url.username &&
  !url.password &&
  !url.search &&
  !url.hash &&
  hasLectumPublicPostMediaPath(url);

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
      url.port ||
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      !url.hostname ||
      isPrivateOrReservedHostname(url.hostname) ||
      /%(?:2f|5c|2e|25)/iu.test(url.pathname) ||
      hasControlCharacter(decodeURIComponent(url.pathname)) ||
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

  if (isFirstPartyLectumPublicPostMediaUrl(url)) return url.toString();

  const addresses = await lookup(url.hostname, { all: true, verbatim: true }).catch(() => []);
  if (
    addresses.length === 0 ||
    addresses.some((address) => !isSafeResolvedVideoAddress(address.address, address.family))
  ) {
    throw new Error("remote_video_source_invalid");
  }

  return url.toString();
};

export const parseRemoteVideoRequestOrigin = (value?: string | null) => {
  const raw = value?.trim();

  if (
    !raw ||
    raw.length > MAX_REMOTE_SOURCE_ORIGIN_LENGTH ||
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
      !url.hostname ||
      url.pathname !== "/" ||
      url.search ||
      url.hash ||
      isPrivateOrReservedHostname(url.hostname)
    ) {
      return null;
    }

    return url.origin;
  } catch {
    return null;
  }
};

export const remoteVideoRequestHeaderEntries = (origin?: string | null) => {
  const safeOrigin = parseRemoteVideoRequestOrigin(origin);
  const headers: [string, string][] = [["User-Agent", REMOTE_VIDEO_REQUEST_USER_AGENT]];
  if (safeOrigin) {
    headers.push(["Origin", safeOrigin]);
    headers.push(["Referer", `${safeOrigin}/`]);
  }

  return headers;
};

export const remoteVideoRequestHeaders = (origin?: string | null) => {
  const headers = remoteVideoRequestHeaderEntries(origin).map(
    ([name, value]) => `${name}: ${value}`,
  );

  return `${headers.join("\r\n")}\r\n`;
};
