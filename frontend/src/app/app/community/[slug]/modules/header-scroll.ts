export type CommunityHeaderScrollState = { position: number; visible: boolean };

export function updateCommunityHeaderScroll(
  state: CommunityHeaderScrollState,
  scrollY: number,
  maxScroll: number,
  originalHidden: boolean,
): CommunityHeaderScrollState {
  const position = Math.max(0, Math.min(scrollY, Math.max(0, maxScroll)));
  if (!originalHidden || position === 0) return { position, visible: false };

  // Accumulate slow gestures from the direction's extreme, ignoring tiny reversals.
  if (state.visible) {
    if (position - state.position >= 8) return { position, visible: false };
    return { position: Math.min(position, state.position), visible: true };
  }
  if (state.position - position >= 8) return { position, visible: true };
  return { position: Math.max(position, state.position), visible: false };
}
