"use client";

import { useEffect } from "react";
import type { UseFormReturn } from "react-hook-form";
import { useDebouncedSearch } from "@/hooks/use-debounced-search";
import type { ContentFilters } from "./filters";

export type ContentSearch = Pick<ContentFilters, "q" | "psychologist">;

export const encodeContentSearch = (value: Partial<ContentSearch>) =>
  JSON.stringify({ q: (value.q ?? "").trim(), psychologist: (value.psychologist ?? "").trim() });

export const useContentSearch = (
  form: UseFormReturn<ContentFilters>,
  initial: ContentSearch,
  onSearch: (value: ContentSearch) => void,
) => {
  // Treat both fields as one draft so concurrent edits cannot overwrite each other.
  const { draft, onDraftChange } = useDebouncedSearch({
    value: encodeContentSearch(initial),
    onSearch: (value) => onSearch(JSON.parse(value) as ContentSearch),
  });
  const { watch, getValues, setValue } = form;

  useEffect(() => {
    const subscription = watch((value, { name, type }) => {
      if (type === "change" && (name === "q" || name === "psychologist")) {
        onDraftChange(encodeContentSearch(value));
      }
    });
    return () => subscription.unsubscribe();
  }, [watch, onDraftChange]);

  useEffect(() => {
    const search = JSON.parse(draft) as ContentSearch;
    for (const name of ["q", "psychologist"] as const) {
      // URL acknowledgements must not erase spaces or text still being typed.
      if (getValues(name).trim() !== search[name]) setValue(name, search[name]);
    }
  }, [draft, getValues, setValue]);
};
