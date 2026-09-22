export const LECTUM_APP_REFRESH_EVENT = "lectum:refresh-current-view";

export type LectumAppRefreshSource = "navigation" | "pull";

export type LectumAppRefreshEvent = CustomEvent<{
  source: LectumAppRefreshSource;
}>;

const VIEWPORT_TOP_THRESHOLD_PX = 2;
const NAVIGATION_SCROLL_TO_TOP_TIMEOUT_MS = 1100;

const getViewportScrollTop = () => {
  if (typeof window === "undefined") return 0;

  return Math.max(
    window.scrollY || 0,
    document.documentElement?.scrollTop || 0,
    document.body?.scrollTop || 0,
  );
};

export const isLectumViewportAtTop = () => getViewportScrollTop() <= VIEWPORT_TOP_THRESHOLD_PX;

const shouldUseInstantScrollToTop = () => {
  if (typeof window === "undefined") return true;

  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
};

const waitForLectumViewportTop = (timeoutMs = NAVIGATION_SCROLL_TO_TOP_TIMEOUT_MS) =>
  new Promise<void>((resolve) => {
    if (typeof window === "undefined" || isLectumViewportAtTop()) {
      resolve();
      return;
    }

    let animationFrameId: number | null = null;
    let timeoutId: number | null = null;
    let finished = false;

    const cleanup = () => {
      window.removeEventListener("scroll", checkTop);

      if (animationFrameId !== null) {
        window.cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }

      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
        timeoutId = null;
      }
    };

    const finish = () => {
      if (finished) return;

      finished = true;
      cleanup();
      resolve();
    };

    const checkTop = () => {
      if (isLectumViewportAtTop()) {
        finish();
        return;
      }

      if (animationFrameId !== null) return;

      animationFrameId = window.requestAnimationFrame(() => {
        animationFrameId = null;
        checkTop();
      });
    };

    window.addEventListener("scroll", checkTop, { passive: true });
    timeoutId = window.setTimeout(finish, timeoutMs);
    checkTop();
  });

export const scrollLectumViewportToTopBeforeRefresh = async () => {
  if (typeof window === "undefined" || isLectumViewportAtTop()) return;

  window.scrollTo({
    behavior: shouldUseInstantScrollToTop() ? "auto" : "smooth",
    left: 0,
    top: 0,
  });

  await waitForLectumViewportTop();
};

export const requestLectumAppRefresh = (source: LectumAppRefreshSource) => {
  if (typeof window === "undefined") return false;

  window.dispatchEvent(
    new CustomEvent(LECTUM_APP_REFRESH_EVENT, {
      detail: { source },
    }),
  );

  return true;
};

export const requestLectumAppRefreshAfterReturningToTop = async (
  source: LectumAppRefreshSource,
) => {
  if (typeof window === "undefined") return false;

  if (source === "navigation") {
    await scrollLectumViewportToTopBeforeRefresh();
  }

  return requestLectumAppRefresh(source);
};
