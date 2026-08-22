import type { ShareNavigator } from "./layout";

export const isNativeShareAbortError = (error: unknown) =>
  error instanceof DOMException && error.name === "AbortError";

const canUseNativeShareData = (nav: ShareNavigator, shareData: ShareData) => {
  if (!nav.share) return false;
  if (!nav.canShare) return true;

  try {
    return nav.canShare(shareData);
  } catch {
    return false;
  }
};

export const resolveLectumFileShareData = (
  nav: ShareNavigator,
  shareData: ShareData,
): ShareData | null => {
  if (canUseNativeShareData(nav, shareData)) return shareData;

  if (!shareData.files?.length) return null;

  const filesOnlyShareData: ShareData = {
    files: shareData.files,
  };

  return canUseNativeShareData(nav, filesOnlyShareData) ? filesOnlyShareData : null;
};
