"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Loader2, Trash2, X } from "lucide-react";
import { FormProvider, useForm } from "react-hook-form";
import type { AdminSettingsSpecialtyCategory } from "@/api/req/settings";
import { InputController, SelectController } from "@/components/controllers";
import { useAdminDialogLifecycle } from "@/hooks/use-admin-dialog-lifecycle";

import {
  type CatalogDeleteModalState,
  type CatalogForm,
  type CatalogModalState,
  DELETE_CONFIRMATION,
  type DeleteForm,
  deleteSchema,
  formSchema,
  singularLabel,
} from "../modules/catalog-support";

export const CatalogModal = ({
  categories,
  onClose,
  onSubmit,
  state,
  submitting,
}: {
  categories: AdminSettingsSpecialtyCategory[];
  onClose: () => void;
  onSubmit: (values: CatalogForm) => Promise<void>;
  state: CatalogModalState;
  submitting: boolean;
}) => {
  const form = useForm<CatalogForm>({
    defaultValues: {
      active:
        (state.kind === "category" ? state.category?.active : state.item?.active) === false
          ? "false"
          : "true",
      category_id:
        state.kind === "item" && state.type === "specialty"
          ? state.item && "category_id" in state.item
            ? state.item.category_id || state.categoryId || categories[0]?.id || ""
            : state.categoryId || categories[0]?.id || ""
          : undefined,
      name: state.kind === "category" ? state.category?.name || "" : state.item?.name || "",
    },
    resolver: zodResolver(formSchema),
  });
  const isSpecialty = state.kind === "item" && state.type === "specialty";
  const label =
    state.kind === "category" ? singularLabel.specialty_category : singularLabel[state.type];
  const dialogRef = useAdminDialogLifecycle(onClose, { closeEnabled: !submitting });

  return (
    <div
      aria-labelledby="catalog-modal-title"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end bg-overlay p-3 md:items-center md:justify-center"
      ref={dialogRef}
      role="dialog"
      tabIndex={-1}
    >
      <div className="w-full max-w-lg rounded-[28px] border border-border bg-surface p-5 shadow-2xl">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">
              Catálogo
            </p>
            <h2 className="mt-2 text-2xl font-black text-foreground" id="catalog-modal-title">
              {state.mode === "create" ? "Adicionar" : "Editar"} {label}
            </h2>
            <p className="mt-1 text-sm text-muted">
              A alteração será refletida nos filtros e formulários de perfil após salvar.
            </p>
          </div>
          <button
            aria-label="Fechar modal"
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-border text-muted hover:text-foreground"
            disabled={submitting}
            onClick={onClose}
            type="button"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <FormProvider {...form}>
          <form className="space-y-3" onSubmit={form.handleSubmit(onSubmit)}>
            <InputController<CatalogForm>
              label="Nome"
              name="name"
              placeholder={`Nome do ${label}`}
              required
            />
            {isSpecialty ? (
              <SelectController<CatalogForm>
                label="Categoria"
                name="category_id"
                options={categories.map((category) => ({
                  label: category.name,
                  value: category.id,
                }))}
                required
              />
            ) : null}
            <SelectController<CatalogForm>
              label="Status"
              name="active"
              options={[
                { label: "Ativo", value: "true" },
                { label: "Inativo", value: "false" },
              ]}
              required
            />
            <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
              <button
                className="inline-flex h-12 items-center justify-center rounded-2xl border border-border px-5 text-sm font-bold text-muted hover:text-foreground"
                disabled={submitting}
                onClick={onClose}
                type="button"
              >
                Cancelar
              </button>
              <button
                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-primary px-5 text-sm font-black text-primary-foreground shadow-admin-soft disabled:opacity-60"
                disabled={submitting}
                type="submit"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                Salvar
              </button>
            </div>
          </form>
        </FormProvider>
      </div>
    </div>
  );
};

export const DeleteCatalogModal = ({
  onClose,
  onSubmit,
  state,
  submitting,
}: {
  onClose: () => void;
  onSubmit: (confirmation: string) => Promise<void>;
  state: CatalogDeleteModalState;
  submitting: boolean;
}) => {
  const form = useForm<DeleteForm>({
    defaultValues: { confirmation: "" },
    resolver: zodResolver(deleteSchema),
  });
  const isCategory = state.kind === "category";
  const name = isCategory ? state.category.name : state.item.name;
  const label = isCategory ? singularLabel.specialty_category : singularLabel[state.type];
  const specialtiesCount = isCategory ? state.category.specialties.length : 0;
  const dialogRef = useAdminDialogLifecycle(onClose, { closeEnabled: !submitting });

  return (
    <div
      aria-labelledby="catalog-delete-modal-title"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end bg-overlay p-3 md:items-center md:justify-center"
      ref={dialogRef}
      role="alertdialog"
      tabIndex={-1}
    >
      <div className="w-full max-w-lg rounded-[28px] border border-danger/20 bg-surface p-5 shadow-2xl">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-danger">
              Exclusão de catálogo
            </p>
            <h2
              className="mt-2 text-2xl font-black text-foreground"
              id="catalog-delete-modal-title"
            >
              Excluir {label}
            </h2>
            <p className="mt-1 text-sm leading-6 text-muted">
              Esta ação remove <strong>{name}</strong> dos filtros, formulários e da tela de
              configurações. Vínculos históricos permanecem preservados.
            </p>
            {isCategory ? (
              <p className="mt-2 rounded-2xl border border-warning-border bg-warning-soft px-3 py-2 text-xs font-semibold text-warning">
                A categoria também remove {specialtiesCount}{" "}
                {specialtiesCount === 1 ? "especialidade" : "especialidades"} da seleção pública.
              </p>
            ) : null}
          </div>
          <button
            aria-label="Fechar modal"
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-border text-muted hover:text-foreground"
            disabled={submitting}
            onClick={onClose}
            type="button"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <FormProvider {...form}>
          <form
            className="space-y-3"
            onSubmit={form.handleSubmit((values) => onSubmit(values.confirmation))}
          >
            <p className="text-sm text-muted">
              Digite <strong>{DELETE_CONFIRMATION}</strong> para confirmar.
            </p>
            <InputController<DeleteForm>
              label="Confirmação forte"
              name="confirmation"
              placeholder={DELETE_CONFIRMATION}
              required
            />
            <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
              <button
                className="inline-flex h-12 items-center justify-center rounded-2xl border border-border px-5 text-sm font-bold text-muted hover:text-foreground"
                disabled={submitting}
                onClick={onClose}
                type="button"
              >
                Cancelar
              </button>
              <button
                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-danger px-5 text-sm font-black text-primary-foreground shadow-admin-soft disabled:opacity-60"
                disabled={submitting}
                type="submit"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                Excluir
              </button>
            </div>
          </form>
        </FormProvider>
      </div>
    </div>
  );
};
