import type { LectumShareLinkTarget } from "@/utils/lectum-share-target";
import {
  isNativeShareAbortError,
  resolveLectumLinkShareData,
  type ShareNavigator,
} from "./lectum-share-media/native-share";

export type ShareExportResult = {
  channel: "clipboard" | "web_share";
  mode: "clipboard" | "link";
};

const copyShareUrl = async (url: string) => {
  if (!navigator.clipboard?.writeText) return false;

  await navigator.clipboard.writeText(url);
  return true;
};

export const copyLectumShareTargetUrl = async (
  target: Pick<LectumShareLinkTarget, "shareUrl">,
): Promise<ShareExportResult> => {
  const copied = await copyShareUrl(target.shareUrl).catch(() => false);

  if (!copied) {
    throw new Error("Compartilhamento indisponível.");
  }

  return { channel: "clipboard", mode: "clipboard" };
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
      await nav.share?.(nativeShareData);
      return { channel: "web_share", mode: "link" };
    } catch (error) {
      if (isNativeShareAbortError(error)) throw error;
    }
  }

  return copyLectumShareTargetUrl(target);
};

export { isNativeShareAbortError } from "./lectum-share-media/native-share";
