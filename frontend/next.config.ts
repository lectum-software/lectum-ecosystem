import type { NextConfig } from "next";

type RemotePattern = NonNullable<NonNullable<NextConfig["images"]>["remotePatterns"]>[number];

const remotePatterns: RemotePattern[] = [
  {
    protocol: "https",
    hostname: "lh3.googleusercontent.com",
  },
  {
    protocol: "http",
    hostname: "localhost",
  },
  {
    protocol: "http",
    hostname: "127.0.0.1",
  },
];

const addRemotePattern = (value?: string | null) => {
  if (!value) return;

  try {
    const url = new URL(value.includes("://") ? value : `https://${value}`);
    const protocol = url.protocol.replace(":", "");

    if (protocol !== "http" && protocol !== "https") return;

    const exists = remotePatterns.some(
      (pattern) => pattern.protocol === protocol && pattern.hostname === url.hostname,
    );

    if (!exists) {
      remotePatterns.push({
        protocol,
        hostname: url.hostname,
      });
    }
  } catch {
    // Ignora entradas inválidas: Next deve receber apenas hosts/protocolos explícitos.
  }
};

addRemotePattern(process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001");
process.env.NEXT_PUBLIC_IMAGE_REMOTE_HOSTS?.split(",")
  .map((entry) => entry.trim())
  .filter(Boolean)
  .forEach(addRemotePattern);

const nextConfig: NextConfig = {
  images: {
    remotePatterns,
  },
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
