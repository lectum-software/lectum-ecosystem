"use client";

import { ChevronRight, Search } from "lucide-react";
import { type KeyboardEvent, useEffect, useRef, useState } from "react";

import {
  isCompleteFinanceFilterDate,
  paymentHealthFilterOptions,
  SEARCH_DEBOUNCE_MS,
  statusFilterOptions,
} from "../modules/subscription-support";

export const SearchBox = ({
  onSearch,
  value,
}: {
  onSearch: (value: string) => void;
  value?: string;
}) => {
  const [draft, setDraft] = useState(value || "");
  const onSearchRef = useRef(onSearch);

  useEffect(() => {
    onSearchRef.current = onSearch;
  }, [onSearch]);

  useEffect(() => {
    const normalized = draft.trim();
    const current = value || "";

    if (normalized === current) return;

    const timer = window.setTimeout(() => {
      onSearchRef.current(normalized);
    }, SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [draft, value]);

  return (
    <label className="relative block h-12 w-full min-w-0 text-sm font-medium text-foreground">
      <span className="sr-only">Buscar por nome, e-mail ou identificador</span>
      <Search
        aria-hidden
        className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle"
      />
      <input
        className="h-full w-full appearance-none rounded-full border border-border bg-surface py-0 pl-10 pr-4 text-sm font-medium text-foreground shadow-control outline-none transition placeholder:text-subtle focus:border-primary focus:ring-2 focus:ring-primary/15"
        onChange={(event) => setDraft(event.target.value)}
        placeholder="Nome, e-mail ou código..."
        type="search"
        value={draft}
      />
    </label>
  );
};

export const DateFilterField = ({
  label,
  max,
  min,
  onChange,
  onCommit,
  value,
}: {
  label: string;
  max?: string;
  min?: string;
  onChange: (value: string) => void;
  onCommit: () => void;
  value?: string;
}) => {
  const invalidDraft = Boolean(value && !isCompleteFinanceFilterDate(value));

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter") return;

    event.preventDefault();
    onCommit();
    event.currentTarget.blur();
  };

  return (
    <label className="flex min-w-0 flex-col gap-1 text-xs font-medium text-muted sm:min-w-[150px]">
      {label}
      <input
        aria-invalid={invalidDraft || undefined}
        className="h-12 w-full min-w-0 rounded-full border border-border bg-surface px-4 py-0 text-sm font-medium text-foreground shadow-control outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15 aria-[invalid=true]:border-danger aria-[invalid=true]:focus:ring-danger/15"
        max={max}
        min={min}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={handleKeyDown}
        title="Informe a data completa para aplicar o filtro."
        type="date"
        value={value || ""}
      />
    </label>
  );
};

export const StatusFilterField = ({
  onChange,
  value,
}: {
  onChange: (value: string) => void;
  value?: string;
}) => (
  <label className="flex min-w-0 flex-col gap-1 text-xs font-medium text-muted sm:min-w-[170px]">
    Status
    <span className="relative block text-sm font-medium text-foreground">
      <select
        className="h-12 w-full min-w-0 appearance-none rounded-full border border-border bg-surface py-0 pl-4 pr-12 text-sm font-medium text-foreground shadow-control outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
        onChange={(event) => onChange(event.target.value)}
        value={value || "all"}
      >
        {statusFilterOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronRight
        aria-hidden
        className="pointer-events-none absolute right-5 top-1/2 h-4 w-4 -translate-y-1/2 rotate-90 text-foreground"
      />
    </span>
  </label>
);

export const hiddenHealthNotePrefixes = [
  "Nenhuma cobrança foi vinculada a esta assinatura",
  "Amostra pequena:",
];

export const PaymentHealthFilterField = ({
  onChange,
  value,
}: {
  onChange: (value: string) => void;
  value?: string;
}) => (
  <label className="flex min-w-0 flex-col gap-1 text-xs font-medium text-muted sm:min-w-[220px]">
    Confiabilidade
    <span className="relative block text-sm font-medium text-foreground">
      <select
        className="h-12 w-full min-w-0 appearance-none rounded-full border border-border bg-surface py-0 pl-4 pr-12 text-sm font-medium text-foreground shadow-control outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
        onChange={(event) => onChange(event.target.value)}
        value={value || "all"}
      >
        {paymentHealthFilterOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronRight
        aria-hidden
        className="pointer-events-none absolute right-5 top-1/2 h-4 w-4 -translate-y-1/2 rotate-90 text-foreground"
      />
    </span>
  </label>
);
