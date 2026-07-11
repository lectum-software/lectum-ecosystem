"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  ChevronDown,
  Edit3,
  Languages,
  Layers3,
  Loader2,
  Plus,
  RefreshCw,
  RotateCcw,
  SlidersHorizontal,
  ToggleLeft,
  ToggleRight,
  UsersRound,
  X,
} from "lucide-react";
import { type ReactNode, useMemo, useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import {
  useAdminSettingsCatalogs,
  useAdminSettingsCreateCatalogItem,
  useAdminSettingsCreateSpecialtyCategory,
  useAdminSettingsReorderCatalog,
  useAdminSettingsRestoreDefaults,
  useAdminSettingsUpdateCatalogItem,
  useAdminSettingsUpdateSpecialtyCategory,
} from "@/api/callers/settings";
import { resolveApiError } from "@/api/handle";
import type {
  AdminSettingsCatalogOption,
  AdminSettingsCatalogType,
  AdminSettingsSpecialty,
  AdminSettingsSpecialtyCategory,
} from "@/api/req/settings";
import { InputController, SelectController } from "@/components/controllers";
import { cn } from "@/lib/utils";

const cardClass = "rounded-card border border-border bg-surface shadow-admin-soft";
const RESTORE_CONFIRMATION = "RESTAURAR PADROES";

type MutableCatalogType = Exclude<AdminSettingsCatalogType, "specialty_category">;
type ListCatalogType = Exclude<MutableCatalogType, "specialty">;

type CatalogModalState =
  | {
      mode: "create" | "edit";
      kind: "category";
      category?: AdminSettingsSpecialtyCategory;
    }
  | {
      mode: "create" | "edit";
      kind: "item";
      type: MutableCatalogType;
      categoryId?: string;
      item?: AdminSettingsCatalogOption | AdminSettingsSpecialty;
    };

const CATALOG_SECTIONS: Array<{
  description: string;
  icon: ReactNode;
  label: string;
  type: ListCatalogType;
}> = [
  {
    description: "Abordagens terapêuticas usadas nos perfis profissionais.",
    icon: <Layers3 className="h-5 w-5" />,
    label: "Abordagens",
    type: "approach",
  },
  {
    description: "Tipos de atendimento e serviços oferecidos pelos psicólogos.",
    icon: <SlidersHorizontal className="h-5 w-5" />,
    label: "Serviços",
    type: "service",
  },
  {
    description: "Idiomas em que o atendimento é realizado.",
    icon: <Languages className="h-5 w-5" />,
    label: "Idiomas",
    type: "language",
  },
  {
    description: "Públicos atendidos disponíveis no perfil profissional.",
    icon: <UsersRound className="h-5 w-5" />,
    label: "Público",
    type: "target_audience",
  },
];

const singularLabel: Record<AdminSettingsCatalogType, string> = {
  approach: "abordagem",
  language: "idioma",
  service: "serviço",
  specialty: "especialidade",
  specialty_category: "categoria",
  target_audience: "público",
};

const formSchema = z.object({
  active: z.enum(["true", "false"]),
  category_id: z.string().optional(),
  name: z.string().trim().min(2, "Informe pelo menos 2 caracteres").max(160),
});

type CatalogForm = z.infer<typeof formSchema>;

const restoreSchema = z.object({
  confirmation: z.literal(RESTORE_CONFIRMATION, {
    message: `Digite ${RESTORE_CONFIRMATION} para confirmar`,
  }),
});

type RestoreForm = z.infer<typeof restoreSchema>;

const orderedIds = (items: Array<{ id: string }>) => items.map((item) => item.id);

const moveId = (ids: string[], id: string, direction: "up" | "down") => {
  const index = ids.indexOf(id);
  const nextIndex = direction === "up" ? index - 1 : index + 1;

  if (index < 0 || nextIndex < 0 || nextIndex >= ids.length) return ids;

  const next = [...ids];
  const [item] = next.splice(index, 1);
  next.splice(nextIndex, 0, item);

  return next;
};

const getErrorMessage = (error: unknown) =>
  resolveApiError(error) || "Não foi possível salvar a configuração agora.";

const StatusBadge = ({ active }: { active: boolean }) => (
  <span
    className={cn(
      "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold",
      active ? "bg-emerald-50 text-success" : "bg-surface-muted text-muted",
    )}
  >
    {active ? "Ativo" : "Inativo"}
  </span>
);

const EmptyState = ({ children }: { children: ReactNode }) => (
  <div className="rounded-2xl border border-dashed border-border bg-surface-muted/60 p-4 text-sm text-muted">
    {children}
  </div>
);

const IconButton = ({
  children,
  disabled,
  label,
  onClick,
}: {
  children: ReactNode;
  disabled?: boolean;
  label: string;
  onClick: () => void;
}) => (
  <button
    aria-label={label}
    className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-white text-muted transition hover:border-primary/40 hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
    disabled={disabled}
    onClick={onClick}
    type="button"
  >
    {children}
  </button>
);

const CatalogRow = ({
  activeMutation,
  index,
  item,
  lastIndex,
  onEdit,
  onMove,
  onToggle,
}: {
  activeMutation?: boolean;
  index: number;
  item: AdminSettingsCatalogOption | AdminSettingsSpecialty;
  lastIndex: number;
  onEdit: () => void;
  onMove: (direction: "up" | "down") => void;
  onToggle: () => void;
}) => (
  <div className="flex flex-col gap-3 border-t border-border/70 py-3 first:border-t-0 md:flex-row md:items-center md:justify-between">
    <div className="min-w-0 flex-1">
      <div className="flex flex-wrap items-center gap-2">
        <p className="truncate text-sm font-bold text-foreground">{item.name}</p>
        <StatusBadge active={item.active} />
        {typeof item.linked_count === "number" ? (
          <span className="text-xs text-muted">{item.linked_count} vínculo(s)</span>
        ) : null}
      </div>
      <p className="mt-1 text-xs text-muted">/{item.slug}</p>
    </div>
    <div className="flex flex-wrap items-center gap-2">
      <IconButton
        disabled={index === 0 || activeMutation}
        label={`Mover ${item.name} para cima`}
        onClick={() => onMove("up")}
      >
        <ArrowUp className="h-4 w-4" />
      </IconButton>
      <IconButton
        disabled={index === lastIndex || activeMutation}
        label={`Mover ${item.name} para baixo`}
        onClick={() => onMove("down")}
      >
        <ArrowDown className="h-4 w-4" />
      </IconButton>
      <button
        className="inline-flex h-9 items-center gap-2 rounded-xl border border-border bg-white px-3 text-xs font-bold text-muted transition hover:border-primary/40 hover:text-primary"
        onClick={onEdit}
        type="button"
      >
        <Edit3 className="h-4 w-4" />
        Editar
      </button>
      <button
        className={cn(
          "inline-flex h-9 items-center gap-2 rounded-xl border px-3 text-xs font-bold transition disabled:opacity-50",
          item.active
            ? "border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100"
            : "border-emerald-200 bg-emerald-50 text-success hover:bg-emerald-100",
        )}
        disabled={activeMutation}
        onClick={onToggle}
        type="button"
      >
        {item.active ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
        {item.active ? "Inativar" : "Reativar"}
      </button>
    </div>
  </div>
);

const CatalogModal = ({
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

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-slate-950/45 p-3 md:items-center md:justify-center">
      <div className="w-full max-w-lg rounded-[28px] border border-border bg-surface p-5 shadow-2xl">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-primary">TASK-65</p>
            <h2 className="mt-2 text-2xl font-black text-foreground">
              {state.mode === "create" ? "Adicionar" : "Editar"} {label}
            </h2>
            <p className="mt-1 text-sm text-muted">
              A alteração será refletida nos filtros e formulários de perfil após salvar.
            </p>
          </div>
          <button
            aria-label="Fechar modal"
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-border text-muted hover:text-foreground"
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
                onClick={onClose}
                type="button"
              >
                Cancelar
              </button>
              <button
                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-primary px-5 text-sm font-black text-white shadow-admin-soft disabled:opacity-60"
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

const RestoreModal = ({
  onClose,
  onSubmit,
  submitting,
}: {
  onClose: () => void;
  onSubmit: (value: string) => Promise<void>;
  submitting: boolean;
}) => {
  const form = useForm<RestoreForm>({
    defaultValues: { confirmation: "" as RestoreForm["confirmation"] },
    resolver: zodResolver(restoreSchema),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-slate-950/45 p-3 md:items-center md:justify-center">
      <div className="w-full max-w-lg rounded-[28px] border border-border bg-surface p-5 shadow-2xl">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-danger">
              Confirmação forte
            </p>
            <h2 className="mt-2 text-2xl font-black text-foreground">Restaurar padrões</h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              Esta ação reativa e reordena os catálogos oficiais da Lectum. Opções customizadas não
              são apagadas. Digite <strong>{RESTORE_CONFIRMATION}</strong> para continuar.
            </p>
          </div>
          <button
            aria-label="Fechar modal"
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-border text-muted hover:text-foreground"
            onClick={onClose}
            type="button"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <FormProvider {...form}>
          <form
            className="space-y-3"
            onSubmit={form.handleSubmit((value) => onSubmit(value.confirmation))}
          >
            <InputController<RestoreForm>
              label="Confirmação"
              name="confirmation"
              placeholder={RESTORE_CONFIRMATION}
              required
            />
            <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
              <button
                className="inline-flex h-12 items-center justify-center rounded-2xl border border-border px-5 text-sm font-bold text-muted hover:text-foreground"
                onClick={onClose}
                type="button"
              >
                Cancelar
              </button>
              <button
                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-primary px-5 text-sm font-black text-white shadow-admin-soft disabled:opacity-60"
                disabled={submitting}
                type="submit"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RotateCcw className="h-4 w-4" />
                )}
                Restaurar padrões
              </button>
            </div>
          </form>
        </FormProvider>
      </div>
    </div>
  );
};

export const AdminSettingsClient = () => {
  const catalogs = useAdminSettingsCatalogs();
  const createCategory = useAdminSettingsCreateSpecialtyCategory();
  const updateCategory = useAdminSettingsUpdateSpecialtyCategory();
  const createItem = useAdminSettingsCreateCatalogItem();
  const updateItem = useAdminSettingsUpdateCatalogItem();
  const reorder = useAdminSettingsReorderCatalog();
  const restoreDefaults = useAdminSettingsRestoreDefaults();
  const [modal, setModal] = useState<CatalogModalState | null>(null);
  const [restoreOpen, setRestoreOpen] = useState(false);
  const data = catalogs.data;
  const categories = useMemo(() => data?.specialty_categories ?? [], [data?.specialty_categories]);
  const isMutating =
    createCategory.isPending ||
    updateCategory.isPending ||
    createItem.isPending ||
    updateItem.isPending ||
    reorder.isPending;
  const counts = useMemo(
    () => ({
      approaches: data?.approaches.length ?? 0,
      languages: data?.languages.length ?? 0,
      services: data?.services.length ?? 0,
      specialties: categories.reduce((total, category) => total + category.specialties.length, 0),
      specialtyCategories: categories.length,
      targetAudiences: data?.target_audiences.length ?? 0,
    }),
    [categories, data],
  );
  const itemsByType: Record<ListCatalogType, AdminSettingsCatalogOption[]> = {
    approach: data?.approaches ?? [],
    language: data?.languages ?? [],
    service: data?.services ?? [],
    target_audience: data?.target_audiences ?? [],
  };

  const submitModal = async (values: CatalogForm) => {
    if (!modal) return;

    try {
      if (modal.kind === "category") {
        const input = { active: values.active === "true", name: values.name };
        if (modal.mode === "create") await createCategory.mutateAsync(input);
        else if (modal.category) await updateCategory.mutateAsync({ id: modal.category.id, input });
      } else {
        const input = {
          active: values.active === "true",
          category_id: modal.type === "specialty" ? values.category_id : undefined,
          name: values.name,
        };
        if (modal.mode === "create") await createItem.mutateAsync({ input, type: modal.type });
        else if (modal.item)
          await updateItem.mutateAsync({ id: modal.item.id, input, type: modal.type });
      }

      toast.success("Catálogo atualizado");
      setModal(null);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const toggleCategory = async (category: AdminSettingsSpecialtyCategory) => {
    try {
      await updateCategory.mutateAsync({ id: category.id, input: { active: !category.active } });
      toast.success(category.active ? "Categoria inativada" : "Categoria reativada");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const toggleItem = async (
    type: MutableCatalogType,
    item: AdminSettingsCatalogOption | AdminSettingsSpecialty,
  ) => {
    try {
      await updateItem.mutateAsync({ id: item.id, input: { active: !item.active }, type });
      toast.success(item.active ? "Item inativado" : "Item reativado");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const moveCatalog = async ({
    categoryId,
    direction,
    id,
    ids,
    type,
  }: {
    categoryId?: string;
    direction: "up" | "down";
    id: string;
    ids: string[];
    type: AdminSettingsCatalogType;
  }) => {
    const nextIds = moveId(ids, id, direction);
    if (nextIds.join("|") === ids.join("|")) return;

    try {
      await reorder.mutateAsync({ category_id: categoryId, ids: nextIds, type });
      toast.success("Ordem atualizada");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const restore = async (confirmation: string) => {
    try {
      await restoreDefaults.mutateAsync(confirmation);
      toast.success("Padrões restaurados");
      setRestoreOpen(false);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const renderCatalogSection = (section: (typeof CATALOG_SECTIONS)[number]) => {
    const items = itemsByType[section.type];
    const ids = orderedIds(items);

    return (
      <section className={cn(cardClass, "p-4 md:p-6")} key={section.type}>
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex gap-3">
            <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-primary">
              {section.icon}
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-black text-foreground">{section.label}</h2>
                <span className="rounded-full bg-primary-soft px-2.5 py-1 text-xs font-bold text-primary">
                  {items.length} opções
                </span>
              </div>
              <p className="mt-1 text-sm text-muted">{section.description}</p>
            </div>
          </div>
          <button
            className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-primary/25 bg-white px-4 text-sm font-black text-primary shadow-control hover:bg-primary-soft"
            onClick={() => setModal({ kind: "item", mode: "create", type: section.type })}
            type="button"
          >
            <Plus className="h-4 w-4" />
            Adicionar {singularLabel[section.type]}
          </button>
        </div>
        <div className="mt-4">
          {items.length === 0 ? (
            <EmptyState>Nenhuma opção cadastrada neste catálogo.</EmptyState>
          ) : (
            items.map((item, index) => (
              <CatalogRow
                activeMutation={isMutating}
                index={index}
                item={item}
                key={item.id}
                lastIndex={items.length - 1}
                onEdit={() => setModal({ item, kind: "item", mode: "edit", type: section.type })}
                onMove={(direction) =>
                  moveCatalog({ direction, id: item.id, ids, type: section.type })
                }
                onToggle={() => toggleItem(section.type, item)}
              />
            ))
          )}
        </div>
      </section>
    );
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.3em] text-primary">TASK-65</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-foreground md:text-4xl">
            Configurações
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted md:text-base">
            Gerencie as opções de filtros disponíveis na busca de psicólogos e nos formulários de
            perfil profissional.
          </p>
        </div>
        <button
          className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-primary px-5 text-sm font-black text-white shadow-admin-soft hover:bg-primary-dark disabled:opacity-60"
          disabled={catalogs.isLoading || restoreDefaults.isPending}
          onClick={() => setRestoreOpen(true)}
          type="button"
        >
          <RefreshCw className="h-4 w-4" />
          Restaurar padrões
        </button>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {[
          ["Categorias", counts.specialtyCategories],
          ["Especialidades", counts.specialties],
          ["Abordagens", counts.approaches],
          ["Serviços", counts.services],
          ["Idiomas/Públicos", counts.languages + counts.targetAudiences],
        ].map(([label, value]) => (
          <div className={cn(cardClass, "p-4")} key={String(label)}>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">{label}</p>
            <p className="mt-2 text-2xl font-black text-foreground">{value}</p>
          </div>
        ))}
      </section>

      {catalogs.isLoading ? (
        <div className={cn(cardClass, "flex min-h-72 items-center justify-center p-8 text-muted")}>
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Carregando catálogos...
        </div>
      ) : catalogs.isError ? (
        <div className={cn(cardClass, "p-6 text-danger")}>{getErrorMessage(catalogs.error)}</div>
      ) : (
        <>
          <section className={cn(cardClass, "p-4 md:p-6")}>
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="flex gap-3">
                <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-primary">
                  <SlidersHorizontal className="h-5 w-5" />
                </span>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl font-black text-foreground">Especialidades</h2>
                    <span className="rounded-full bg-primary-soft px-2.5 py-1 text-xs font-bold text-primary">
                      {categories.length} categorias
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-muted">
                    Categorias persistidas como Ansiedade e Transtornos Relacionados e Humor e Saúde
                    Mental.
                  </p>
                </div>
              </div>
              <button
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-primary/25 bg-white px-4 text-sm font-black text-primary shadow-control hover:bg-primary-soft"
                onClick={() => setModal({ kind: "category", mode: "create" })}
                type="button"
              >
                <Plus className="h-4 w-4" />
                Adicionar categoria
              </button>
            </div>

            <div className="mt-5 space-y-4">
              {categories.length === 0 ? (
                <EmptyState>Nenhuma categoria cadastrada.</EmptyState>
              ) : (
                categories.map((category, categoryIndex) => {
                  const categoryIds = orderedIds(categories);
                  const specialtyIds = orderedIds(category.specialties);

                  return (
                    <div
                      className="rounded-[24px] border border-border/80 bg-surface-muted/30 p-4"
                      key={category.id}
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <ChevronDown className="h-4 w-4 text-primary" />
                            <h3 className="text-base font-black text-foreground">
                              {category.name}
                            </h3>
                            <StatusBadge active={category.active} />
                            <span className="text-xs text-muted">
                              {category.specialties.length} especialidades
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-muted">/{category.slug}</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <IconButton
                            disabled={categoryIndex === 0 || isMutating}
                            label={`Mover ${category.name} para cima`}
                            onClick={() =>
                              moveCatalog({
                                direction: "up",
                                id: category.id,
                                ids: categoryIds,
                                type: "specialty_category",
                              })
                            }
                          >
                            <ArrowUp className="h-4 w-4" />
                          </IconButton>
                          <IconButton
                            disabled={categoryIndex === categories.length - 1 || isMutating}
                            label={`Mover ${category.name} para baixo`}
                            onClick={() =>
                              moveCatalog({
                                direction: "down",
                                id: category.id,
                                ids: categoryIds,
                                type: "specialty_category",
                              })
                            }
                          >
                            <ArrowDown className="h-4 w-4" />
                          </IconButton>
                          <button
                            className="inline-flex h-9 items-center gap-2 rounded-xl border border-border bg-white px-3 text-xs font-bold text-muted transition hover:border-primary/40 hover:text-primary"
                            onClick={() => setModal({ category, kind: "category", mode: "edit" })}
                            type="button"
                          >
                            <Edit3 className="h-4 w-4" /> Editar
                          </button>
                          <button
                            className="inline-flex h-9 items-center gap-2 rounded-xl border border-primary/25 bg-white px-3 text-xs font-bold text-primary hover:bg-primary-soft"
                            onClick={() =>
                              setModal({
                                categoryId: category.id,
                                kind: "item",
                                mode: "create",
                                type: "specialty",
                              })
                            }
                            type="button"
                          >
                            <Plus className="h-4 w-4" /> Especialidade
                          </button>
                          <button
                            className={cn(
                              "inline-flex h-9 items-center gap-2 rounded-xl border px-3 text-xs font-bold transition disabled:opacity-50",
                              category.active
                                ? "border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100"
                                : "border-emerald-200 bg-emerald-50 text-success hover:bg-emerald-100",
                            )}
                            disabled={isMutating}
                            onClick={() => toggleCategory(category)}
                            type="button"
                          >
                            {category.active ? (
                              <ToggleRight className="h-4 w-4" />
                            ) : (
                              <ToggleLeft className="h-4 w-4" />
                            )}
                            {category.active ? "Inativar" : "Reativar"}
                          </button>
                        </div>
                      </div>
                      <div className="mt-3 rounded-2xl bg-white px-3">
                        {category.specialties.length === 0 ? (
                          <EmptyState>Nenhuma especialidade nesta categoria.</EmptyState>
                        ) : (
                          category.specialties.map((item, index) => (
                            <CatalogRow
                              activeMutation={isMutating}
                              index={index}
                              item={item}
                              key={item.id}
                              lastIndex={category.specialties.length - 1}
                              onEdit={() =>
                                setModal({
                                  categoryId: category.id,
                                  item,
                                  kind: "item",
                                  mode: "edit",
                                  type: "specialty",
                                })
                              }
                              onMove={(direction) =>
                                moveCatalog({
                                  categoryId: category.id,
                                  direction,
                                  id: item.id,
                                  ids: specialtyIds,
                                  type: "specialty",
                                })
                              }
                              onToggle={() => toggleItem("specialty", item)}
                            />
                          ))
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>

          <div className="space-y-4">{CATALOG_SECTIONS.map(renderCatalogSection)}</div>
        </>
      )}

      {modal ? (
        <CatalogModal
          categories={categories}
          onClose={() => setModal(null)}
          onSubmit={submitModal}
          state={modal}
          submitting={
            createCategory.isPending ||
            updateCategory.isPending ||
            createItem.isPending ||
            updateItem.isPending
          }
        />
      ) : null}
      {restoreOpen ? (
        <RestoreModal
          onClose={() => setRestoreOpen(false)}
          onSubmit={restore}
          submitting={restoreDefaults.isPending}
        />
      ) : null}
    </div>
  );
};
