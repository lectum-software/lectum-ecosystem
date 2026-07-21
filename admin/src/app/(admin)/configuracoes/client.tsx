"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  CheckCircle2,
  ChevronDown,
  Edit3,
  GripVertical,
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
import { type PointerEvent, type ReactNode, useMemo, useRef, useState } from "react";
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

const cardClass =
  "rounded-card border border-border/80 bg-surface/95 shadow-admin-soft backdrop-blur";
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

type SettingsSectionId = "specialties" | ListCatalogType;

type CatalogDragInput = {
  categoryId?: string;
  id: string;
  ids: string[];
  type: AdminSettingsCatalogType;
};

type CatalogDragMetric = {
  bottom: number;
  height: number;
  id: string;
  top: number;
};

type CatalogDragSession = CatalogDragInput & {
  draggedSlotSize: number;
  metrics: CatalogDragMetric[];
  pointerId: number;
  sourceIndex: number;
  startClientY: number;
};

type CatalogDragState = {
  categoryId?: string;
  draggedSlotSize: number;
  id: string;
  offsetY: number;
  sourceIndex: number;
  targetIndex: number;
  type: AdminSettingsCatalogType;
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

const reorderIds = (ids: string[], id: string, targetIndex: number) => {
  const index = ids.indexOf(id);

  if (index < 0) return ids;

  const next = [...ids];
  const [item] = next.splice(index, 1);
  if (!item) return ids;

  const boundedTargetIndex = Math.max(0, Math.min(targetIndex, next.length));
  if (index === boundedTargetIndex) return ids;

  next.splice(boundedTargetIndex, 0, item);

  return next;
};

const sameScope = <T extends { categoryId?: string; type: AdminSettingsCatalogType }>(
  drag: T | null,
  type: AdminSettingsCatalogType,
  categoryId?: string,
): drag is T => drag?.type === type && (drag.categoryId ?? "") === (categoryId ?? "");

const isCatalogDragBlockedTarget = (target: EventTarget | null) => {
  if (!(target instanceof Element)) return false;

  return Boolean(
    target.closest("button, a, input, textarea, select, label, [contenteditable='true']"),
  );
};

const isCatalogDragHandleTarget = (target: EventTarget | null) =>
  target instanceof Element && Boolean(target.closest("[data-catalog-drag-handle='true']"));

const isCatalogDragCurrentCardTarget = (target: EventTarget | null, currentTarget: HTMLElement) => {
  if (!(target instanceof Element)) return false;

  return target.closest("[data-catalog-drag-card='true']") === currentTarget;
};

const isCatalogNestedDragScopeTarget = (target: EventTarget | null) =>
  target instanceof Element && Boolean(target.closest("[data-catalog-nested-drag-scope='true']"));

const catalogScopeKey = (type: AdminSettingsCatalogType, categoryId?: string) =>
  `${type}:${categoryId ?? ""}`;

const applyOptimisticOrder = <T extends { id: string }>(items: T[], orderIds?: string[]) => {
  if (!orderIds) return items;

  const itemsById = new Map(items.map((item) => [item.id, item]));
  const ordered = orderIds
    .map((id) => itemsById.get(id))
    .filter((item): item is T => Boolean(item));
  const orderedIdsSet = new Set(ordered.map((item) => item.id));
  const missing = items.filter((item) => !orderedIdsSet.has(item.id));

  return [...ordered, ...missing];
};

const measureCatalogCards = (container: HTMLElement | null): CatalogDragMetric[] =>
  Array.from(container?.children ?? [])
    .filter(
      (element): element is HTMLElement =>
        element instanceof HTMLElement && element.dataset.catalogDragCard === "true",
    )
    .map((element) => {
      const rect = element.getBoundingClientRect();

      return {
        bottom: rect.bottom,
        height: rect.height,
        id: element.dataset.catalogDragId ?? "",
        top: rect.top,
      };
    })
    .filter((metric) => metric.id);

const resolveCatalogSlotSize = (metrics: CatalogDragMetric[], sourceIndex: number) => {
  const sourceMetric = metrics[sourceIndex];
  if (!sourceMetric) return 0;

  const nextMetric = metrics[sourceIndex + 1];
  const previousMetric = metrics[sourceIndex - 1];
  const nextGap = nextMetric ? nextMetric.top - sourceMetric.bottom : null;
  const previousGap = previousMetric ? sourceMetric.top - previousMetric.bottom : null;
  const gap = [nextGap, previousGap].find((value) => typeof value === "number" && value > 0) ?? 12;

  return sourceMetric.height + gap;
};

const resolveCatalogTargetIndex = (clientY: number, session: CatalogDragSession) => {
  const metricsWithoutDragged = session.metrics.filter((metric) => metric.id !== session.id);
  const beforeMetricIndex = metricsWithoutDragged.findIndex(
    (metric) => clientY < metric.top + metric.height / 2,
  );

  return beforeMetricIndex >= 0 ? beforeMetricIndex : metricsWithoutDragged.length;
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

const SettingsHeader = ({ disabled, onRestore }: { disabled: boolean; onRestore: () => void }) => (
  <section className={cn(cardClass, "p-5 md:p-6")}>
    <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">
          Catálogos e filtros
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground md:text-4xl">
          Configurações
        </h1>
        <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-muted md:text-base">
          Gerencie as opções de filtros disponíveis na busca de psicólogos e nos formulários de
          perfil profissional.
        </p>
      </div>
      <button
        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-control bg-primary px-5 text-sm font-semibold text-white shadow-control transition hover:bg-primary-hover disabled:opacity-60 sm:w-fit"
        disabled={disabled}
        onClick={onRestore}
        type="button"
      >
        <RefreshCw aria-hidden className="h-4 w-4" />
        Restaurar padrões
      </button>
    </div>
  </section>
);

const EmptyState = ({ children }: { children: ReactNode }) => (
  <div className="rounded-2xl border border-dashed border-border bg-surface-muted/60 p-4 text-sm text-muted">
    {children}
  </div>
);

const DragHandle = ({ disabled, label }: { disabled?: boolean; label: string }) => (
  <span
    aria-hidden
    className={cn(
      "inline-flex h-9 w-9 shrink-0 touch-none items-center justify-center rounded-control border border-border bg-surface text-muted transition",
      disabled
        ? "cursor-not-allowed opacity-40"
        : "cursor-grab hover:border-primary/40 hover:text-primary group-active:cursor-grabbing",
    )}
    data-catalog-drag-handle="true"
    title={label}
  >
    <GripVertical className="h-4 w-4" />
  </span>
);

const ExpandToggle = ({
  children,
  controls,
  expanded,
  onClick,
}: {
  children: ReactNode;
  controls: string;
  expanded: boolean;
  onClick: () => void;
}) => (
  <button
    aria-controls={controls}
    aria-expanded={expanded}
    className="flex min-w-0 flex-1 gap-3 rounded-[1.35rem] text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
    onClick={onClick}
    type="button"
  >
    {children}
  </button>
);

const CatalogRow = ({
  activeMutation,
  dragDisabled,
  isDragging,
  item,
  onEdit,
  onPointerCancel,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onToggle,
  transform,
}: {
  activeMutation?: boolean;
  dragDisabled?: boolean;
  isDragging?: boolean;
  item: AdminSettingsCatalogOption | AdminSettingsSpecialty;
  onEdit: () => void;
  onPointerCancel: (event: PointerEvent<HTMLDivElement>) => void;
  onPointerDown: (event: PointerEvent<HTMLDivElement>) => void;
  onPointerMove: (event: PointerEvent<HTMLDivElement>) => void;
  onPointerUp: (event: PointerEvent<HTMLDivElement>) => void;
  onToggle: () => void;
  transform?: string;
}) => {
  const isDragDisabled = activeMutation || dragDisabled;
  const linkedLabel =
    typeof item.linked_count === "number"
      ? `${item.linked_count} ${item.linked_count === 1 ? "psicólogo vinculado" : "psicólogos vinculados"}`
      : null;

  return (
    <div
      aria-grabbed={isDragging}
      className={cn(
        "group flex flex-col gap-3 border-t border-border/70 py-3 will-change-transform first:border-t-0 md:flex-row md:items-center md:justify-between",
        isDragDisabled ? "cursor-default" : "cursor-grab active:cursor-grabbing",
        isDragging
          ? "relative z-20 select-none border-primary bg-primary-soft/35 shadow-admin-soft ring-2 ring-primary/15"
          : "transition-[transform,border-color,background-color,box-shadow] duration-200 ease-out",
      )}
      data-catalog-drag-card="true"
      data-catalog-drag-id={item.id}
      onLostPointerCapture={onPointerCancel}
      onPointerCancel={onPointerCancel}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      style={transform ? { transform } : undefined}
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-sm font-bold text-foreground">{item.name}</p>
          <StatusBadge active={item.active} />
          {linkedLabel ? <span className="text-xs text-muted">{linkedLabel}</span> : null}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <DragHandle disabled={isDragDisabled} label={`Arrastar ${item.name} para reordenar`} />
        <button
          className="inline-flex h-9 items-center gap-2 rounded-control border border-border bg-surface px-3 text-xs font-semibold text-muted transition hover:border-primary/40 hover:text-primary"
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
          {item.active ? "Desativar" : "Reativar"}
        </button>
      </div>
    </div>
  );
};

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
    <div className="fixed inset-0 z-50 flex items-end bg-overlay p-3 md:items-center md:justify-center">
      <div className="w-full max-w-lg rounded-[28px] border border-border bg-surface p-5 shadow-2xl">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">
              Catálogo
            </p>
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
    <div className="fixed inset-0 z-50 flex items-end bg-overlay p-3 md:items-center md:justify-center">
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
  const [dragging, setDragging] = useState<CatalogDragState | null>(null);
  const [optimisticOrders, setOptimisticOrders] = useState<Record<string, string[]>>({});
  const [openCategoryIds, setOpenCategoryIds] = useState<Record<string, boolean>>({});
  const [openSections, setOpenSections] = useState<Record<SettingsSectionId, boolean>>({
    approach: false,
    language: false,
    service: false,
    specialties: false,
    target_audience: false,
  });
  const dragSessionRef = useRef<CatalogDragSession | null>(null);
  const dragStateRef = useRef<CatalogDragState | null>(null);
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
      toast.success(category.active ? "Categoria desativada" : "Categoria reativada");
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
      toast.success(item.active ? "Item desativado" : "Item reativado");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const toggleSection = (section: SettingsSectionId) => {
    setOpenSections((current) => ({ ...current, [section]: !current[section] }));
  };

  const toggleCategoryOpen = (categoryId: string) => {
    setOpenCategoryIds((current) => ({ ...current, [categoryId]: !current[categoryId] }));
  };

  const updateDragState = (nextState: CatalogDragState | null) => {
    dragStateRef.current = nextState;
    setDragging(nextState);
  };

  const getOptimisticItems = <T extends { id: string }>(
    items: T[],
    type: AdminSettingsCatalogType,
    categoryId?: string,
  ) => applyOptimisticOrder(items, optimisticOrders[catalogScopeKey(type, categoryId)]);

  const isSameDragSession = (
    session: CatalogDragSession | null,
    input: Pick<CatalogDragInput, "categoryId" | "id" | "type">,
    pointerId: number,
  ): session is CatalogDragSession =>
    Boolean(
      session &&
        session.pointerId === pointerId &&
        session.id === input.id &&
        sameScope(session, input.type, input.categoryId),
    );

  const persistCatalogOrder = async (session: CatalogDragSession, targetIndex: number) => {
    const nextIds = reorderIds(session.ids, session.id, targetIndex);
    if (nextIds.join("|") === session.ids.join("|")) return;

    const scopeKey = catalogScopeKey(session.type, session.categoryId);
    setOptimisticOrders((current) => ({ ...current, [scopeKey]: nextIds }));

    try {
      await reorder.mutateAsync({
        category_id: session.categoryId,
        ids: nextIds,
        type: session.type,
      });
    } catch (error) {
      setOptimisticOrders((current) => {
        const next = { ...current };
        delete next[scopeKey];

        return next;
      });
      toast.error(getErrorMessage(error));
    }
  };

  const startCatalogDrag = (event: PointerEvent<HTMLDivElement>, input: CatalogDragInput) => {
    if (isMutating) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;
    if (input.type === "specialty_category" && isCatalogNestedDragScopeTarget(event.target)) return;
    if (!isCatalogDragCurrentCardTarget(event.target, event.currentTarget)) return;
    if (isCatalogDragBlockedTarget(event.target) && !isCatalogDragHandleTarget(event.target))
      return;
    if (event.pointerType !== "mouse" && !isCatalogDragHandleTarget(event.target)) return;

    const metrics = measureCatalogCards(event.currentTarget.parentElement);
    const metricSourceIndex = metrics.findIndex((metric) => metric.id === input.id);
    const sourceIndex = metricSourceIndex >= 0 ? metricSourceIndex : input.ids.indexOf(input.id);
    const draggedSlotSize = resolveCatalogSlotSize(metrics, sourceIndex);

    if (metrics.length < 2 || sourceIndex < 0 || draggedSlotSize <= 0) return;

    const nextState: CatalogDragState = {
      ...input,
      draggedSlotSize,
      offsetY: 0,
      sourceIndex,
      targetIndex: sourceIndex,
    };

    dragSessionRef.current = {
      ...input,
      draggedSlotSize,
      metrics,
      pointerId: event.pointerId,
      sourceIndex,
      startClientY: event.clientY,
    };
    updateDragState(nextState);
    event.currentTarget.setPointerCapture(event.pointerId);
    event.stopPropagation();
    event.preventDefault();
  };

  const handleCatalogPointerMove = (
    event: PointerEvent<HTMLDivElement>,
    input: Pick<CatalogDragInput, "categoryId" | "id" | "type">,
  ) => {
    const session = dragSessionRef.current;
    if (!isSameDragSession(session, input, event.pointerId)) return;

    updateDragState({
      categoryId: session.categoryId,
      draggedSlotSize: session.draggedSlotSize,
      id: session.id,
      offsetY: event.clientY - session.startClientY,
      sourceIndex: session.sourceIndex,
      targetIndex: resolveCatalogTargetIndex(event.clientY, session),
      type: session.type,
    });
    event.preventDefault();
  };

  const handleCatalogPointerEnd = (
    event: PointerEvent<HTMLDivElement>,
    input: Pick<CatalogDragInput, "categoryId" | "id" | "type">,
  ) => {
    const session = dragSessionRef.current;
    if (!isSameDragSession(session, input, event.pointerId)) return;

    const targetIndex = dragStateRef.current?.targetIndex ?? session.sourceIndex;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    dragSessionRef.current = null;
    updateDragState(null);
    event.preventDefault();

    if (targetIndex !== session.sourceIndex) {
      void persistCatalogOrder(session, targetIndex);
    }
  };

  const cancelCatalogPointerDrag = (
    event: PointerEvent<HTMLDivElement>,
    input: Pick<CatalogDragInput, "categoryId" | "id" | "type">,
  ) => {
    const session = dragSessionRef.current;
    if (!isSameDragSession(session, input, event.pointerId)) return;

    dragSessionRef.current = null;
    updateDragState(null);
  };

  const resolveCatalogTransform = (
    id: string,
    index: number,
    type: AdminSettingsCatalogType,
    categoryId?: string,
  ) => {
    if (!sameScope(dragging, type, categoryId)) return undefined;
    if (id === dragging.id) return `translate3d(0, ${dragging.offsetY}px, 0)`;

    if (
      dragging.targetIndex > dragging.sourceIndex &&
      index > dragging.sourceIndex &&
      index <= dragging.targetIndex
    ) {
      return `translate3d(0, -${dragging.draggedSlotSize}px, 0)`;
    }

    if (
      dragging.targetIndex < dragging.sourceIndex &&
      index >= dragging.targetIndex &&
      index < dragging.sourceIndex
    ) {
      return `translate3d(0, ${dragging.draggedSlotSize}px, 0)`;
    }

    return undefined;
  };

  const restore = async (confirmation: string) => {
    try {
      await restoreDefaults.mutateAsync(confirmation);
      toast.success("Padrões restaurados");
      setOptimisticOrders({});
      setRestoreOpen(false);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const renderCatalogSection = (section: (typeof CATALOG_SECTIONS)[number]) => {
    const items = getOptimisticItems(itemsByType[section.type], section.type);
    const ids = orderedIds(items);
    const isOpen = openSections[section.type];
    const sectionContentId = `settings-section-${section.type}`;

    return (
      <section className={cn(cardClass, "p-4 md:p-6")} key={section.type}>
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <ExpandToggle
            controls={sectionContentId}
            expanded={isOpen}
            onClick={() => toggleSection(section.type)}
          >
            <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-primary">
              {section.icon}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-black text-foreground">{section.label}</h2>
                <span className="rounded-full bg-primary-soft px-2.5 py-1 text-xs font-bold text-primary">
                  {items.length} opções
                </span>
              </div>
              <p className="mt-1 text-sm text-muted">{section.description}</p>
            </div>
            <ChevronDown
              className={cn(
                "mt-4 h-4 w-4 shrink-0 text-primary transition-transform",
                !isOpen && "-rotate-90",
              )}
            />
          </ExpandToggle>
          <button
            className="inline-flex h-11 items-center justify-center gap-2 rounded-control border border-primary/25 bg-surface px-4 text-sm font-semibold text-primary shadow-control hover:bg-primary-soft"
            onClick={() => setModal({ kind: "item", mode: "create", type: section.type })}
            type="button"
          >
            <Plus className="h-4 w-4" />
            Adicionar {singularLabel[section.type]}
          </button>
        </div>
        {isOpen ? (
          <div className="mt-4" id={sectionContentId}>
            {items.length === 0 ? (
              <EmptyState>Nenhuma opção cadastrada neste catálogo.</EmptyState>
            ) : (
              items.map((item, index) => (
                <CatalogRow
                  activeMutation={isMutating}
                  dragDisabled={items.length < 2}
                  isDragging={sameScope(dragging, section.type) && dragging.id === item.id}
                  item={item}
                  key={item.id}
                  onEdit={() => setModal({ item, kind: "item", mode: "edit", type: section.type })}
                  onPointerCancel={(event) =>
                    cancelCatalogPointerDrag(event, { id: item.id, type: section.type })
                  }
                  onPointerDown={(event) =>
                    startCatalogDrag(event, { id: item.id, ids, type: section.type })
                  }
                  onPointerMove={(event) =>
                    handleCatalogPointerMove(event, { id: item.id, type: section.type })
                  }
                  onPointerUp={(event) =>
                    handleCatalogPointerEnd(event, { id: item.id, type: section.type })
                  }
                  onToggle={() => toggleItem(section.type, item)}
                  transform={resolveCatalogTransform(item.id, index, section.type)}
                />
              ))
            )}
          </div>
        ) : null}
      </section>
    );
  };

  const displayCategories = getOptimisticItems(categories, "specialty_category");
  const categoryIds = orderedIds(displayCategories);
  const specialtiesOpen = openSections.specialties;
  const specialtiesSectionContentId = "settings-section-specialties";

  return (
    <div className="space-y-6">
      <SettingsHeader
        disabled={catalogs.isLoading || restoreDefaults.isPending}
        onRestore={() => setRestoreOpen(true)}
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {[
          ["Categorias", counts.specialtyCategories],
          ["Especialidades", counts.specialties],
          ["Abordagens", counts.approaches],
          ["Serviços", counts.services],
          ["Idiomas/Públicos", counts.languages + counts.targetAudiences],
        ].map(([label, value]) => (
          <div className={cn(cardClass, "p-4 md:p-5")} key={String(label)}>
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-muted">{label}</p>
            <p className="mt-2 text-2xl font-bold text-foreground">{value}</p>
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
              <ExpandToggle
                controls={specialtiesSectionContentId}
                expanded={specialtiesOpen}
                onClick={() => toggleSection("specialties")}
              >
                <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-primary">
                  <SlidersHorizontal className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
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
                <ChevronDown
                  className={cn(
                    "mt-4 h-4 w-4 shrink-0 text-primary transition-transform",
                    !specialtiesOpen && "-rotate-90",
                  )}
                />
              </ExpandToggle>
              <button
                className="inline-flex h-11 items-center justify-center gap-2 rounded-control border border-primary/25 bg-surface px-4 text-sm font-semibold text-primary shadow-control hover:bg-primary-soft"
                onClick={() => setModal({ kind: "category", mode: "create" })}
                type="button"
              >
                <Plus className="h-4 w-4" />
                Adicionar categoria
              </button>
            </div>

            {specialtiesOpen ? (
              <div className="mt-5 space-y-4" id={specialtiesSectionContentId}>
                {displayCategories.length === 0 ? (
                  <EmptyState>Nenhuma categoria cadastrada.</EmptyState>
                ) : (
                  displayCategories.map((category, categoryIndex) => {
                    const categoryContentId = `settings-category-${category.id}`;
                    const categoryOpen = Boolean(openCategoryIds[category.id]);
                    const isCategoryDragging =
                      sameScope(dragging, "specialty_category") && dragging.id === category.id;
                    const specialties = getOptimisticItems(
                      category.specialties,
                      "specialty",
                      category.id,
                    );
                    const specialtyIds = orderedIds(specialties);
                    const categoryTransform = resolveCatalogTransform(
                      category.id,
                      categoryIndex,
                      "specialty_category",
                    );

                    return (
                      <div
                        aria-grabbed={isCategoryDragging}
                        className={cn(
                          "group rounded-[24px] border border-border/80 bg-surface-muted/30 p-4 will-change-transform",
                          isMutating || displayCategories.length < 2
                            ? "cursor-default"
                            : "cursor-grab active:cursor-grabbing",
                          isCategoryDragging &&
                            "relative z-10 border-primary bg-primary-soft/40 opacity-80 shadow-admin-soft ring-2 ring-primary/15",
                          !isCategoryDragging &&
                            "transition-[transform,border-color,background-color,box-shadow] duration-200 ease-out",
                        )}
                        data-catalog-drag-card="true"
                        data-catalog-drag-id={category.id}
                        key={category.id}
                        onLostPointerCapture={(event) =>
                          cancelCatalogPointerDrag(event, {
                            id: category.id,
                            type: "specialty_category",
                          })
                        }
                        onPointerCancel={(event) =>
                          cancelCatalogPointerDrag(event, {
                            id: category.id,
                            type: "specialty_category",
                          })
                        }
                        onPointerDown={(event) =>
                          startCatalogDrag(event, {
                            id: category.id,
                            ids: categoryIds,
                            type: "specialty_category",
                          })
                        }
                        onPointerMove={(event) =>
                          handleCatalogPointerMove(event, {
                            id: category.id,
                            type: "specialty_category",
                          })
                        }
                        onPointerUp={(event) =>
                          handleCatalogPointerEnd(event, {
                            id: category.id,
                            type: "specialty_category",
                          })
                        }
                        style={categoryTransform ? { transform: categoryTransform } : undefined}
                      >
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                          <ExpandToggle
                            controls={categoryContentId}
                            expanded={categoryOpen}
                            onClick={() => toggleCategoryOpen(category.id)}
                          >
                            <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-primary">
                              <ChevronDown
                                className={cn(
                                  "h-4 w-4 transition-transform",
                                  !categoryOpen && "-rotate-90",
                                )}
                              />
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="text-base font-black text-foreground">
                                  {category.name}
                                </h3>
                                <StatusBadge active={category.active} />
                                <span className="text-xs text-muted">
                                  {specialties.length} especialidades
                                </span>
                              </div>
                            </div>
                          </ExpandToggle>
                          <div className="flex flex-wrap items-center gap-2">
                            <DragHandle
                              disabled={isMutating || displayCategories.length < 2}
                              label={`Arrastar ${category.name} para reordenar`}
                            />
                            <button
                              className="inline-flex h-9 items-center gap-2 rounded-control border border-border bg-surface px-3 text-xs font-semibold text-muted transition hover:border-primary/40 hover:text-primary"
                              onClick={() => setModal({ category, kind: "category", mode: "edit" })}
                              type="button"
                            >
                              <Edit3 className="h-4 w-4" /> Editar
                            </button>
                            <button
                              className="inline-flex h-9 items-center gap-2 rounded-control border border-primary/25 bg-surface px-3 text-xs font-semibold text-primary hover:bg-primary-soft"
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
                              {category.active ? "Desativar" : "Reativar"}
                            </button>
                          </div>
                        </div>
                        {categoryOpen ? (
                          <div
                            className="mt-3 rounded-[1.35rem] border border-border/60 bg-surface px-3"
                            data-catalog-nested-drag-scope="true"
                            id={categoryContentId}
                            onPointerDown={(event) => event.stopPropagation()}
                          >
                            {specialties.length === 0 ? (
                              <EmptyState>Nenhuma especialidade nesta categoria.</EmptyState>
                            ) : (
                              specialties.map((item, index) => (
                                <CatalogRow
                                  activeMutation={isMutating}
                                  dragDisabled={specialties.length < 2}
                                  isDragging={
                                    sameScope(dragging, "specialty", category.id) &&
                                    dragging.id === item.id
                                  }
                                  item={item}
                                  key={item.id}
                                  onEdit={() =>
                                    setModal({
                                      categoryId: category.id,
                                      item,
                                      kind: "item",
                                      mode: "edit",
                                      type: "specialty",
                                    })
                                  }
                                  onPointerCancel={(event) =>
                                    cancelCatalogPointerDrag(event, {
                                      categoryId: category.id,
                                      id: item.id,
                                      type: "specialty",
                                    })
                                  }
                                  onPointerDown={(event) =>
                                    startCatalogDrag(event, {
                                      categoryId: category.id,
                                      id: item.id,
                                      ids: specialtyIds,
                                      type: "specialty",
                                    })
                                  }
                                  onPointerMove={(event) =>
                                    handleCatalogPointerMove(event, {
                                      categoryId: category.id,
                                      id: item.id,
                                      type: "specialty",
                                    })
                                  }
                                  onPointerUp={(event) =>
                                    handleCatalogPointerEnd(event, {
                                      categoryId: category.id,
                                      id: item.id,
                                      type: "specialty",
                                    })
                                  }
                                  onToggle={() => toggleItem("specialty", item)}
                                  transform={resolveCatalogTransform(
                                    item.id,
                                    index,
                                    "specialty",
                                    category.id,
                                  )}
                                />
                              ))
                            )}
                          </div>
                        ) : null}
                      </div>
                    );
                  })
                )}
              </div>
            ) : null}
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
