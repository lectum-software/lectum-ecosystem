"use client";

import { Award, ChevronDown, X } from "lucide-react";
import { useState } from "react";
import type { FreeProfileCatalogItem } from "@/api/generator/types/free-profile";
import { Container } from "@/components/controllers/container";
import { InlineAlert } from "@/components/ui/inline-alert";
import { cn } from "@/lib/utils";
import {
  type CatalogTagGroup,
  profileSetupButtonGroup,
  profileSetupSelectableChip,
  profileSetupSelectableChipStyle,
  toggleValue,
} from "../modules/profile-setup-support";
import type { FreeProfileForm } from "../use-form";

const catalogTagTextClassName = "text-[10px] leading-[1.15]";
const chipPickerSelectableChipStyle = {
  ...profileSetupSelectableChipStyle,
  boxShadow: "none",
};

type CatalogPickerFieldName = keyof Pick<
  FreeProfileForm,
  "specialty_ids" | "service_ids" | "approach_ids"
>;

type CatalogTagFieldName = keyof Pick<
  FreeProfileForm,
  "specialty_ids" | "service_ids" | "approach_ids" | "target_audience"
>;

export const CatalogPicker = ({
  description,
  error,
  items,
  limit,
  name,
  required,
  selected,
  showLimitCounter = true,
  title,
  onChange,
}: {
  description?: string;
  error?: string;
  items: FreeProfileCatalogItem[];
  limit?: number;
  name: CatalogPickerFieldName;
  required?: boolean;
  selected: string[];
  showLimitCounter?: boolean;
  title: string;
  onChange: (name: CatalogPickerFieldName, value: string[]) => void;
}) => {
  const isEmpty = items.length === 0;

  return (
    <Container
      description={description}
      error={error}
      label={title}
      name={String(name)}
      required={required}
      skipHtmlFor
    >
      {isEmpty ? (
        <InlineAlert title="Catálogo vazio" variant="warning">
          Nenhuma opção está disponível para esta seção no momento.
        </InlineAlert>
      ) : null}

      {limit && showLimitCounter ? (
        <span className="-mt-1 w-fit rounded-full bg-surface-muted px-2.5 py-1 text-xs font-semibold text-muted">
          {selected.length}/{limit}
        </span>
      ) : null}

      <fieldset
        aria-label={title}
        aria-invalid={Boolean(error)}
        className={profileSetupButtonGroup}
      >
        {items.map((item) => {
          const checked = selected.includes(item.id);
          const disabled = Boolean(limit && !checked && selected.length >= limit);

          return (
            <button
              aria-pressed={checked}
              className={cn(
                profileSetupSelectableChip,
                checked &&
                  "border-primary bg-primary text-primary-foreground shadow-none hover:border-primary hover:bg-primary hover:text-primary-foreground",
                disabled && "cursor-not-allowed opacity-50",
              )}
              style={profileSetupSelectableChipStyle}
              disabled={disabled}
              key={item.id}
              onClick={() => onChange(name, toggleValue(selected, item.id))}
              type="button"
            >
              {item.name}
            </button>
          );
        })}
      </fieldset>
    </Container>
  );
};

