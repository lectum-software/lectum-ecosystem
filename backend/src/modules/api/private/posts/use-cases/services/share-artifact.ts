import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { isR2Configured, PUBLIC_BUCKET, S3 } from "@/config/multer/s3";
import { msg } from "@/helpers/translate";
import type { IPostUploadShareArtifactDTO, PostShareArtifactResponse } from "../../DTOs/IPostDTO";
import { ensureCommunityActor } from "./post-support";

const SHARE_ARTIFACT_ALLOWED_PREFIX = "posts/share-artifacts/";

const emptyShareArtifactResponse = (): PostShareArtifactResponse => ({
  artifact_url: null,
  available: false,
  content_type: null,
  expires_at: null,
  file_name: null,
  size_bytes: null,
});

const isShareArtifactStorageKey = (value?: string | null) =>
  Boolean(value?.startsWith(SHARE_ARTIFACT_ALLOWED_PREFIX));

const deleteShareArtifactObject = async (key?: string | null) => {
  if (!isShareArtifactStorageKey(key) || !isR2Configured()) return false;

  await S3.send(
    new DeleteObjectCommand({
      Bucket: PUBLIC_BUCKET,
      Key: key!,
    }),
  );

  return true;
};

export const getShareArtifact = async (_data?: unknown) => {
  return {
    status: 200,
    ...msg("post_share_artifact_unavailable", {}),
    data: emptyShareArtifactResponse(),
  };
};

export const uploadShareArtifact = async (data: IPostUploadShareArtifactDTO) => {
  const unauthorized = ensureCommunityActor(data);
  if (unauthorized) return unauthorized;

  const key = data.file?.path || data.file?.key;
  await deleteShareArtifactObject(key).catch(() => undefined);

  return {
    status: 200,
    ...msg("post_share_artifact_unavailable", {}),
    data: emptyShareArtifactResponse(),
  };
};

// Mantidos durante o rollout para expirar com segurança objetos criados por versões anteriores.
export const deleteExpiredShareArtifactObject = deleteShareArtifactObject;
export const isShareArtifactKey = isShareArtifactStorageKey;
