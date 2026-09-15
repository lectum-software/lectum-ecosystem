export type CreatePostModalTouchScrollState = {
  startX: number;
  startY: number;
  target: Element | null;
};

const SCROLLABLE_OVERFLOW_VALUES = new Set(["auto", "overlay", "scroll"]);
const TOUCH_SCROLL_EPSILON = 1;

const toElement = (target: EventTarget | null) => {
  if (target instanceof Element) return target;
  if (target instanceof Node) return target.parentElement;

  return null;
};

const findScrollableAncestor = (
  startElement: Element | null,
  root: HTMLElement,
  axis: "x" | "y",
) => {
  let current: Element | null = startElement;

  while (current && root.contains(current)) {
    if (current instanceof HTMLElement) {
      const style = window.getComputedStyle(current);
      const overflow = axis === "y" ? style.overflowY : style.overflowX;
      const hasScrollableOverflow = SCROLLABLE_OVERFLOW_VALUES.has(overflow);
      const hasScrollableContent =
        axis === "y"
          ? current.scrollHeight - current.clientHeight > TOUCH_SCROLL_EPSILON
          : current.scrollWidth - current.clientWidth > TOUCH_SCROLL_EPSILON;

      if (hasScrollableOverflow && hasScrollableContent) {
        return current;
      }
    }

    if (current === root) break;
    current = current.parentElement;
  }

  return null;
};

const canScrollInGestureDirection = (element: HTMLElement, axis: "x" | "y", delta: number) => {
  if (Math.abs(delta) <= TOUCH_SCROLL_EPSILON) return false;

  if (axis === "y") {
    const maxScrollTop = element.scrollHeight - element.clientHeight;

    if (delta > 0) return element.scrollTop > TOUCH_SCROLL_EPSILON;

    return element.scrollTop < maxScrollTop - TOUCH_SCROLL_EPSILON;
  }

  const maxScrollLeft = element.scrollWidth - element.clientWidth;

  if (delta > 0) return element.scrollLeft > TOUCH_SCROLL_EPSILON;

  return element.scrollLeft < maxScrollLeft - TOUCH_SCROLL_EPSILON;
};

export const recordCreatePostModalTouchStart = (
  state: CreatePostModalTouchScrollState,
  event: TouchEvent,
) => {
  const touch = event.touches[0];

  if (!touch) {
    state.target = null;
    return;
  }

  state.startX = touch.clientX;
  state.startY = touch.clientY;
  state.target = toElement(event.target);
};

export const shouldAllowCreatePostModalTouchMove = (
  state: CreatePostModalTouchScrollState,
  event: TouchEvent,
  root: HTMLElement,
) => {
  const touch = event.touches[0];

  if (!touch || !state.target) return false;

  const deltaX = touch.clientX - state.startX;
  const deltaY = touch.clientY - state.startY;
  const axis = Math.abs(deltaX) > Math.abs(deltaY) ? "x" : "y";
  const delta = axis === "x" ? deltaX : deltaY;
  const scrollableAncestor = findScrollableAncestor(state.target, root, axis);

  return Boolean(
    scrollableAncestor && canScrollInGestureDirection(scrollableAncestor, axis, delta),
  );
};
