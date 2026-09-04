export type ShareNavigator = Navigator & {
  canShare?: (data?: ShareData) => boolean;
  share?: (data?: ShareData) => Promise<void>;
};

const nativeShareErrorName = (error: unknown) =>
  typeof error === "object" && error !== null && "name" in error
    ? String((error as { name?: unknown }).name ?? "")
    : "";

export const isNativeShareAbortError = (error: unknown) =>
  nativeShareErrorName(error) === "AbortError";

const canUseNativeShareData = (nav: ShareNavigator, shareData: ShareData) => {
  if (!nav.share) return false;
  if (!nav.canShare) return true;

  try {
    return nav.canShare(shareData);
  } catch {
    return false;
  }
};

export const resolveLectumLinkShareData = (
  nav: ShareNavigator,
  shareData: ShareData,
): ShareData | null => {
  if (!shareData.url) return null;

  return canUseNativeShareData(nav, shareData) ? shareData : null;
};
