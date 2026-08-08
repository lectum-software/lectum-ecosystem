import type { NextConfig } from "next";

const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
const remoteHosts = new Set(["localhost", "127.0.0.1", "lh3.googleusercontent.com"]);

const getApiCspSources = () => {
  try {
    const url = new URL(apiUrl);
    const socketProtocol = url.protocol === "https:" ? "wss:" : "ws:";

    return [url.origin, `${socketProtocol}//${url.host}`];
  } catch {
    return [];
  }
};

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  "img-src 'self' data: blob: https: http:",
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

const addRemoteHost = (value?: string | null) => {
  const normalized = value?.trim();
  if (!normalized) return;

  try {
    remoteHosts.add(
      new URL(normalized.includes("://") ? normalized : `https://${normalized}`).hostname,
    );
  } catch {
    // Mantém hosts locais explícitos quando a env não for uma URL absoluta.
  }
};

addRemoteHost(apiUrl);
process.env.NEXT_PUBLIC_IMAGE_REMOTE_HOSTS?.split(",").forEach(addRemoteHost);

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  images: {
    remotePatterns: Array.from(remoteHosts).flatMap((hostname) => [
      {
        hostname,
        protocol: "http",
      },
      {
        hostname,
        protocol: "https",
      },
    ]),
  },
  outputFileTracingRoot: process.cwd(),
  poweredByHeader: false,
};

export default nextConfig;
