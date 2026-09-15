import { VideoProcessingServiceClient } from "./client";
import { getVideoProcessingServiceConfig } from "./config";

export * from "./client";
export * from "./config";

export const getVideoProcessingService = () => {
  const config = getVideoProcessingServiceConfig();
  return config ? new VideoProcessingServiceClient(config) : null;
};
