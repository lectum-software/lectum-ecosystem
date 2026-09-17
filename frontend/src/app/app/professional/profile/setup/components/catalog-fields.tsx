"use client";

import { Award, Check, ChevronDown, Search, X } from "lucide-react";
import { useId, useMemo, useRef, useState } from "react";
import type { FreeProfileCatalogItem } from "@/api/generator/types/free-profile";
import { Container } from "@/components/controllers/container";
import { InlineAlert } from "@/components/ui/inline-alert";
import { Modal } from "@/components/ui/modal";
import { cn } from "@/lib/utils";
import {
  type CatalogTagGroup,
  profileSetupButtonGroup,
  profileSetupSelectableChip,
  profileSetupSelectableChipStyle,
  toggleValue,
} from "../modules/profile-setup-support";
import type { FreeProfileForm } from "../use-form";

const catalogTagChipTextClassName = "text-sm leading-[1.15]";
const catalogTagPlaceholderTextClassName = "text-[10px] leading-[1.15]";
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
  "specialty_ids" | "service_ids" | "approach_ids" | "target_audience" | "language"
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

const normalizeCatalogSearch = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .trim();

export const CatalogTagField = ({
  description,
  error,
  placeholderClassName = catalogTagPlaceholderTextClassName,
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
  valueKey?: "id" | "slug" | "name";
  onChange: (name: CatalogTagFieldName, value: string[]) => void;
}) => {
  const [open, setOpen] = useState(false);
  const [draftSelected, setDraftSelected] = useState<string[]>(selected);
  const [search, setSearch] = useState("");
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const isEmpty = items.length === 0;
  const getItemValue = (item: FreeProfileCatalogItem) => item[valueKey];
  const selectedItems = items.filter((item) => selected.includes(getItemValue(item)));
  const draftSelectedMap = useMemo(() => new Set(draftSelected), [draftSelected]);
  const groupedCatalogItems = useMemo(
    () => (groupedItems && groupedItems.length > 0 ? groupedItems : [{ title: "Todos", items }]),
    [groupedItems, items],
  );
  const searchTerm = normalizeCatalogSearch(search);
  const filteredGroups = useMemo(() => {
    if (!searchTerm) return groupedCatalogItems;

    return groupedCatalogItems
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => normalizeCatalogSearch(item.name).includes(searchTerm)),
      }))
      .filter((group) => group.items.length > 0);
  }, [groupedCatalogItems, searchTerm]);
  const limitReached = Boolean(limit && selected.length >= limit);
  const draftLimitReached = Boolean(limit && draftSelected.length >= limit);
  const selectionHint = limit
    ? `${draftSelected.length} de ${limit} selecionado${limit === 1 ? "" : "s"}`
    : `${draftSelected.length} selecionado${draftSelected.length === 1 ? "" : "s"}`;

  const removeItem = (id: string) => {
    onChange(
      name,
      selected.filter((item) => item !== id),
    );
  };

  const toggleDraftItem = (id: string) => {
    setDraftSelected((current) => {
      if (current.includes(id)) return current.filter((item) => item !== id);
      if (limit && current.length >= limit) return current;
      return [...current, id];
    });
  };

  const openPicker = () => {
    if (isEmpty) return;
    setDraftSelected(selected);
    setSearch("");
    setOpen(true);
  };

  const closePicker = () => setOpen(false);

  const confirmSelection = () => {
    onChange(name, draftSelected);
    setOpen(false);
  };

  return (
    <div className="grid gap-2" data-profile-field={String(name)}>
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
                catalogTagChipTextClassName,
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
          {limitReached ? null : (
            <button
              aria-expanded={open}
              aria-haspopup="dialog"
              className={cn(
                "w-full basis-full whitespace-nowrap py-1 text-left text-subtle outline-none",
                placeholderClassName,
              )}
              disabled={isEmpty}
              onClick={openPicker}
              ref={triggerRef}
              type="button"
            >
              {placeholder}
            </button>
          )}
        </div>
        <button
          aria-expanded={open}
          aria-haspopup="dialog"
          aria-label={`Editar ${title}`}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-muted transition hover:bg-primary-soft hover:text-primary disabled:cursor-not-allowed disabled:opacity-45"
          disabled={isEmpty}
          onClick={openPicker}
          ref={limitReached ? triggerRef : undefined}
          type="button"
        >
          <ChevronDown
            className={cn("h-4 w-4 transition", open && "rotate-180")}
            aria-hidden="true"
          />
        </button>
      </div>

      <Modal
        initialFocusRef={searchRef}
        labelledBy={titleId}
        onClose={closePicker}
        open={open}
        returnFocusRef={triggerRef}
      >
        <div className="mt-auto flex max-h-[86dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-[28px] rounded-b-[24px] border border-border bg-surface shadow-[var(--lectum-shadow-soft)] md:mt-0 md:rounded-[28px]">
          <div className="border-b border-border px-5 pt-5 pb-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-extrabold text-foreground" id={titleId}>
                  Selecionar {title.toLocaleLowerCase("pt-BR")}
                </h2>
                <p className="mt-1 text-xs leading-5 text-muted" id={descriptionId}>
                  {selectionHint}. Toque em Concluir para voltar ao formulário.
                </p>
              </div>
              <button
                aria-label="Fechar seleção"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-muted transition hover:bg-primary-soft hover:text-primary"
                onClick={closePicker}
                type="button"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <label className="mt-4 flex h-11 items-center gap-2 rounded-full border border-border bg-surface-muted px-3 text-sm text-foreground focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10">
              <Search className="h-4 w-4 text-muted" aria-hidden="true" />
              <input
                aria-describedby={descriptionId}
                className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-subtle"
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar opção"
                ref={searchRef}
                type="search"
                value={search}
              />
            </label>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
            {filteredGroups.length > 0 ? (
              <div className="grid gap-3">
                {filteredGroups.map((group) => (
                  <section className="grid gap-1" key={group.title}>
                    <h3 className="px-2 text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-muted">
                      {group.title}
                    </h3>
                    <div className="grid gap-1">
                      {group.items.map((item) => {
                        const itemValue = getItemValue(item);
                        const checked = draftSelectedMap.has(itemValue);
                        const disabled = Boolean(draftLimitReached && !checked);

                        return (
                          <button
                            aria-pressed={checked}
                            className={cn(
                              "flex min-h-12 items-center justify-between gap-3 rounded-2xl px-3 py-2 text-left text-sm font-semibold text-foreground transition hover:bg-primary-soft hover:text-primary",
                              checked && "bg-primary-soft text-primary",
                              disabled &&
                                "cursor-not-allowed opacity-45 hover:bg-transparent hover:text-foreground",
                            )}
                            disabled={disabled}
                            key={`${item.id}-${group.title}`}
                            onClick={() => toggleDraftItem(itemValue)}
                            type="button"
                          >
                            <span>{item.name}</span>
                            <span
                              className={cn(
                                "grid h-5 w-5 shrink-0 place-items-center rounded-md border border-border bg-surface text-transparent",
                                checked && "border-primary bg-primary text-primary-foreground",
                              )}
                              aria-hidden="true"
                            >
                              <Check className="h-3.5 w-3.5" />
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </section>
                ))}
              </div>
            ) : (
              <p className="px-2 py-6 text-center text-sm leading-5 text-muted">
                Nenhuma opção encontrada para a busca.
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 border-t border-border bg-surface px-5 py-4">
            <button
              className="h-12 rounded-full border border-border px-4 text-sm font-bold text-foreground transition hover:bg-surface-muted"
              onClick={closePicker}
              type="button"
            >
              Cancelar
            </button>
            <button
              className="h-12 rounded-full bg-primary px-4 text-sm font-bold text-primary-foreground transition hover:bg-primary/90"
              onClick={confirmSelection}
              type="button"
            >
              Concluir
            </button>
          </div>
        </div>
      </Modal>

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
