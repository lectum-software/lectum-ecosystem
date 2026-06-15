"use client";

import { ChevronDown, Search } from "lucide-react";
import { useState } from "react";
import { Controller, type FieldValues, useWatch } from "react-hook-form";
import { Container } from "@/components/controllers/container";
import { describedBy, fieldId } from "@/components/controllers/utils";
import type { ControllerFieldProps } from "@/hooks/form";
import { cn } from "@/lib/utils";

export function SelectController<FormType extends FieldValues>({
  name,
  control,
  className,
  inputClassName,
  label,
  required,
  tooltip,
  description,
  id,
  placeholder,
  disabled,
  readOnly,
  tabIndex,
  options = [],
  optionsByField,
  emptyLabel = "Selecione",
  hideEmptyOption,
  loading,
  searchable,
  searchMode = "input",
  searchPlaceholder,
  emptySearchLabel = "Nenhuma opção encontrada.",
  onChangeCallback,
}: ControllerFieldProps<FormType>) {
  const inputId = fieldId(name, id);
  const listboxId = `${inputId}-listbox`;
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const dependentValue = useWatch({
    control,
    name: optionsByField?.name || name,
  });
  const hasDynamicOptions = Boolean(optionsByField);
  const resolvedOptions = hasDynamicOptions
    ? (optionsByField?.options[String(dependentValue || "")] ?? [])
    : options;
  const resolvedEmptyLabel =
    hasDynamicOptions && !dependentValue ? (optionsByField?.emptyLabel ?? emptyLabel) : emptyLabel;
  const resolvedDisabled = disabled || (hasDynamicOptions && !dependentValue);

  const normalize = (value: string) =>
    value
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .toLowerCase()
      .trim();

  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => {
        const error = fieldState.error?.message;
        const selectedOption = resolvedOptions.find(
          (item) => String(item.value) === String(field.value),
        );

        const renderFilteredOptions = () => {
          const normalizedQuery = normalize(query);
          const filteredOptions = resolvedOptions.filter((option) => {
            if (!normalizedQuery) return true;

            return (
              normalize(option.label).includes(normalizedQuery) ||
              normalize(option.group || "").includes(normalizedQuery)
            );
          });
          let currentGroup = "";

          if (filteredOptions.length === 0) {
            return <div className="px-3 py-3 text-sm text-muted">{emptySearchLabel}</div>;
          }

          return filteredOptions.map((option) => {
            const optionValue = String(option.value);
            const optionGroup = option.group || "";
            const shouldShowGroup = optionGroup && optionGroup !== currentGroup;
            currentGroup = optionGroup || currentGroup;

            return (
              <div key={`${option.label}-${optionValue}`}>
                {shouldShowGroup ? (
                  <div className="px-3 pt-3 pb-1 text-[11px] font-extrabold tracking-[0.08em] text-muted uppercase">
                    {optionGroup}
                  </div>
                ) : null}
                <button
                  className={cn(
                    "flex w-full items-center rounded-xl px-3 py-2 text-left text-foreground transition hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-50",
                    String(field.value) === optionValue && "bg-primary-soft text-primary",
                  )}
                  disabled={option.disabled}
                  aria-selected={String(field.value) === optionValue}
                  onMouseDown={(event) => {
                    event.preventDefault();
                    field.onChange(option.value);
                    onChangeCallback?.(option.value);
                    setQuery("");
                    setIsOpen(false);
                  }}
                  role="option"
                  type="button"
                >
                  {option.label}
                </button>
              </div>
            );
          });
        };

        const emptyOption = (
          <button
            className={cn(
              "flex w-full items-center rounded-xl px-3 py-2 text-left text-muted transition hover:bg-surface-muted hover:text-foreground",
              (field.value === null || field.value === undefined || field.value === "") &&
                "bg-primary-soft text-primary",
            )}
            onMouseDown={(event) => {
              event.preventDefault();
              field.onChange(null);
              onChangeCallback?.(null);
              setQuery("");
              setIsOpen(false);
            }}
            role="option"
            aria-selected={field.value === null || field.value === undefined || field.value === ""}
            type="button"
          >
            {resolvedEmptyLabel}
          </button>
        );

        return (
          <Container
            className={className}
            description={description}
            error={error}
            htmlFor={inputId}
            label={label}
            name={String(name)}
            required={required}
            tooltip={tooltip}
          >
            {searchable && searchMode === "dropdown" ? (
              <fieldset
                className="relative min-w-0 border-0 p-0"
                onBlur={(event) => {
                  const nextTarget = event.relatedTarget;
                  if (nextTarget && event.currentTarget.contains(nextTarget)) return;

                  setIsOpen(false);
                }}
              >
                <button
                  aria-controls={listboxId}
                  aria-describedby={describedBy({ id: inputId, description, error })}
                  aria-expanded={isOpen}
                  aria-invalid={Boolean(error)}
                  className={cn(
                    "flex h-12 w-full items-center rounded-[var(--lectum-control-radius)] border border-border bg-surface px-4 pr-10 text-left text-sm text-foreground shadow-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-muted",
                    error && "border-danger focus:border-danger focus:ring-danger/10",
                    inputClassName,
                  )}
                  disabled={resolvedDisabled || readOnly || loading}
                  id={inputId}
                  onClick={() => {
                    setQuery("");
                    setIsOpen((current) => !current);
                  }}
                  role="combobox"
                  tabIndex={tabIndex}
                  type="button"
                >
                  <span
                    className={cn(
                      "block min-w-0 flex-1 truncate",
                      !selectedOption && "text-subtle",
                    )}
                  >
                    {loading
                      ? "Carregando..."
                      : (selectedOption?.label ?? placeholder ?? resolvedEmptyLabel)}
                  </span>
                </button>
                <ChevronDown
                  aria-hidden="true"
                  className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
                />

                {isOpen && !resolvedDisabled && !readOnly && !loading ? (
                  <div
                    className="absolute left-0 right-0 top-[calc(100%+6px)] z-30 max-h-72 overflow-y-auto rounded-2xl border border-border bg-white p-1.5 text-sm shadow-[0_18px_45px_rgb(15_23_42_/_16%)]"
                    id={listboxId}
                    role="listbox"
                  >
                    <div className="sticky top-0 z-10 bg-white p-1">
                      <div className="relative">
                        <Search
                          aria-hidden="true"
                          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle"
                        />
                        <input
                          aria-label={searchPlaceholder || "Buscar opção"}
                          className="h-10 w-full rounded-xl border border-border bg-surface px-3 pl-9 text-sm text-foreground outline-none transition placeholder:text-subtle focus:border-primary focus:ring-4 focus:ring-primary/10"
                          onChange={(event) => setQuery(event.target.value)}
                          placeholder={searchPlaceholder || "Buscar opção"}
                          type="search"
                          value={query}
                        />
                      </div>
                    </div>

                    {hideEmptyOption ? null : emptyOption}
                    {renderFilteredOptions()}
                  </div>
                ) : null}
              </fieldset>
            ) : searchable ? (
              <div className="relative">
                <Search
                  aria-hidden="true"
                  className="pointer-events-none absolute left-4 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-subtle"
                />
                <input
                  aria-autocomplete="list"
                  aria-controls={listboxId}
                  aria-describedby={describedBy({ id: inputId, description, error })}
                  aria-expanded={isOpen}
                  aria-invalid={Boolean(error)}
                  className={cn(
                    "h-12 w-full rounded-[var(--lectum-control-radius)] border border-border bg-surface px-4 pr-10 pl-11 text-sm text-foreground shadow-sm outline-none transition placeholder:text-subtle focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-muted",
                    error && "border-danger focus:border-danger focus:ring-danger/10",
                    inputClassName,
                  )}
                  disabled={resolvedDisabled || readOnly || loading}
                  id={inputId}
                  name={field.name}
                  onBlur={() => {
                    field.onBlur();
                    window.setTimeout(() => setIsOpen(false), 120);
                  }}
                  onChange={(event) => {
                    const nextQuery = event.target.value;
                    setQuery(nextQuery);
                    setIsOpen(true);

                    if (field.value !== null && field.value !== undefined) {
                      field.onChange(null);
                      onChangeCallback?.(null);
                    }
                  }}
                  onFocus={() => {
                    setQuery("");
                    setIsOpen(true);
                  }}
                  placeholder={
                    loading ? "Carregando..." : searchPlaceholder || placeholder || emptyLabel
                  }
                  readOnly={readOnly}
                  ref={field.ref}
                  required={false}
                  role="combobox"
                  tabIndex={tabIndex}
                  type="text"
                  value={isOpen ? query : (selectedOption?.label ?? "")}
                />
                <ChevronDown
                  aria-hidden="true"
                  className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
                />

                {isOpen && !resolvedDisabled && !readOnly && !loading ? (
                  <div
                    className="absolute left-0 right-0 top-[calc(100%+6px)] z-30 max-h-64 overflow-y-auto rounded-2xl border border-border bg-white p-1.5 text-sm shadow-[0_18px_45px_rgb(15_23_42_/_16%)]"
                    id={listboxId}
                    role="listbox"
                  >
                    {hideEmptyOption ? null : emptyOption}
                    {renderFilteredOptions()}
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="relative">
                <select
                  aria-describedby={describedBy({ id: inputId, description, error })}
                  aria-invalid={Boolean(error)}
                  className={cn(
                    "h-12 w-full appearance-none rounded-[var(--lectum-control-radius)] border border-border bg-surface px-4 pr-11 text-sm text-foreground shadow-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-muted",
                    error && "border-danger focus:border-danger focus:ring-danger/10",
                    inputClassName,
                  )}
                  disabled={resolvedDisabled || readOnly || loading}
                  id={inputId}
                  name={field.name}
                  onBlur={field.onBlur}
                  onChange={(event) => {
                    const option = resolvedOptions.find(
                      (item) => String(item.value) === event.target.value,
                    );
                    const nextValue =
                      event.target.value === "" ? null : (option?.value ?? event.target.value);
                    field.onChange(nextValue);
                    onChangeCallback?.(nextValue);
                  }}
                  ref={field.ref}
                  required={false}
                  tabIndex={tabIndex}
                  value={
                    field.value === null || field.value === undefined ? "" : String(field.value)
                  }
                >
                  <option value="">
                    {loading ? "Carregando..." : placeholder || resolvedEmptyLabel}
                  </option>
                  {resolvedOptions.map((option) => (
                    <option
                      disabled={option.disabled}
                      key={`${option.label}-${String(option.value)}`}
                      value={String(option.value)}
                    >
                      {option.label}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  aria-hidden="true"
                  className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
                />
              </div>
            )}
          </Container>
        );
      }}
    />
  );
}
