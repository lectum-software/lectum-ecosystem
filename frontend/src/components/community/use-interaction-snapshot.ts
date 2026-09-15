"use client";

import { useCallback, useState } from "react";
import {
  beginInteractionSnapshot,
  createInteractionSnapshot,
  finishInteractionSnapshot,
  receiveInteractionSnapshot,
} from "./interaction-snapshot";

export const useInteractionSnapshot = <T extends object>(scope: string, source: T) => {
  const [stored, setStored] = useState(() => createInteractionSnapshot(scope, source));
  const current = receiveInteractionSnapshot(stored, scope, source);
  // Guarded render adjustment avoids a stale frame and does not erase pending optimism.
  if (current !== stored) setStored(current);

  const begin = useCallback(
    (value: T) => {
      const token = Symbol();
      setStored((state) =>
        state.scope === scope ? beginInteractionSnapshot(state, token, value) : state,
      );
      return {
        onError: () => setStored((state) => finishInteractionSnapshot(state, token)),
        onSuccess: (result: T) =>
          setStored((state) => finishInteractionSnapshot(state, token, result)),
      };
    },
    [scope],
  );

  return { begin, snapshot: current.override ?? current.source };
};
