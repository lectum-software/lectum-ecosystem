import "@/config/dotenv";

import {
  resolveVideoProcessingServiceConfig,
  VideoProcessingServiceClient,
  VideoProcessingServiceError,
} from "@/infra/video-processing";

const main = async () => {
  const resolution = resolveVideoProcessingServiceConfig();
  if (resolution.status !== "configured") {
    console.error("[VIDEO_PROCESSING_SERVICE_CHECK_FAILED]", {
      reason: resolution.status === "disabled" ? "configuration_missing" : "configuration_invalid",
    });
    process.exitCode = 1;
    return;
  }

  try {
    const result = await new VideoProcessingServiceClient(resolution.config).checkConnection();
    console.log("[VIDEO_PROCESSING_SERVICE_CHECK_OK]", {
      authentication: result.authentication,
      readiness: result.readiness,
      serviceVersion: result.version,
      transport: "private_network",
    });
  } catch (error) {
    if (error instanceof VideoProcessingServiceError) {
      console.error("[VIDEO_PROCESSING_SERVICE_CHECK_FAILED]", {
        operation: error.operation,
        reason: error.failure,
        status: error.status,
      });
    } else {
      console.error("[VIDEO_PROCESSING_SERVICE_CHECK_FAILED]", { reason: "unexpected" });
    }
    process.exitCode = 1;
  }
};

void main();
