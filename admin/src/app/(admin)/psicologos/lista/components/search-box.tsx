"use client";

import { Search } from "lucide-react";
import { useDebouncedSearch } from "@/hooks/use-debounced-search";

export const SearchBox = ({
  onSearch,
  value,
}: {
  onSearch: (value: string) => void;
  value?: string;
}) => {
  const { draft, onDraftChange } = useDebouncedSearch({ onSearch, value });

  return (
    <label className="relative block h-12 w-full min-w-0 text-sm font-medium text-foreground">
      <span className="sr-only">Buscar por nome, e-mail ou CRP</span>
      <Search
        aria-hidden
        className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle"
      />
      <input
        className="h-full w-full appearance-none rounded-full border border-border bg-surface py-0 pl-10 pr-4 text-sm font-medium text-foreground shadow-control outline-none transition placeholder:text-subtle focus:border-primary"
        onChange={(event) => onDraftChange(event.target.value)}
        placeholder="Nome, e-mail ou CRP..."
        type="search"
        value={draft}
      />
    </label>
  );
};
