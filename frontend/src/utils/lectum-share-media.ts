import type { LectumShareLinkTarget, LectumShareSocialTarget } from "@/utils/lectum-share-target";
import { resolvePublicMediaUrl } from "@/utils/media";
import { createImageShareFile, createVideoShareFile } from "./lectum-share-media/export";
import {
  loadImageElement,
  loadVideoElement,
  type ShareExportResult,
  type ShareNavigator,
} from "./lectum-share-media/layout";
import {
  isNativeShareAbortError,
  isNativeShareActivationError,
  resolveLectumFileShareData,
  resolveLectumLinkShareData,
} from "./lectum-share-media/native-share";

const createLectumShareFile = async (target: LectumShareSocialTarget) => {
  const mediaUrl = resolvePublicMediaUrl(target.mediaUrl);

  if (!mediaUrl) {
    throw new Error("Mídia indisponível para compartilhamento.");
  }

  if ("fonts" in document) {
    await document.fonts.ready.catch(() => undefined);
  }

  if (target.mediaType === "image") {
    const image = await loadImageElement(mediaUrl);

    return createImageShareFile(target, image);
  }

  const video = await loadVideoElement(mediaUrl);

  try {
    return await createVideoShareFile(target, video);
  } catch {
    const fallbackVideo = await loadVideoElement(mediaUrl);

    return createImageShareFile(target, fallbackVideo);
  }
};

type PreparedShareFileCacheValue = File | Promise<File>;

const preparedShareFileCache = new Map<string, PreparedShareFileCacheValue>();

const createPreparedShareFileCacheKey = (target: LectumShareSocialTarget) =>
  JSON.stringify([
    target.kind,
    target.postId,
    target.replyId,
    target.mediaType,
    target.mediaUrl,
    target.shareUrl,
    target.sourceText,
    target.responseText,
    target.professional.name,
    target.cardLabel,
  ]);

const isPreparedShareFile = (value: PreparedShareFileCacheValue): value is File =>
  typeof File !== "undefined" && value instanceof File;

export const getPreparedLectumShareFile = (target: LectumShareSocialTarget) => {
  const cached = preparedShareFileCache.get(createPreparedShareFileCacheKey(target));

  return cached && isPreparedShareFile(cached) ? cached : null;
};

export const cachePreparedLectumShareFile = (target: LectumShareSocialTarget, file: File) => {
  preparedShareFileCache.set(createPreparedShareFileCacheKey(target), file);
};

export const prepareLectumShareFile = (target: LectumShareSocialTarget) => {
  const cacheKey = createPreparedShareFileCacheKey(target);
  const cached = preparedShareFileCache.get(cacheKey);

  if (cached) {
    return Promise.resolve(cached).catch((error) => {
      preparedShareFileCache.delete(cacheKey);
      throw error;
    });
  }

  const pendingFile = createLectumShareFile(target).then(
    (file) => {
      preparedShareFileCache.set(cacheKey, file);
      return file;
    },
    (error) => {
      preparedShareFileCache.delete(cacheKey);
      throw error;
    },
  );

  preparedShareFileCache.set(cacheKey, pendingFile);
  return pendingFile;
};

const downloadFile = (file: File) => {
  const url = URL.createObjectURL(file);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = file.name;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
};

const copyShareUrl = async (url: string) => {
  if (!navigator.clipboard?.writeText) return false;

  await navigator.clipboard.writeText(url);
  return true;
};

export const sharePreparedLectumVideoResponse = async (
  target: LectumShareSocialTarget,
  file: File,
  options: { skipDownloadOnActivationLoss?: boolean } = {},
): Promise<ShareExportResult> => {
  const nav = navigator as ShareNavigator;
  const shareData: ShareData = {
    files: [file],
    text: target.shareText,
    title: target.shareTitle,
    url: target.shareUrl,
  };
  const nativeShareData = resolveLectumFileShareData(nav, shareData);

  if (nativeShareData) {
    try {
      await nav.share(nativeShareData);
      return { channel: "web_share", file, mode: "file" };
    } catch (error) {
      if (isNativeShareAbortError(error)) throw error;

      if (options.skipDownloadOnActivationLoss && isNativeShareActivationError(error)) {
        return { channel: null, file, mode: "prepared" };
      }
    }
  }

  downloadFile(file);
  const copied = await copyShareUrl(target.shareUrl).catch(() => false);

  return { channel: copied ? "clipboard" : null, file, mode: "download" };
};

export const shareLectumVideoResponse = async (
  target: LectumShareSocialTarget,
): Promise<ShareExportResult> => {
  const file = await prepareLectumShareFile(target);

  return sharePreparedLectumVideoResponse(target, file, {
    skipDownloadOnActivationLoss: true,
  });
};

export const shareLectumLinkTarget = async (
  target: LectumShareLinkTarget,
): Promise<ShareExportResult> => {
  const nav = navigator as ShareNavigator;
  const shareData: ShareData = {
    text: target.text ?? undefined,
    title: target.title,
    url: target.shareUrl,
  };
  const nativeShareData = resolveLectumLinkShareData(nav, shareData);

  if (nativeShareData) {
    try {
      await nav.share(nativeShareData);
      return { channel: "web_share", mode: "link" };
    } catch (error) {
      if (isNativeShareAbortError(error)) throw error;
    }
  }

  const copied = await copyShareUrl(target.shareUrl).catch(() => false);

  if (!copied) {
    throw new Error("Compartilhamento indisponível.");
  }

  return { channel: "clipboard", mode: "clipboard" };
};

export const shareLectumSocialLinkPreviewTarget = async (
  target: LectumShareSocialTarget,
): Promise<ShareExportResult> =>
  shareLectumLinkTarget({
    kind: "link",
    postId: target.postId,
    replyId: target.replyId,
    shareUrl: target.shareUrl,
    text: null,
    title: target.shareTitle,
  });

export { createLectumShareFrameImageFile } from "./lectum-share-media/export";
export type { LectumShareFrameTarget } from "./lectum-share-media/layout";
export {
  isNativeShareAbortError,
  isNativeShareActivationError,
  resolveLectumFileShareData,
  resolveLectumLinkShareData,
} from "./lectum-share-media/native-share";
