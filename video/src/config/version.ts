import { readFileSync } from "node:fs";

const packageMetadata = JSON.parse(
  readFileSync(new URL("../../package.json", import.meta.url), "utf8"),
) as { version?: unknown };

if (typeof packageMetadata.version !== "string") {
  throw new Error("video_service_version_invalid");
}

export const VIDEO_SERVICE_VERSION = packageMetadata.version;
