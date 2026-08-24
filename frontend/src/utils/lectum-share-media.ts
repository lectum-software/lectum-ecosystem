import type { LectumShareLinkTarget, LectumShareSocialTarget } from "@/utils/lectum-share-target";
import { resolvePublicMediaUrl } from "@/utils/media";
import {
  createImageShareFile,
  createMediabunnyVideoShareFile,
  createVideoShareFile,
  shouldUseMediabunnyVideoShareExport,
} from "./lectum-share-media/export";
import { safeFileName } from "./lectum-share-media/file-name";
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

  if (shouldUseMediabunnyVideoShareExport()) {
    const mediabunnyFile = await createMediabunnyVideoShareFile(target, mediaUrl).catch(() => null);

    if (mediabunnyFile) return mediabunnyFile;
  }

  const video = await loadVideoElement(mediaUrl);

  return createVideoShareFile(target, video);
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

const SOURCE_VIDEO_FALLBACK_MIME_BY_EXTENSION: Record<string, string> = {
  m4v: "video/mp4",
  mov: "video/quicktime",
  mp4: "video/mp4",
  webm: "video/webm",
};

const SOURCE_VIDEO_FALLBACK_EXTENSION_BY_MIME: Record<string, string> = {
  "video/mp4": "mp4",
  "video/quicktime": "mov",
  "video/webm": "webm",
};

const sourceVideoFallbackFileCache = new Map<string, PreparedShareFileCacheValue>();
const sourceVideoFallbackFiles = new WeakSet<File>();

const isPreparedShareFile = (value: PreparedShareFileCacheValue): value is File =>
  typeof File !== "undefined" && value instanceof File;

const normalizeMimeType = (value?: string | null) =>
  value?.trim().toLowerCase().split(";", 1)[0] ?? "";

