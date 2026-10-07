export const isKeyboardInput = (element: Element | null) =>
  element instanceof HTMLElement &&
  (element.isContentEditable ||
    element.matches(
      'textarea:not([readonly]):not([disabled]), input:not([readonly]):not([disabled]):not([type="button"]):not([type="submit"]):not([type="checkbox"]):not([type="radio"]):not([type="file"]):not([type="range"]):not([type="color"]):not([type="hidden"]):not([type="reset"]):not([type="image"]), select:not([disabled])',
    ));

export const getFixedBottomCorrection = ({
  current,
  bottom,
  height,
}: {
  current: number;
  bottom: number;
  height: number;
}) => {
  if (![current, bottom, height].every(Number.isFinite) || height <= 0) return 0;
  // Subtract the correction already applied; never accumulate scroll events.
  const next = Math.max(0, Math.min(height, current + height - bottom));
  return next > 4 ? Math.round(next) : 0;
};

export const getReplyKeyboardOffset = ({
  focused,
  layoutHeight,
  viewportHeight,
  viewportTop,
  scale,
  composerBottom,
  currentOffset,
}: {
  focused: boolean;
  layoutHeight: number;
  viewportHeight: number;
  viewportTop: number;
  scale: number;
  composerBottom: number;
  currentOffset: number;
}) => {
  if (
    !focused ||
    Math.abs(scale - 1) > 0.01 ||
    ![layoutHeight, viewportHeight, viewportTop, composerBottom, currentOffset].every(
      Number.isFinite,
    ) ||
    viewportHeight <= 0 ||
    layoutHeight - viewportHeight < 100
  ) {
    return 0;
  }

  const visibleBottom = viewportTop + viewportHeight;
  const overlap = Math.max(0, currentOffset + composerBottom - visibleBottom);
  return overlap > 24 ? Math.min(Math.round(overlap) + 8, layoutHeight - 1) : 0;
};
