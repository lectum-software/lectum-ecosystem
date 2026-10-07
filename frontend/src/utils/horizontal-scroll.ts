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
