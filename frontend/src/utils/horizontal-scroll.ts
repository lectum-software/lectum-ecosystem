export function horizontalScrollEdges(
  scrollLeft: number,
  clientWidth: number,
  scrollWidth: number,
) {
  const max = Math.max(0, scrollWidth - clientWidth);
  const position = Math.max(0, Math.min(scrollLeft, max));
  return {
    left: clientWidth > 0 && position > 1,
    right: clientWidth > 0 && max - position > 1,
  };
}

export function horizontalRevealDelta(
  viewport: { left: number; right: number },
  item: { left: number; right: number },
) {
  if (viewport.right <= viewport.left) return 0;
  if (item.left < viewport.left) return item.left - viewport.left;
  if (item.right > viewport.right) {
    return Math.min(item.right - viewport.right, item.left - viewport.left);
  }
  return 0;
}
