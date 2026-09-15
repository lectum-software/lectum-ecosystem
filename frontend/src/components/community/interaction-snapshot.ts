// Local optimism is scoped to one viewer/target and never owns refreshed server data.
export type InteractionSnapshotState<T extends object> = {
  scope: string;
  source: T;
  override: T | null;
  pending: { token: symbol; rollback: T | null; source: T } | null;
};

const equalSnapshot = <T extends object>(left: T, right: T) => {
  const keys = Object.keys(left) as (keyof T)[];
  return (
    keys.length === Object.keys(right).length &&
    keys.every((key) => Object.hasOwn(right, key) && Object.is(left[key], right[key]))
  );
};

export const createInteractionSnapshot = <T extends object>(
  scope: string,
  source: T,
): InteractionSnapshotState<T> => ({ scope, source, override: null, pending: null });

export const receiveInteractionSnapshot = <T extends object>(
  state: InteractionSnapshotState<T>,
  scope: string,
  source: T,
): InteractionSnapshotState<T> => {
  if (state.scope !== scope) return createInteractionSnapshot(scope, source);
  if (equalSnapshot(state.source, source)) return state;
  return { ...state, source, override: state.pending ? state.override : null };
};

export const beginInteractionSnapshot = <T extends object>(
  state: InteractionSnapshotState<T>,
  token: symbol,
  value: T,
): InteractionSnapshotState<T> => ({
  ...state,
  override: value,
  pending: { token, rollback: state.override, source: state.source },
});

export const finishInteractionSnapshot = <T extends object>(
  state: InteractionSnapshotState<T>,
  token: symbol,
  result?: T,
): InteractionSnapshotState<T> => {
  if (state.pending?.token !== token) return state;
  const override = result
    ? equalSnapshot(state.source, result)
      ? null
      : result
    : equalSnapshot(state.source, state.pending.source)
      ? state.pending.rollback
      : null;
  return { ...state, override, pending: null };
};
