type Rect = { top: number; bottom: number; right: number };
type Bounds = { top: number; bottom: number; left: number; right: number };

export const getReplyMenuPosition = (
  anchor: Rect,
  bounds: Bounds,
  desiredWidth: number,
  desiredHeight: number,
) => {
  const margin = 8;
  const width = Math.max(0, Math.min(desiredWidth, bounds.right - bounds.left - margin * 2));
  const topLimit = bounds.top + margin;
  const bottomLimit = Math.max(topLimit, bounds.bottom - margin);
  const below = Math.max(0, bottomLimit - Math.max(topLimit, anchor.bottom + margin));
  const above = Math.max(0, Math.min(bottomLimit, anchor.top - margin) - topLimit);
  const opensAbove = desiredHeight > below && above > below;
  const maxHeight = opensAbove ? above : below;
  const height = Math.min(desiredHeight, maxHeight);
  return {
    width,
    maxHeight,
    left: Math.max(
      bounds.left + margin,
      Math.min(anchor.right - width, bounds.right - margin - width),
    ),
    top: opensAbove
      ? Math.max(topLimit, Math.min(bottomLimit, anchor.top - margin) - height)
      : Math.min(bottomLimit, Math.max(topLimit, anchor.bottom + margin)),
  };
};
