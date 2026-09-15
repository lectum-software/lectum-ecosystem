import type { VideoAssetUploadMethod } from "@/infra/video-stream/types";

const CLOUDFLARE_BASIC_DIRECT_UPLOAD_LIMIT_BYTES = 200_000_000;

export const resolveProvisionUploadMethods = ({
  acceptedUploadMethods,
  size,
}: {
  acceptedUploadMethods?: { basic?: boolean; tus?: boolean };
  size: number;
}): VideoAssetUploadMethod[] => {
  // Never downgrade a resumable client to a whole-file transfer on failure.
  if (acceptedUploadMethods?.tus !== false) return ["tus"];

  if (acceptedUploadMethods.basic === true && size <= CLOUDFLARE_BASIC_DIRECT_UPLOAD_LIMIT_BYTES) {
    return ["basic"];
  }

  // Preserve the original TUS contract for clients without a capability header
  // and files outside the provider's basic limit. There is no R2 fallback.
  return ["tus"];
};
