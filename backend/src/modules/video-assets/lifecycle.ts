import { type VideoAssetPurpose, videoAssetIdFromReference } from "@/infra/video-stream";
import { VideoAssetRepository } from "./repository";

export const retireOwnedVideoAssetReference = async ({
  ownerId,
  purpose,
  reference,
}: {
  ownerId: string;
  purpose: VideoAssetPurpose;
  reference?: string | null;
}) => {
  const assetId = videoAssetIdFromReference(reference);
  if (!assetId) return false;

  const repository = new VideoAssetRepository();
  const asset = await repository.findOwned(assetId, ownerId);
  if (!asset || asset.purpose !== purpose) return false;

  const result = await repository.cancel(asset, { onlyUnattached: true });
  if (result.kind !== "canceled") return false;
  // Retention is recorded atomically by cancel; retirement never purges provider bytes.
  return true;
};
