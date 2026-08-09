const normalizeHostname = (hostname: string) =>
  hostname
    .trim()
    .toLowerCase()
    .replace(/^\[|\]$/g, "")
    .replace(/\.+$/, "");

const hasControlCharacters = (value: string) =>
  Array.from(value).some((character) => {
    const code = character.charCodeAt(0);
    return code <= 31 || code === 127;
  });

export const isIpAddressHostname = (hostname: string) => {
  const normalized = normalizeHostname(hostname);

  if (normalized.includes(":")) return true;
  if (!/^\d{1,3}(?:\.\d{1,3}){3}$/.test(normalized)) return false;

  return normalized.split(".").every((segment) => Number(segment) <= 255);
};

export const isLoopbackHostname = (hostname: string) => {
  const normalized = normalizeHostname(hostname);

  return (
    normalized === "localhost" ||
    normalized.endsWith(".localhost") ||
    normalized === "0.0.0.0" ||
    normalized === "::" ||
    normalized === "::1" ||
    /^::ffff:7f[0-9a-f]{2}:[0-9a-f]{1,4}$/.test(normalized) ||
    /^::ffff:127(?:\.\d{1,3}){3}$/.test(normalized) ||
    /^127(?:\.\d{1,3}){3}$/.test(normalized)
  );
};

export const isAllowedConfiguredHttpOrigin = (
  url: URL,
  environment: string | undefined = process.env.NODE_ENV,
) => {
  if (url.hostname.includes("*")) return false;

  if (isLoopbackHostname(url.hostname)) {
    return environment === "development" && (url.protocol === "http:" || url.protocol === "https:");
  }

  if (environment !== "development" && isIpAddressHostname(url.hostname)) return false;

  return url.protocol === "https:";
};

export const parseConfiguredHttpOrigin = (
  value?: string | null,
  {
    allowHostname = false,
    environment = process.env.NODE_ENV,
  }: { allowHostname?: boolean; environment?: string } = {},
) => {
  const raw = value?.trim();
  if (
    !raw ||
    raw.length > 2048 ||
    raw.startsWith("//") ||
    raw.includes("\\") ||
    hasControlCharacters(raw)
  ) {
    return null;
  }

  const hasExplicitHttpScheme = /^https?:\/\/[^/\\]/i.test(raw);
  if (
    (!allowHostname && !hasExplicitHttpScheme) ||
    (raw.includes("://") && !hasExplicitHttpScheme) ||
    (/^https?:/i.test(raw) && !hasExplicitHttpScheme)
  ) {
    return null;
  }

  const candidate = hasExplicitHttpScheme ? raw : `https://${raw}`;

  try {
    const url = new URL(candidate);
    if (
      !isAllowedConfiguredHttpOrigin(url, environment) ||
      url.username ||
      url.password ||
      url.pathname !== "/" ||
      url.search ||
      url.hash
    ) {
      return null;
    }

    return url as URL & { protocol: "http:" | "https:" };
  } catch {
    return null;
  }
};
