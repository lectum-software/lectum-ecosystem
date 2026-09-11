"use client";

import { useEffect, useReducer, useRef } from "react";

const SEARCH_DEBOUNCE_MS = 350;

type SearchState = {
  draft: string;
  urlValue: string;
  pending: string[];
};

type SearchAction = { type: "edit" | "request" | "url"; value: string } | { type: "history" };

export const createSearchState = (value: string): SearchState => ({
  draft: value,
  urlValue: value,
  pending: [],
});

export const reduceSearchState = (state: SearchState, action: SearchAction): SearchState => {
  switch (action.type) {
    case "edit":
      return { ...state, draft: action.value };
    case "request":
      return { ...state, pending: [...state.pending, action.value] };
    case "history":
      return createSearchState(state.urlValue);
    case "url": {
      const acknowledged = state.pending.lastIndexOf(action.value);
      // An echo of our request must not erase text typed while it was in flight.
      return acknowledged < 0
        ? createSearchState(action.value)
        : {
            ...state,
            urlValue: action.value,
            pending: state.pending.slice(acknowledged + 1),
          };
    }
  }
};

export const scheduleSearchDraft = (
  { draft, urlValue, pending }: SearchState,
  onSearch: (value: string) => void,
) => {
  const normalized = draft.trim();
  if (normalized === (pending.at(-1) ?? urlValue)) return () => {};

  const timer = setTimeout(() => onSearch(normalized), SEARCH_DEBOUNCE_MS);
  return () => clearTimeout(timer);
};

export const useDebouncedSearch = ({
  onSearch,
  value,
}: {
  onSearch: (value: string) => void;
  value?: string;
}) => {
  const [state, dispatch] = useReducer(reduceSearchState, value || "", createSearchState);
  const onSearchRef = useRef(onSearch);
  const cancelRef = useRef<() => void>(() => {});
  let current = state;

  // Reconcile before effects can schedule a stale draft after URL navigation.
  if (state.urlValue !== (value || "")) {
    const action = { type: "url", value: value || "" } as const;
    current = reduceSearchState(state, action);
    dispatch(action);
  }
  const { draft, urlValue, pending } = current;

  useEffect(() => {
    onSearchRef.current = onSearch;
  }, [onSearch]);

  useEffect(() => {
    const handleHistory = () => {
      cancelRef.current();
      // Also discard a draft when history changes filters but keeps the same q.
      dispatch({ type: "history" });
    };
    window.addEventListener("popstate", handleHistory);
    return () => window.removeEventListener("popstate", handleHistory);
  }, []);

  useEffect(() => {
    const cancel = scheduleSearchDraft({ draft, urlValue, pending }, (query) => {
      dispatch({ type: "request", value: query });
      onSearchRef.current(query);
    });
    cancelRef.current = cancel;
    return cancel;
  }, [draft, urlValue, pending]);

  const onDraftChange = (nextDraft: string) => {
    if (nextDraft !== draft) cancelRef.current();
    dispatch({ type: "edit", value: nextDraft });
  };

  return { draft, onDraftChange };
};