export const CatalogTagField = ({
  description,
  error,
  placeholderClassName = catalogTagTextClassName,
  items,
  groupedItems,
  limit,
  name,
  placeholder,
  required,
  selected,
  title,
  valueKey = "id",
  onChange,
}: {
  description?: string;
  error?: string;
  items: FreeProfileCatalogItem[];
  groupedItems?: CatalogTagGroup[];
  limit?: number;
  placeholderClassName?: string;
  name: CatalogTagFieldName;
  placeholder: string;
  required?: boolean;
  selected: string[];
  title: string;
  valueKey?: "id" | "slug";
  onChange: (name: CatalogTagFieldName, value: string[]) => void;
}) => {
  const [open, setOpen] = useState(false);
  const isEmpty = items.length === 0;
  const getItemValue = (item: FreeProfileCatalogItem) => item[valueKey];
  const selectedItems = items.filter((item) => selected.includes(getItemValue(item)));
  const selectedMap = new Set(selected);
  const limitReached = Boolean(limit && selected.length >= limit);
  const groupedCatalogItems =
    groupedItems && groupedItems.length > 0 ? groupedItems : [{ title: "Todos", items }];

  const removeItem = (id: string) => {
    onChange(
      name,
      selected.filter((item) => item !== id),
    );
  };

  const toggleItem = (id: string) => {
    if (selectedMap.has(id)) {
      removeItem(id);
      return;
    }

    if (limitReached) return;
    onChange(name, [...selected, id]);

    if (limit === 1) {
      setOpen(false);
    }
  };

  return (
    <div className="grid gap-2">
      <div>
        <h3 className="flex items-center gap-1 text-sm font-bold text-foreground">
          <span>{title}</span>
          {required ? <span className="text-danger">*</span> : null}
        </h3>
        {description ? <p className="mt-1 text-xs leading-5 text-muted">{description}</p> : null}
      </div>

      {isEmpty ? (
        <InlineAlert title="Catálogo vazio" variant="warning">
          Nenhuma opção está disponível para esta seção no momento.
        </InlineAlert>
      ) : null}

      <div className="relative">
        <div
          className={cn(
            "flex min-h-12 items-center gap-2 rounded-[var(--lectum-control-radius)] border border-border bg-surface px-3 py-2 shadow-sm transition focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10",
            open && "border-primary ring-4 ring-primary/10",
            error && "border-danger focus-within:border-danger focus-within:ring-danger/10",
          )}
          aria-invalid={Boolean(error)}
        >
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
            {selectedItems.map((item) => (
              <span
                className={cn(
                  "inline-flex max-w-full items-center gap-1 rounded-md bg-primary-soft px-2 py-1 font-bold text-primary",
                  catalogTagTextClassName,
                )}
                key={item.id}
              >
                <span className="max-w-[11rem] truncate">{item.name}</span>
                <button
                  aria-label={`Remover ${item.name}`}
                  className="grid h-3.5 w-3.5 place-items-center rounded-full text-primary transition hover:bg-primary/10"
                  onClick={() => removeItem(getItemValue(item))}
                  type="button"
                >
                  <X className="h-3 w-3" aria-hidden="true" />
                </button>
              </span>
            ))}
            <button
              aria-expanded={open}
              className={cn(
                "w-full basis-full whitespace-nowrap py-1 text-left text-subtle outline-none",
                placeholderClassName,
                limitReached && "text-muted",
              )}
              onClick={() => setOpen((current) => !current)}
              type="button"
            >
              {placeholder}
            </button>
          </div>
          <button
            aria-label={`Abrir opções de ${title}`}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-muted transition hover:bg-primary-soft hover:text-primary"
            onClick={() => setOpen((current) => !current)}
            type="button"
          >
            <ChevronDown
              className={cn("h-4 w-4 transition", open && "rotate-180")}
              aria-hidden="true"
            />
          </button>
        </div>

        {open ? (
          <div className="absolute z-20 mt-2 max-h-56 w-full overflow-y-auto rounded-2xl border border-border bg-surface p-2 shadow-[var(--lectum-shadow-soft)]">
            {items.length > 0 ? (
              <div className="grid gap-1">
                {groupedCatalogItems.map((group) => (
                  <div className="grid gap-1" key={group.title}>
                    <p className="px-1 text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-muted">
                      {group.title}
                    </p>
                    <div className="grid gap-1">
                      {group.items.map((item) => {
                        const itemValue = getItemValue(item);
                        const checked = selectedMap.has(itemValue);
                        const disabled = Boolean(limitReached && !checked);

                        return (
                          <button
                            className={cn(
                              "flex items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-[11px] font-semibold text-foreground transition hover:bg-primary-soft hover:text-primary",
                              checked && "bg-primary-soft text-primary",
                              disabled &&
                                "cursor-not-allowed opacity-45 hover:bg-transparent hover:text-foreground",
                            )}
                            disabled={disabled}
                            key={`${item.id}-${group.title}`}
                            onClick={() => toggleItem(itemValue)}
                            type="button"
                          >
                            <span>{item.name}</span>
                            {checked ? (
                              <span className="text-xs font-bold">Selecionado</span>
                            ) : null}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="px-3 py-2 text-sm text-muted">Nenhuma opção ativa encontrada.</p>
            )}
          </div>
        ) : null}
      </div>
      <span
        className="block min-h-4 text-xs font-medium leading-4 text-danger"
        id={`${String(name)}-error`}
        role="alert"
      >
        {error}
      </span>
    </div>
  );
};

export const ChipPicker = ({
  description,
  error,
  items,
  label,
  name,
  required,
  selected,
  onChange,
}: {
  description?: string;
  error?: string;
  items: { label: string; value: string }[];
  label: string;
  name: keyof Pick<FreeProfileForm, "target_audience" | "available_days">;
  required?: boolean;
  selected: string[];
  onChange: (value: string[]) => void;
}) => (
  <Container
    description={description}
    error={error}
    label={label}
    name={String(name)}
    required={required}
    skipHtmlFor
  >
    <fieldset aria-label={label} aria-invalid={Boolean(error)} className={profileSetupButtonGroup}>
      {items.map((item) => {
        const checked = selected.includes(item.value);
        return (
          <button
            aria-pressed={checked}
            className={cn(
              profileSetupSelectableChip,
              "shadow-none",
              checked &&
                "border-primary bg-primary text-primary-foreground shadow-none hover:border-primary hover:bg-primary hover:text-primary-foreground",
            )}
            style={chipPickerSelectableChipStyle}
            key={item.value}
            onClick={() => onChange(toggleValue(selected, item.value))}
            type="button"
          >
            {item.label}
          </button>
        );
      })}
    </fieldset>
  </Container>
);

export const BooleanBenefit = ({
  disabled = false,
  checked,
  description,
  title,
  onChange,
}: {
  disabled?: boolean;
  checked: boolean;
  description: string;
  title: string;
  onChange: (checked: boolean) => void;
}) => (
  <label
    className={cn(
      "flex items-center justify-between gap-4 rounded-2xl bg-primary-soft/50 p-4",
      disabled && "opacity-60",
    )}
  >
    <span className="flex items-start gap-3">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-surface text-primary shadow-sm">
        <Award className="h-4 w-4" aria-hidden="true" />
      </span>
      <span>
        <span className="block text-sm font-bold text-foreground">{title}</span>
        <span className="mt-1 block text-xs leading-5 text-muted">{description}</span>
      </span>
    </span>
    <input
      checked={disabled ? false : checked}
      className="h-5 w-5 shrink-0 accent-primary disabled:cursor-not-allowed"
      disabled={disabled}
      onChange={(event) => onChange(event.target.checked)}
      type="checkbox"
    />
  </label>
);