const sourceVideoExtensionFromUrl = (mediaUrl: string) => {
  try {
    const pathname = new URL(mediaUrl, window.location.href).pathname;
    return pathname.match(/\.([a-z0-9]{1,8})$/iu)?.[1]?.toLowerCase() ?? null;
  } catch {
    return mediaUrl.match(/\.([a-z0-9]{1,8})(?:[?#]|$)/iu)?.[1]?.toLowerCase() ?? null;
  }
};

const resolveSourceVideoFallbackType = (input: {
  contentType?: string | null;
  mediaUrl: string;
}) => {
  const contentType = normalizeMimeType(input.contentType);
  const urlExtension = sourceVideoExtensionFromUrl(input.mediaUrl);

  if (contentType.startsWith("video/")) {
    return {
      extension: SOURCE_VIDEO_FALLBACK_EXTENSION_BY_MIME[contentType] ?? urlExtension ?? "mp4",
      mimeType: contentType,
    };
  }

  if (!urlExtension) return null;

  const mimeType = SOURCE_VIDEO_FALLBACK_MIME_BY_EXTENSION[urlExtension];

  return mimeType
    ? {
        extension: urlExtension === "m4v" ? "mp4" : urlExtension,
        mimeType,
      }
    : null;
};

const createSourceVideoFallbackFile = async (target: LectumShareSocialTarget) => {
  if (target.mediaType !== "video") {
    throw new Error("Video indisponivel para compartilhamento.");
  }

  const mediaUrl = resolvePublicMediaUrl(target.mediaUrl);

  if (!mediaUrl) {
    throw new Error("Video indisponivel para compartilhamento.");
  }

  const response = await fetch(mediaUrl);

  if (!response.ok) {
    throw new Error("Video indisponivel para compartilhamento.");
  }

  const blob = await response.blob();
  const fallbackType = resolveSourceVideoFallbackType({
    contentType: response.headers.get("content-type") || blob.type,
    mediaUrl,
  });

  if (!fallbackType || blob.size === 0) {
    throw new Error("Video indisponivel para compartilhamento.");
  }

  const file = new File([blob], safeFileName(target, fallbackType.extension), {
    type: fallbackType.mimeType,
  });
  sourceVideoFallbackFiles.add(file);

  return file;
};

export const getPreparedLectumShareFile = (target: LectumShareSocialTarget) => {
  const cached = preparedShareFileCache.get(createPreparedShareFileCacheKey(target));

  return cached && isPreparedShareFile(cached) ? cached : null;
};

export const cachePreparedLectumShareFile = (target: LectumShareSocialTarget, file: File) => {
  preparedShareFileCache.set(createPreparedShareFileCacheKey(target), file);
};

export const clearPreparedLectumShareFile = (target: LectumShareSocialTarget) => {
  preparedShareFileCache.delete(createPreparedShareFileCacheKey(target));
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

export const isLectumSourceVideoFallbackFile = (file: File) => sourceVideoFallbackFiles.has(file);

export const prepareLectumSourceVideoFallbackFile = (target: LectumShareSocialTarget) => {
  const cacheKey = `source-video:${createPreparedShareFileCacheKey(target)}`;
  const cached = sourceVideoFallbackFileCache.get(cacheKey);

  if (cached) {
    return Promise.resolve(cached).catch((error) => {
      sourceVideoFallbackFileCache.delete(cacheKey);
      throw error;
    });
  }

  const pendingFile = createSourceVideoFallbackFile(target).then(
    (file) => {
      sourceVideoFallbackFileCache.set(cacheKey, file);
      return file;
    },
    (error) => {
      sourceVideoFallbackFileCache.delete(cacheKey);
      throw error;
    },
  );

  sourceVideoFallbackFileCache.set(cacheKey, pendingFile);
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

export const copyLectumShareTargetUrl = async (
  target: Pick<LectumShareLinkTarget | LectumShareSocialTarget, "shareUrl">,
): Promise<ShareExportResult> => {
  const copied = await copyShareUrl(target.shareUrl).catch(() => false);

  if (!copied) {
    throw new Error("Compartilhamento indisponível.");
  }

  return { channel: "clipboard", mode: "clipboard" };
};

export const sharePreparedLectumVideoResponse = async (
  target: LectumShareSocialTarget,
  file: File,
  options: { skipDownloadOnActivationLoss?: boolean } = {},
): Promise<ShareExportResult> => {
  const nav = navigator as ShareNavigator;
  const shareData: ShareData = {
    files: [file],
    title: target.shareTitle,
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

  return { channel: null, file, mode: "download" };
};

export const downloadPreparedLectumShareFile = async (
  _target: LectumShareSocialTarget,
  file: File,
): Promise<ShareExportResult> => {
  downloadFile(file);

  return { channel: null, file, mode: "download" };
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

  return copyLectumShareTargetUrl(target);
};

export const shareLectumSocialLinkPreviewTarget = async (
  target: LectumShareSocialTarget,
  options: { whatsappPreview?: boolean } = {},
): Promise<ShareExportResult> =>
  shareLectumLinkTarget({
    kind: "link",
    postId: target.postId,
    replyId: target.replyId,
    shareUrl: options.whatsappPreview ? target.whatsappShareUrl : target.shareUrl,
    text: null,
    title: `${target.professional.name} na Lectum`,
  });

export const shareLectumWhatsAppPreviewTarget = async (
  target: LectumShareSocialTarget,
): Promise<ShareExportResult> => {
  const whatsappShareUrl = target.whatsappShareUrl || target.shareUrl;
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(whatsappShareUrl)}`;
  const opened = window.open(whatsappUrl, "_blank");

  if (opened) {
    try {
      opened.opener = null;
    } catch {
      // A navegação externa para o WhatsApp não deve falhar se o navegador bloquear opener.
    }
    return { channel: "web_share", mode: "link" };
  }

  return shareLectumSocialLinkPreviewTarget(target, { whatsappPreview: true });
};

export { createLectumShareFrameImageFile } from "./lectum-share-media/export";
export type { LectumShareFrameTarget } from "./lectum-share-media/layout";
export {
  isNativeShareAbortError,
  isNativeShareActivationError,
  resolveLectumFileShareData,
  resolveLectumLinkShareData,
} from "./lectum-share-media/native-share";
