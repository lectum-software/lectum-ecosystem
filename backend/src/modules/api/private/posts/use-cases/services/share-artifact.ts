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

// Compatibility only: legacy video artifacts await explicit inventory/retention review.
const deleteShareArtifactObject = async (_key?: string | null) => false;

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

// Mantidos para compatibilidade; não autorizam exclusão nem iniciam limpeza no boot.
export const deleteExpiredShareArtifactObject = deleteShareArtifactObject;
export const isShareArtifactKey = isShareArtifactStorageKey;
