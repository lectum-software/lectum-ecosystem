import type { ShareNavigator } from "./layout";

const nativeShareErrorName = (error: unknown) =>
  typeof error === "object" && error !== null && "name" in error
    ? String((error as { name?: unknown }).name ?? "")
    : "";

export const isNativeShareAbortError = (error: unknown) =>
  nativeShareErrorName(error) === "AbortError";

export const isNativeShareActivationError = (error: unknown) => {
  const errorName = nativeShareErrorName(error);

  return errorName === "NotAllowedError" || errorName === "SecurityError";
};

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

export const resolveLectumLinkShareData = (
  nav: ShareNavigator,
  shareData: ShareData,
): ShareData | null => {
  if (!shareData.url) return null;

  return canUseNativeShareData(nav, shareData) ? shareData : null;
};
