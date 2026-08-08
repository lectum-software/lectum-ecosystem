"use client";
import { Edit3, GripVertical, ToggleLeft, ToggleRight, Trash2 } from "lucide-react";
import type { PointerEvent, ReactNode } from "react";
import type { AdminSettingsCatalogOption, AdminSettingsSpecialty } from "@/api/req/settings";
import { cn } from "@/lib/utils";

import { cardClass } from "../modules/catalog-support";

export const StatusBadge = ({ active }: { active: boolean }) => (
  <span
    className={cn(
      "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold",
      active ? "bg-success-soft text-success" : "bg-surface-muted text-muted",
    )}
  >
    {active ? "Ativo" : "Inativo"}
  </span>
);

export const SettingsHeader = () => (
  <section className={cn(cardClass, "p-5 md:p-6")}>
    <div className="flex flex-col gap-5">
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
    </div>
  </section>
);

export const EmptyState = ({ children }: { children: ReactNode }) => (
  <div className="rounded-2xl border border-dashed border-border bg-surface-muted/60 p-4 text-sm text-muted">
    {children}
  </div>
);

export const DragHandle = ({ disabled, label }: { disabled?: boolean; label: string }) => (
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

export const ExpandToggle = ({
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

export const CatalogRow = ({
  activeMutation,
  dragDisabled,
  isDragging,
  item,
  onDelete,
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
  onDelete: () => void;
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
              ? "border-warning-border bg-warning-soft text-warning hover:bg-warning-soft"
              : "border-success-border bg-success-soft text-success hover:bg-success-soft",
          )}
          disabled={activeMutation}
          onClick={onToggle}
          type="button"
        >
          {item.active ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
          {item.active ? "Desativar" : "Reativar"}
        </button>
        <button
          aria-label={`Excluir ${item.name}`}
          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-danger/25 bg-danger/5 text-danger transition hover:bg-danger/10 disabled:opacity-50"
          disabled={activeMutation}
          onClick={onDelete}
          title={`Excluir ${item.name}`}
          type="button"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};
