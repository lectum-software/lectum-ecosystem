"use client";

import {
  getPostShareArtifact,
  getReplyShareArtifact,
  uploadPostShareArtifact,
  uploadReplyShareArtifact,
} from "@/api/req/posts";
import {
  cachePreparedLectumShareFile,
  getPreparedLectumShareFile,
  prepareLectumShareFile,
} from "@/utils/lectum-share-media";
import { safeFileName } from "@/utils/lectum-share-media/file-name";
import {
  createLectumSharePostMediaTarget,
  type LectumShareSocialTarget,
  type LectumShareVideoTarget,
} from "@/utils/lectum-share-target";
import { resolvePublicMediaUrl } from "@/utils/media";

type ShareablePostWithMedia = Parameters<typeof createLectumSharePostMediaTarget>[0];

type ShareArtifactPrewarmOptions = {
  authenticated?: boolean;
};

type WindowWithIdleCallback = Window &
  typeof globalThis & {
    requestIdleCallback?: (callback: () => void, options?: { timeout?: number }) => number;
  };

const SHARE_ARTIFACT_VIDEO_FILE_EXTENSIONS = new Set(["mp4", "webm"]);

const resolveShareArtifactFileExtension = (
  contentType?: string | null,
  fileName?: string | null,
) => {
  const normalizedContentType = contentType?.toLowerCase() ?? "";

  if (normalizedContentType.includes("webm")) return "webm";
  if (normalizedContentType.includes("mp4")) return "mp4";

  const extension = fileName?.match(/\.([a-z0-9]{1,8})$/iu)?.[1]?.toLowerCase();

  return extension && SHARE_ARTIFACT_VIDEO_FILE_EXTENSIONS.has(extension) ? extension : null;
};

export const isLectumShareArtifactTarget = (
  target?: LectumShareVideoTarget | null,
): target is LectumShareSocialTarget =>
  Boolean(target && target.kind !== "link" && target.mediaType === "video");

export const getLectumShareArtifactFile = async (target: LectumShareVideoTarget) => {
  if (!isLectumShareArtifactTarget(target)) return null;

  const artifact = target.replyId
    ? await getReplyShareArtifact(target.postId, target.replyId)
    : await getPostShareArtifact(target.postId);

  if (!artifact.available || !artifact.artifact_url) return null;

  const artifactUrl = resolvePublicMediaUrl(artifact.artifact_url);
  if (!artifactUrl) return null;

  const response = await fetch(artifactUrl);
  if (!response.ok) return null;

  const blob = await response.blob();
  const contentType = (artifact.content_type || blob.type || "").toLowerCase().split(";", 1)[0];
  const extension = resolveShareArtifactFileExtension(contentType, artifact.file_name);

  if (!extension || (contentType !== "video/mp4" && contentType !== "video/webm")) {
    return null;
  }

  const file = new File([blob], safeFileName(target, extension), {
    type: contentType,
  });

  cachePreparedLectumShareFile(target, file);
  return file;
};

export const persistLectumShareArtifact = async (target: LectumShareVideoTarget, file: File) => {
  if (!isLectumShareArtifactTarget(target)) return;

  if (target.replyId) {
    await uploadReplyShareArtifact(target.postId, target.replyId, file);
    return;
  }

  await uploadPostShareArtifact(target.postId, file);
};

export const prewarmLectumShareArtifact = async (
  target?: LectumShareVideoTarget | null,
  options: ShareArtifactPrewarmOptions = {},
) => {
  if (!options.authenticated || !isLectumShareArtifactTarget(target)) return null;

  const cachedFile = getPreparedLectumShareFile(target);
  if (cachedFile) return cachedFile;

  const storedFile = await getLectumShareArtifactFile(target).catch(() => null);
  if (storedFile) return storedFile;

  const file = await prepareLectumShareFile(target);
  await persistLectumShareArtifact(target, file).catch(() => undefined);

  return file;
};

export const scheduleLectumShareArtifactPrewarm = (
  target?: LectumShareVideoTarget | null,
  options: ShareArtifactPrewarmOptions = {},
) => {
  if (
    typeof window === "undefined" ||
    !options.authenticated ||
    !isLectumShareArtifactTarget(target)
  ) {
    return;
  }

  const run = () => {
    void prewarmLectumShareArtifact(target, options).catch(() => undefined);
  };
  const currentWindow = window as WindowWithIdleCallback;

  if (typeof currentWindow.requestIdleCallback === "function") {
    currentWindow.requestIdleCallback(run, { timeout: 2500 });
    return;
  }

  window.setTimeout(run, 500);
};

export const scheduleLectumSharePostArtifactPrewarm = (
  post: ShareablePostWithMedia,
  options: ShareArtifactPrewarmOptions = {},
) => scheduleLectumShareArtifactPrewarm(createLectumSharePostMediaTarget(post), options);
