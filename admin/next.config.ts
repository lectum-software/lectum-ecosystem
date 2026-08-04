import type { NextConfig } from "next";

const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
const remoteHosts = new Set(["localhost", "127.0.0.1", "lh3.googleusercontent.com"]);

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
  // outputFileTracingRoot: process.cwd(),
  poweredByHeader: false,
};

export default nextConfig;
