import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";
import packageMetadata from "./package.json";
import { isLoopbackHostname, parseConfiguredHttpOrigin } from "./src/lib/http-origin-policy";

const adminRoot = dirname(fileURLToPath(import.meta.url));
const DEFAULT_API_URL = "http://localhost:3001";
const apiUrl =
  parseConfiguredHttpOrigin(process.env.NEXT_PUBLIC_API_URL) ??
  (process.env.NODE_ENV === "development" ? new URL(DEFAULT_API_URL) : null);
type ImageRemotePattern = {
  hostname: string;
  port?: string;
  protocol: "http" | "https";
};
const imageRemotePatterns = new Map<string, ImageRemotePattern>();
const addImageRemotePattern = (pattern: ImageRemotePattern) => {
  const key = `${pattern.protocol}://${pattern.hostname}:${pattern.port ?? "*"}`;
  imageRemotePatterns.set(key, pattern);
};

addImageRemotePattern({ hostname: "lh3.googleusercontent.com", port: "", protocol: "https" });
if (process.env.NODE_ENV === "development") {
  for (const hostname of ["localhost", "127.0.0.1", "[::1]"]) {
    addImageRemotePattern({ hostname, protocol: "http" });
    addImageRemotePattern({ hostname, protocol: "https" });
  }
}

const assetCspSources = new Set([
  "https://lh3.googleusercontent.com",
  ...(apiUrl ? [apiUrl.origin] : []),
  ...(process.env.NODE_ENV === "development"
    ? [
        "http://localhost:*",
        "https://localhost:*",
        "http://127.0.0.1:*",
        "https://127.0.0.1:*",
        "http://[::1]:*",
        "https://[::1]:*",
      ]
    : []),
]);

const addRemoteHost = (value?: string | null) => {
  const normalized = value?.trim();
  if (!normalized) return;

  const explicitUrl = normalized.includes("://");
  const url = parseConfiguredHttpOrigin(normalized, { allowHostname: true });
  if (!url) return;

  addImageRemotePattern({
    hostname: url.hostname,
    port: url.port,
    protocol: url.protocol === "https:" ? "https" : "http",
  });
  assetCspSources.add(url.origin);

  if (!explicitUrl && process.env.NODE_ENV === "development" && isLoopbackHostname(url.hostname)) {
    addImageRemotePattern({ hostname: url.hostname, port: url.port, protocol: "http" });
    assetCspSources.add(`http://${url.host}`);
  }
};

if (apiUrl) addRemoteHost(apiUrl.toString());
process.env.NEXT_PUBLIC_IMAGE_REMOTE_HOSTS?.split(",").forEach(addRemoteHost);

const getApiCspSources = () => {
  if (!apiUrl) return [];

  const socketProtocol = apiUrl.protocol === "https:" ? "wss:" : "ws:";

  return [apiUrl.origin, `${socketProtocol}//${apiUrl.host}`];
};

const configuredAssetSources = Array.from(assetCspSources).join(" ");
const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  `img-src 'self' data: blob: ${configuredAssetSources}`,
  `media-src 'self' blob: ${configuredAssetSources}`,
  `connect-src 'self' ${getApiCspSources().join(" ")}`,
  "worker-src 'self' blob:",
  "manifest-src 'self'",
].join("; ");
const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: contentSecurityPolicy,
  },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "X-Robots-Tag", value: "noindex, nofollow" },
];

if (process.env.NODE_ENV === "production") {
  securityHeaders.push({
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains",
  });
}

const nextConfig: NextConfig = {
  env: {
    LECTUM_APP_VERSION: packageMetadata.version,
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  images: {
    remotePatterns: Array.from(imageRemotePatterns.values()),
  },
  outputFileTracingRoot: adminRoot,
  poweredByHeader: false,
};

export default nextConfig;
