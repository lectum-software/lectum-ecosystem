export const PSYCHOLOGISTS_FEED_INSTANT_RESTORE_ATTRIBUTE =
  "data-psychologists-feed-instant-restore";

type PsychologistsFeedScrollContainer = Pick<
  HTMLDivElement,
  | "clientHeight"
  | "getAttribute"
  | "querySelector"
  | "removeAttribute"
  | "scrollLeft"
  | "scrollTop"
  | "setAttribute"
  | "style"
>;

const getSlideSelector = (index: number) => `[data-psychologists-slide-index="${index}"]`;

const getSafeScrollTop = (value: number) =>
  Number.isFinite(value) && value > 0 ? Math.max(0, value) : 0;

export const getPsychologistsFeedRestoreScrollTop = (
  container: Pick<HTMLDivElement, "clientHeight" | "querySelector">,
  index: number,
  fallbackTop?: number | null,
) => {
  const targetSlide = container.querySelector<HTMLElement>(getSlideSelector(index));

  return getSafeScrollTop(targetSlide?.offsetTop ?? fallbackTop ?? index * container.clientHeight);
};

export const restorePsychologistsFeedScrollInstantly = (
  container: PsychologistsFeedScrollContainer,
  index: number,
  fallbackTop?: number | null,
) => {
  const targetTop = getPsychologistsFeedRestoreScrollTop(container, index, fallbackTop);
  const previousScrollBehavior = container.style.scrollBehavior;
  const previousScrollSnapType = container.style.scrollSnapType;
  const previousRestoreAttribute = container.getAttribute(
    PSYCHOLOGISTS_FEED_INSTANT_RESTORE_ATTRIBUTE,
  );
  let restored = false;

  const restoreStyles = () => {
    if (restored) return;
    restored = true;

    container.style.scrollBehavior = previousScrollBehavior;
    container.style.scrollSnapType = previousScrollSnapType;

    if (previousRestoreAttribute === null) {
      container.removeAttribute(PSYCHOLOGISTS_FEED_INSTANT_RESTORE_ATTRIBUTE);
    } else {
      container.setAttribute(
        PSYCHOLOGISTS_FEED_INSTANT_RESTORE_ATTRIBUTE,
        previousRestoreAttribute,
      );
    }
  };

  container.setAttribute(PSYCHOLOGISTS_FEED_INSTANT_RESTORE_ATTRIBUTE, "true");
  container.style.scrollBehavior = "auto";
  container.style.scrollSnapType = "none";
  container.scrollTop = targetTop;
  container.scrollLeft = 0;

  if (typeof window === "undefined" || typeof window.requestAnimationFrame !== "function") {
    restoreStyles();
    return restoreStyles;
  }

  const restoreFrame = window.requestAnimationFrame(restoreStyles);

  return () => {
    window.cancelAnimationFrame(restoreFrame);
    restoreStyles();
  };
};
