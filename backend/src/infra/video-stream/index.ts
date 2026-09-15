import { CloudflareStreamAdapter } from "./cloudflare-stream";
import { getVideoStreamConfig } from "./config";

export * from "./cloudflare-stream";
export * from "./config";
export * from "./reference";
export * from "./signing";
export * from "./types";
export * from "./webhook";

export const getVideoStreamProvider = () => {
  const config = getVideoStreamConfig();
  return config ? new CloudflareStreamAdapter(config) : null;
};
