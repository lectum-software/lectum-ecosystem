import type { Prisma } from "@/external/generated/prisma/client";
import { videoAssetIdFromReference, videoAssetPlaybackReference } from "@/infra/video-stream";
import type { VideoAssetAssociationInput, VideoAssetRecord } from "./types";

type AssociationClient = Pick<
  Prisma.TransactionClient,
  "video_asset" | "psychologist_profile" | "community_post" | "post_reply"
>;

export const findReadyOwnedVideoAsset = (
  client: AssociationClient,
  input: VideoAssetAssociationInput,
) => {
  const id = videoAssetIdFromReference(input.reference);
  if (!id) return Promise.resolve(null);
  return client.video_asset.findFirst({
    where: {
      id,
      deleted: false,
      owner_id: input.ownerId,
      owner: { active: true, deleted: false },
      context_id: input.contextId,
      purpose: input.purpose,
      provider: "cloudflare_stream",
      status: "ready",
    },
  });
};

// Admission and association writes must share a Serializable callback with cancel.
// SSI observes read(asset)/write(association) versus read(association)/write(asset).
// Every retry must repeat these reads; legacy media validation remains with its caller.
export const canAssociateVideoAssetReferences = async (
  transaction: Prisma.TransactionClient,
  input: Omit<VideoAssetAssociationInput, "reference"> & {
    references: readonly (string | null | undefined)[];
  },
) => {
  for (const reference of new Set(input.references)) {
    if (!reference || !videoAssetIdFromReference(reference)) continue;
    if (!(await findReadyOwnedVideoAsset(transaction, { ...input, reference }))) return false;
  }
  return true;
};

export const findVideoAssetAssociations = async (
  client: AssociationClient,
  asset: Pick<VideoAssetRecord, "id">,
) => {
  const reference = videoAssetPlaybackReference(asset.id);
  const [profile, post, reply] = await Promise.all([
    client.psychologist_profile.findFirst({
      where: { deleted: false, video_url: reference },
      select: { user_id: true },
    }),
    client.community_post.findFirst({
      where: {
        deleted: false,
        OR: [
          { media_url: reference },
          { media_items: { some: { deleted: false, media_url: reference } } },
        ],
      },
      select: { id: true },
    }),
    client.post_reply.findFirst({
      where: { deleted: false, media_url: reference },
      select: { id: true },
    }),
  ]);
  return { profile, post, reply };
};
