import type { LectumShareSocialTarget, LectumShareVideoTarget } from "@/utils/lectum-share-target";
import { resolvePublicMediaUrl } from "@/utils/media";
import { createImageShareFile, createVideoShareFile } from "./lectum-share-media/export";
import {
  loadImageElement,
  loadVideoElement,
  type ShareExportResult,
  type ShareNavigator,
} from "./lectum-share-media/layout";

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

export const shareLectumVideoResponse = async (
  target: LectumShareSocialTarget,
): Promise<ShareExportResult> => {
  const file = await createLectumShareFile(target);
  const nav = navigator as ShareNavigator;
  const shareData: ShareData = {
    files: [file],
    text: target.shareText,
    title: target.shareTitle,
  };

  if (nav.share && (!nav.canShare || nav.canShare(shareData))) {
    await nav.share(shareData);
    return { channel: "web_share", file, mode: "file" };
  }

  downloadFile(file);
  const copied = await copyShareUrl(target.shareUrl).catch(() => false);

  return { channel: copied ? "clipboard" : null, file, mode: "download" };
};

export const copyLectumShareUrl = async (target: LectumShareVideoTarget) => {
  const copied = await copyShareUrl(target.shareUrl);

  if (!copied) {
    throw new Error("Clipboard indisponível.");
  }
};

export const copyLectumShareText = async (target: LectumShareSocialTarget) => {
  if (!target.responseText) {
    throw new Error("Texto indisponível.");
  }

  const copied = await copyShareUrl(target.responseText);

  if (!copied) {
    throw new Error("Clipboard indisponível.");
  }
};

export { createLectumShareFrameImageFile } from "./lectum-share-media/export";
export type { LectumShareFrameTarget } from "./lectum-share-media/layout";
