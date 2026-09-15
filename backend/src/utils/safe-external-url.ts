import { isIP } from "node:net";

const EXACT_HTTPS_SCHEME_SEPARATOR = /^https:\/\/[^/\\]/i;

const isBlockedHostname = (hostname: string) =>
  hostname === "localhost" ||
  hostname.endsWith(".localhost") ||
  hostname.endsWith(".lan") ||
  hostname.endsWith(".local") ||
  hostname.endsWith(".localdomain") ||
  hostname.endsWith(".internal") ||
  hostname.endsWith(".intranet") ||
  hostname.endsWith(".invalid") ||
  hostname.endsWith(".test") ||
  hostname.endsWith(".corp") ||
  hostname.endsWith(".home") ||
  hostname.endsWith(".home.arpa");

export const parseSafeExternalHttpsUrl = (value: unknown): URL | null => {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > 2_048 ||
    !EXACT_HTTPS_SCHEME_SEPARATOR.test(value) ||
    value.startsWith("//") ||
    value.includes("\\") ||
    value.includes("*")
  ) {
    return null;
  }
  if (
    Array.from(value).some((character) => {
      const code = character.charCodeAt(0);
      return code <= 31 || code === 127;
    })
  ) {
    return null;
  }

  try {
    const url = new URL(value);
    const hostname = url.hostname
      .replace(/^\[|\]$/g, "")
      .replace(/\.+$/, "")
      .toLowerCase();

    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.port ||
      url.hash ||
      !hostname.includes(".") ||
      isIP(hostname) !== 0 ||
      isBlockedHostname(hostname)
    ) {
      return null;
    }

    return url;
  } catch {
    return null;
  }
};
