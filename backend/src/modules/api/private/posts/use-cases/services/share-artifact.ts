import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { isR2Configured, PUBLIC_BUCKET, S3 } from "@/config/multer/s3";
import { error, msg } from "@/helpers/translate";
import type {
  IPostShareArtifactDTO,
  IPostUploadShareArtifactDTO,
  PostShareArtifactResponse,
} from "../../DTOs/IPostDTO";
import { PostRepository } from "../../repositories/PostRepository";
import { POST_SHARE_ARTIFACT_TTL_DAYS } from "../../repositories/queries/PostShareArtifactRepository";
import { ensureCommunityActor, publicFileUrl } from "./post-support";

const SHARE_ARTIFACT_ALLOWED_PREFIX = "posts/share-artifacts/";
const SHARE_ARTIFACT_CACHE_CONTROL = "public, max-age=3600";

export const POST_SHARE_ARTIFACT_UPLOAD_CACHE_CONTROL = SHARE_ARTIFACT_CACHE_CONTROL;

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

const toPublicResponse = (artifact: {
  content_type: string;
  expires_at: Date;
  file_name: string | null;
  size_bytes: number;
  storage_key: string;
}): PostShareArtifactResponse => ({
  artifact_url: publicFileUrl(artifact.storage_key),
  available: true,
  content_type: artifact.content_type,
  expires_at: artifact.expires_at,
  file_name: artifact.file_name,
  size_bytes: artifact.size_bytes,
});

const SHARE_ARTIFACT_ALLOWED_MIME_TYPES = new Set(["video/mp4", "video/webm"]);

const isVideoFile = (file?: Express.Multer.File | null) =>
  Boolean(file?.mimetype && SHARE_ARTIFACT_ALLOWED_MIME_TYPES.has(file.mimetype));

const sanitizeFileName = (value?: string | null) => {
  const normalized = Array.from(String(value ?? "").normalize("NFC"))
    .filter((character) => {
      const code = character.charCodeAt(0);
      return code > 31 && code !== 127;
    })
    .join("")
    .trim();

  return normalized ? normalized.slice(0, 255) : null;
};

const expiresAtFromNow = (now: Date) =>
  new Date(now.getTime() + POST_SHARE_ARTIFACT_TTL_DAYS * 24 * 60 * 60 * 1000);

export const getShareArtifact = async (data: IPostShareArtifactDTO) => {
  const repository = new PostRepository();
  const target = await repository.getShareArtifactTarget({
    postId: data.p.id,
    replyId: data.p.replyId ?? null,
  });

  if (!target) {
    return {
      status: 200,
      ...msg("post_share_artifact_unavailable", {}),
      data: emptyShareArtifactResponse(),
    };
  }

  const artifact = await repository.findValidShareArtifact(target.cacheKey, new Date());

  return {
    status: 200,
    ...msg(artifact ? "post_share_artifact_available" : "post_share_artifact_unavailable", {}),
    data: artifact ? toPublicResponse(artifact) : emptyShareArtifactResponse(),
  };
};

export const uploadShareArtifact = async (data: IPostUploadShareArtifactDTO) => {
  const unauthorized = ensureCommunityActor(data);
  if (unauthorized) return unauthorized;

  const key = data.file?.path || data.file?.key;

  if (!isVideoFile(data.file) || !isShareArtifactStorageKey(key)) {
    await deleteShareArtifactObject(key).catch(() => undefined);

    return {
      status: 400,
      ...error("upload_error", {}),
    };
  }

  const repository = new PostRepository();
  const target = await repository.getShareArtifactTarget({
    postId: data.p.id,
    replyId: data.p.replyId ?? null,
  });

  if (!target) {
    await deleteShareArtifactObject(key).catch(() => undefined);

    return {
      status: 200,
      ...msg("post_share_artifact_unavailable", {}),
      data: emptyShareArtifactResponse(),
    };
  }

  const previousArtifact = await repository.findShareArtifactStorageKey(target.cacheKey);
  const artifact = await repository.upsertShareArtifact({
    ...target,
    contentType: data.file!.mimetype,
    expiresAt: expiresAtFromNow(new Date()),
    fileName: sanitizeFileName(data.file!.originalname),
    sizeBytes: data.file!.size,
    storageKey: key!,
  });

  if (previousArtifact?.storage_key && previousArtifact.storage_key !== key) {
    await deleteShareArtifactObject(previousArtifact.storage_key).catch(() => undefined);
  }

  return {
    status: 200,
    ...msg("post_share_artifact_saved", {}),
    data: toPublicResponse(artifact),
  };
};

export const deleteExpiredShareArtifactObject = deleteShareArtifactObject;
export const isShareArtifactKey = isShareArtifactStorageKey;
