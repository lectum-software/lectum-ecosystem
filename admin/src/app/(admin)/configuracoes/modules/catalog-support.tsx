import {
  Church,
  Languages,
  Layers3,
  Palette,
  SlidersHorizontal,
  UsersRound,
  VenusAndMars,
} from "lucide-react";
import type { ReactNode } from "react";
import { z } from "zod";
import { resolveApiError } from "@/api/handle";
import type {
  AdminSettingsCatalogOption,
  AdminSettingsCatalogType,
  AdminSettingsSpecialty,
  AdminSettingsSpecialtyCategory,
} from "@/api/req/settings";

export const cardClass =
  "rounded-card border border-border/80 bg-surface/95 shadow-admin-soft backdrop-blur";

export const DELETE_CONFIRMATION = "EXCLUIR CATALOGO";

export type MutableCatalogType = Exclude<AdminSettingsCatalogType, "specialty_category">;

export type ListCatalogType = Exclude<MutableCatalogType, "specialty">;

export type CatalogModalState =
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

export type CatalogDeleteModalState =
  | {
      kind: "category";
      category: AdminSettingsSpecialtyCategory;
    }
  | {
      kind: "item";
      item: AdminSettingsCatalogOption | AdminSettingsSpecialty;
      type: MutableCatalogType;
    };

export type SettingsSectionId = "specialties" | ListCatalogType;

export type CatalogDragInput = {
  categoryId?: string;
  id: string;
  ids: string[];
  type: AdminSettingsCatalogType;
};

export type CatalogDragMetric = {
  bottom: number;
  height: number;
  id: string;
  top: number;
};

export type CatalogDragSession = CatalogDragInput & {
  draggedSlotSize: number;
  metrics: CatalogDragMetric[];
  pointerId: number;
  sourceIndex: number;
  startClientY: number;
};

export type CatalogDragState = {
  categoryId?: string;
  draggedSlotSize: number;
  id: string;
  offsetY: number;
  sourceIndex: number;
  targetIndex: number;
  type: AdminSettingsCatalogType;
};

export const CATALOG_SECTIONS: Array<{
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
  {
    description: "Opções usadas no filtro de gênero e no perfil profissional.",
    icon: <VenusAndMars className="h-5 w-5" />,
    label: "Gênero",
    type: "gender",
  },
  {
    description: "Opções usadas no filtro de raça/cor dos psicólogos.",
    icon: <Palette className="h-5 w-5" />,
    label: "Raça",
    type: "race_color",
  },
  {
    description: "Opções usadas no filtro de religião dos psicólogos.",
    icon: <Church className="h-5 w-5" />,
    label: "Religião",
    type: "religion",
  },
];

export const singularLabel: Record<AdminSettingsCatalogType, string> = {
  approach: "abordagem",
  gender: "gênero",
  language: "idioma",
  race_color: "raça",
  religion: "religião",
  service: "serviço",
  specialty: "especialidade",
  specialty_category: "categoria",
  target_audience: "público",
};

export const formSchema = z.object({
  active: z.enum(["true", "false"]),
  category_id: z.string().optional(),
  name: z.string().trim().min(2, "Informe pelo menos 2 caracteres").max(160),
});

export type CatalogForm = z.infer<typeof formSchema>;

export const deleteSchema = z.object({
  confirmation: z.string().refine((value) => value.trim().toUpperCase() === DELETE_CONFIRMATION, {
    message: `Digite ${DELETE_CONFIRMATION} para confirmar`,
  }),
});

export type DeleteForm = z.infer<typeof deleteSchema>;

export const orderedIds = (items: Array<{ id: string }>) => items.map((item) => item.id);

export const reorderIds = (ids: string[], id: string, targetIndex: number) => {
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

export const sameScope = <T extends { categoryId?: string; type: AdminSettingsCatalogType }>(
  drag: T | null,
  type: AdminSettingsCatalogType,
  categoryId?: string,
): drag is T => drag?.type === type && (drag.categoryId ?? "") === (categoryId ?? "");

export const isCatalogDragBlockedTarget = (target: EventTarget | null) => {
  if (!(target instanceof Element)) return false;

  return Boolean(
    target.closest("button, a, input, textarea, select, label, [contenteditable='true']"),
  );
};

export const isCatalogDragHandleTarget = (target: EventTarget | null) =>
  target instanceof Element && Boolean(target.closest("[data-catalog-drag-handle='true']"));

export const isCatalogDragCurrentCardTarget = (
  target: EventTarget | null,
  currentTarget: HTMLElement,
) => {
  if (!(target instanceof Element)) return false;

  return target.closest("[data-catalog-drag-card='true']") === currentTarget;
};

export const isCatalogNestedDragScopeTarget = (target: EventTarget | null) =>
  target instanceof Element && Boolean(target.closest("[data-catalog-nested-drag-scope='true']"));

export const catalogScopeKey = (type: AdminSettingsCatalogType, categoryId?: string) =>
  `${type}:${categoryId ?? ""}`;

export const applyOptimisticOrder = <T extends { id: string }>(items: T[], orderIds?: string[]) => {
  if (!orderIds) return items;

  const itemsById = new Map(items.map((item) => [item.id, item]));
  const ordered = orderIds
    .map((id) => itemsById.get(id))
    .filter((item): item is T => Boolean(item));
  const orderedIdsSet = new Set(ordered.map((item) => item.id));
  const missing = items.filter((item) => !orderedIdsSet.has(item.id));

  return [...ordered, ...missing];
};

export const measureCatalogCards = (container: HTMLElement | null): CatalogDragMetric[] =>
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

export const resolveCatalogSlotSize = (metrics: CatalogDragMetric[], sourceIndex: number) => {
  const sourceMetric = metrics[sourceIndex];
  if (!sourceMetric) return 0;

  const nextMetric = metrics[sourceIndex + 1];
  const previousMetric = metrics[sourceIndex - 1];
  const nextGap = nextMetric ? nextMetric.top - sourceMetric.bottom : null;
  const previousGap = previousMetric ? sourceMetric.top - previousMetric.bottom : null;
  const gap = [nextGap, previousGap].find((value) => typeof value === "number" && value > 0) ?? 12;

  return sourceMetric.height + gap;
};

export const resolveCatalogTargetIndex = (clientY: number, session: CatalogDragSession) => {
  const metricsWithoutDragged = session.metrics.filter((metric) => metric.id !== session.id);
  const beforeMetricIndex = metricsWithoutDragged.findIndex(
    (metric) => clientY < metric.top + metric.height / 2,
  );

  return beforeMetricIndex >= 0 ? beforeMetricIndex : metricsWithoutDragged.length;
};

export const getErrorMessage = (error: unknown) =>
  resolveApiError(error) || "Não foi possível salvar a configuração agora.";
