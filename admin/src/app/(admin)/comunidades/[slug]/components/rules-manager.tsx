"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Edit3, GripVertical, Plus, Trash2 } from "lucide-react";
import { type PointerEvent, useEffect, useMemo, useRef, useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { toast } from "sonner";
import {
  useAdminCommunityCreateRule,
  useAdminCommunityDeleteRule,
  useAdminCommunityUpdateRule,
} from "@/api/callers/communities";
import { resolveApiError } from "@/api/handle";
import type { AdminCommunityRule, AdminCommunityRuleInput } from "@/api/req/communities";
import { TextareaController } from "@/components/controllers";
import { useAdminDialogLifecycle } from "@/hooks/use-admin-dialog-lifecycle";
import { cn } from "@/lib/utils";

import {
  cardClass,
  existingRulePayload,
  formatCountLabel,
  isRuleDragBlockedTarget,
  isRuleDragHandleTarget,
  measureRuleCards,
  type RuleDragSession,
  type RuleDragState,
  type RuleFormValues,
  resolveRuleSlotSize,
  resolveRuleTargetIndex,
  ruleFormSchema,
  toRulePayload,
} from "../modules/detail-support";

export const RuleEditForm = ({
  disabled,
  onCancel,
  onSubmit,
  rule,
}: {
  disabled: boolean;
  onCancel: () => void;
  onSubmit: (values: RuleFormValues) => Promise<void>;
  rule: AdminCommunityRule;
}) => {
  const form = useForm<RuleFormValues>({
    defaultValues: {
      description: rule.description,
    },
    resolver: zodResolver(ruleFormSchema),
  });
  return (
    <FormProvider {...form}>
      <form
        className="grid gap-3 rounded-2xl border border-border bg-surface-muted p-3"
        noValidate
        onSubmit={form.handleSubmit((values) => void onSubmit(values))}
      >
        <TextareaController<RuleFormValues>
          label="Texto da regra"
          name="description"
          required
          rows={3}
        />
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button
            className="h-10 rounded-control border border-border bg-surface px-4 text-sm font-black"
            onClick={onCancel}
            type="button"
          >
            Cancelar
          </button>
          <button
            className="h-10 rounded-control bg-primary px-4 text-sm font-black text-primary-foreground disabled:opacity-70"
            disabled={disabled}
            type="submit"
          >
            Salvar regra
          </button>
        </div>
      </form>
    </FormProvider>
  );
};

export const RuleCreateModal = ({
  disabled,
  nextPosition,
  onClose,
  onSubmit,
  open,
}: {
  disabled: boolean;
  nextPosition: number;
  onClose: () => void;
  onSubmit: (input: AdminCommunityRuleInput) => Promise<boolean>;
  open: boolean;
}) => {
  const form = useForm<RuleFormValues>({
    defaultValues: {
      description: "",
    },
    resolver: zodResolver(ruleFormSchema),
  });
  const dialogRef = useAdminDialogLifecycle(onClose, {
    closeEnabled: !disabled,
    enabled: open,
  });

  useEffect(() => {
    if (!open) {
      form.reset({ description: "" });
    }
  }, [form, open]);

  if (!open) return null;

  return (
    <div
      aria-label="Criar nova regra"
      aria-modal="true"
      className="fixed inset-0 z-50 grid place-items-center bg-media-background/40 p-4 backdrop-blur-sm"
      ref={dialogRef}
      role="dialog"
      tabIndex={-1}
    >
      <FormProvider {...form}>
        <form
          className="w-full max-w-xl rounded-card border border-border bg-surface p-5 shadow-admin-soft"
          noValidate
          onSubmit={form.handleSubmit(async (values) => {
            const created = await onSubmit({ ...toRulePayload(values), position: nextPosition });
            if (created) {
              form.reset({ description: "" });
              onClose();
            }
          })}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-black text-foreground">Criar nova regra</h3>
              <p className="mt-1 text-sm text-muted">Informe o texto exibido na comunidade.</p>
            </div>
          </div>
          <div className="mt-4">
            <TextareaController<RuleFormValues>
              label="Texto da regra"
              name="description"
              placeholder="Digite a regra da comunidade"
              required
              rows={4}
            />
          </div>
          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
            <button
              className="h-10 rounded-control border border-border bg-surface px-4 text-sm font-black"
              disabled={disabled}
              onClick={onClose}
              type="button"
            >
              Cancelar
            </button>
            <button
              className="h-10 rounded-control bg-primary px-4 text-sm font-black text-primary-foreground disabled:opacity-70"
              disabled={disabled}
              type="submit"
            >
              Criar regra
            </button>
          </div>
        </form>
      </FormProvider>
    </div>
  );
};

export const RulesManager = ({ id, rules }: { id: string; rules: AdminCommunityRule[] }) => {
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [dragState, setDragState] = useState<RuleDragState | null>(null);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [optimisticRuleOrderIds, setOptimisticRuleOrderIds] = useState<string[] | null>(null);
  const optimisticRuleOrderIdsRef = useRef<string[] | null>(null);
  const dragSessionRef = useRef<RuleDragSession | null>(null);
  const dragStateRef = useRef<RuleDragState | null>(null);
  const ruleOrderPersistenceRef = useRef<Promise<void>>(Promise.resolve());
  const rulesListRef = useRef<HTMLDivElement | null>(null);
  const createMutation = useAdminCommunityCreateRule(id);
  const updateMutation = useAdminCommunityUpdateRule(id);
  const deleteMutation = useAdminCommunityDeleteRule(id);
  const sortedRules = useMemo(
    () =>
      [...rules].sort(
        (left, right) =>
          left.position - right.position ||
          new Date(left.created_at).getTime() - new Date(right.created_at).getTime() ||
          left.id.localeCompare(right.id),
      ),
    [rules],
  );
  const orderedRules = useMemo(() => {
    if (!optimisticRuleOrderIds) return sortedRules;

    const rulesById = new Map(sortedRules.map((rule) => [rule.id, rule]));
    const ordered = optimisticRuleOrderIds
      .map((ruleId) => rulesById.get(ruleId))
      .filter((rule): rule is AdminCommunityRule => Boolean(rule));
    const orderedIds = new Set(ordered.map((rule) => rule.id));
    const missingRules = sortedRules.filter((rule) => !orderedIds.has(rule.id));

    return [...ordered, ...missingRules];
  }, [optimisticRuleOrderIds, sortedRules]);
  const nextPosition =
    sortedRules.length > 0 ? Math.max(...sortedRules.map((rule) => rule.position)) + 1 : 0;

  const updateRuleDragState = (nextState: RuleDragState | null) => {
    dragStateRef.current = nextState;
    setDragState(nextState);
  };
  const updateOptimisticRuleOrder = (ruleOrderIds: string[] | null) => {
    optimisticRuleOrderIdsRef.current = ruleOrderIds;
    setOptimisticRuleOrderIds(ruleOrderIds);
  };
  const resolveCurrentRuleOrder = () => {
    const ruleOrderIds = optimisticRuleOrderIdsRef.current;
    if (!ruleOrderIds) return [...sortedRules];

    const rulesById = new Map(sortedRules.map((rule) => [rule.id, rule]));
    const currentOrder = ruleOrderIds
      .map((ruleId) => rulesById.get(ruleId))
      .filter((rule): rule is AdminCommunityRule => Boolean(rule));
    const currentOrderIds = new Set(currentOrder.map((rule) => rule.id));
    const missingRules = sortedRules.filter((rule) => !currentOrderIds.has(rule.id));

    return [...currentOrder, ...missingRules];
  };

  const updateRule = async (rule: AdminCommunityRule, input: AdminCommunityRuleInput) => {
    try {
      await updateMutation.mutateAsync({ input, ruleId: rule.id });
      toast.success("Regra atualizada.");
      setEditingRuleId(null);
    } catch (error) {
      toast.error(resolveApiError(error));
    }
  };
  const createRule = async (input: AdminCommunityRuleInput) => {
    try {
      await createMutation.mutateAsync(input);
      toast.success("Regra adicionada.");

      return true;
    } catch (error) {
      toast.error(resolveApiError(error));

      return false;
    }
  };
  const deleteRule = async (rule: AdminCommunityRule) => {
    if (!window.confirm("Remover esta regra?")) return;

    try {
      await deleteMutation.mutateAsync(rule.id);
      toast.success("Regra removida.");
    } catch (error) {
      toast.error(resolveApiError(error));
    }
  };
  const reorderRules = async (sourceRuleId: string, targetIndex: number) => {
    const currentOrder = resolveCurrentRuleOrder();
    const sourceIndex = currentOrder.findIndex((rule) => rule.id === sourceRuleId);
    if (sourceIndex < 0) return;

    const [draggedRule] = currentOrder.splice(sourceIndex, 1);
    if (!draggedRule) return;

    const boundedTargetIndex = Math.max(0, Math.min(targetIndex, currentOrder.length));
    currentOrder.splice(boundedTargetIndex, 0, draggedRule);

    if (currentOrder.every((rule, index) => rule.id === orderedRules[index]?.id)) return;

    const orderedPositions = sortedRules.map((_, index) => index);
    const updates = currentOrder
      .map((rule, index) => ({ position: orderedPositions[index] ?? index, rule }))
      .filter(({ position, rule }) => rule.position !== position);

    if (updates.length === 0) return;

    updateOptimisticRuleOrder(currentOrder.map((rule) => rule.id));

    const persistOrder = async () => {
      await Promise.all(
        updates.map(({ position, rule }) =>
          updateMutation.mutateAsync({
            input: existingRulePayload(rule, position),
            ruleId: rule.id,
          }),
        ),
      );
    };

    const persistence = ruleOrderPersistenceRef.current.then(persistOrder, persistOrder);
    ruleOrderPersistenceRef.current = persistence.catch(() => undefined);

    try {
      await persistence;
      toast.success("Ordem das regras atualizada.");
    } catch (error) {
      updateOptimisticRuleOrder(null);
      toast.error(resolveApiError(error));
    }
  };
  const handlePointerDown = (
    event: PointerEvent<HTMLElement>,
    ruleId: string,
    sourceIndex: number,
  ) => {
    if (editingRuleId) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;
    if (isRuleDragBlockedTarget(event.target)) return;
    if (event.pointerType !== "mouse" && !isRuleDragHandleTarget(event.target)) return;

    const metrics = measureRuleCards(rulesListRef.current);
    const metricSourceIndex = metrics.findIndex((metric) => metric.id === ruleId);
    const resolvedSourceIndex = metricSourceIndex >= 0 ? metricSourceIndex : sourceIndex;
    const draggedSlotSize = resolveRuleSlotSize(metrics, resolvedSourceIndex);

    if (metrics.length < 2 || draggedSlotSize <= 0) return;

    const nextState = {
      draggedSlotSize,
      offsetY: 0,
      sourceIndex: resolvedSourceIndex,
      sourceRuleId: ruleId,
      targetIndex: resolvedSourceIndex,
    };

    dragSessionRef.current = {
      draggedSlotSize,
      metrics,
      pointerId: event.pointerId,
      sourceIndex: resolvedSourceIndex,
      sourceRuleId: ruleId,
      startClientY: event.clientY,
    };
    updateRuleDragState(nextState);
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
  };
  const handlePointerMove = (event: PointerEvent<HTMLElement>, ruleId: string) => {
    const session = dragSessionRef.current;
    if (!session || session.pointerId !== event.pointerId || session.sourceRuleId !== ruleId)
      return;

    const nextState = {
      draggedSlotSize: session.draggedSlotSize,
      offsetY: event.clientY - session.startClientY,
      sourceIndex: session.sourceIndex,
      sourceRuleId: session.sourceRuleId,
      targetIndex: resolveRuleTargetIndex(event.clientY, session),
    };

    updateRuleDragState(nextState);
    event.preventDefault();
  };
  const handlePointerEnd = (event: PointerEvent<HTMLElement>, ruleId: string) => {
    const session = dragSessionRef.current;
    if (!session || session.pointerId !== event.pointerId || session.sourceRuleId !== ruleId)
      return;

    const targetIndex = dragStateRef.current?.targetIndex ?? session.sourceIndex;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    dragSessionRef.current = null;
    updateRuleDragState(null);
    event.preventDefault();

    if (targetIndex !== session.sourceIndex) {
      void reorderRules(session.sourceRuleId, targetIndex);
    }
  };
  const cancelPointerDrag = (event: PointerEvent<HTMLElement>, ruleId: string) => {
    const session = dragSessionRef.current;
    if (!session || session.pointerId !== event.pointerId || session.sourceRuleId !== ruleId)
      return;

    dragSessionRef.current = null;
    updateRuleDragState(null);
  };
  const resolveRuleTransform = (ruleId: string, index: number) => {
    if (!dragState) return undefined;
    if (ruleId === dragState.sourceRuleId) {
      return `translate3d(0, ${dragState.offsetY}px, 0)`;
    }

    if (
      dragState.targetIndex > dragState.sourceIndex &&
      index > dragState.sourceIndex &&
      index <= dragState.targetIndex
    ) {
      return `translate3d(0, -${dragState.draggedSlotSize}px, 0)`;
    }

    if (
      dragState.targetIndex < dragState.sourceIndex &&
      index >= dragState.targetIndex &&
      index < dragState.sourceIndex
    ) {
      return `translate3d(0, ${dragState.draggedSlotSize}px, 0)`;
    }

    return undefined;
  };

  return (
    <>
      <section className={cn(cardClass, "p-5")}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <h2 className="text-lg font-black text-foreground">Regras da comunidade</h2>
          <button
            className="inline-flex h-11 items-center justify-center gap-2 rounded-control bg-primary px-4 text-sm font-black text-primary-foreground shadow-sm transition hover:bg-primary/90 sm:ml-auto"
            onClick={() => setCreateModalOpen(true)}
            type="button"
          >
            <Plus aria-hidden className="h-4 w-4" />
            Criar nova regra
          </button>
        </div>
        <p className="mt-2 text-sm text-muted">
          {formatCountLabel(sortedRules.length, "regra exibida", "regras exibidas")} na comunidade.
        </p>

        <div className="mt-5 space-y-3" ref={rulesListRef}>
          {orderedRules.length === 0 ? (
            <p className="rounded-2xl bg-surface-muted p-4 text-sm text-muted">
              Nenhuma regra cadastrada para esta comunidade.
            </p>
          ) : (
            orderedRules.map((rule, index) => {
              const isEditing = editingRuleId === rule.id;
              const isDragging = dragState?.sourceRuleId === rule.id;
              const transform = resolveRuleTransform(rule.id, index);

              return (
                <article
                  aria-grabbed={isDragging}
                  className={cn(
                    "rounded-2xl border border-border bg-surface p-4 will-change-transform",
                    isDragging
                      ? "relative z-20 cursor-grabbing select-none border-primary bg-primary-soft/50 shadow-admin-soft ring-2 ring-primary/20"
                      : "transition-[transform,border-color,background-color,box-shadow] duration-200 ease-out",
                    !isEditing && !dragState && "cursor-grab",
                    !isEditing && dragState && !isDragging && "pointer-events-none",
                  )}
                  data-rule-card="true"
                  data-rule-id={rule.id}
                  key={rule.id}
                  onLostPointerCapture={(event) => cancelPointerDrag(event, rule.id)}
                  onPointerCancel={(event) => cancelPointerDrag(event, rule.id)}
                  onPointerDown={(event) => handlePointerDown(event, rule.id, index)}
                  onPointerMove={(event) => handlePointerMove(event, rule.id)}
                  onPointerUp={(event) => handlePointerEnd(event, rule.id)}
                  style={transform ? { transform } : undefined}
                >
                  {isEditing ? (
                    <RuleEditForm
                      disabled={updateMutation.isPending}
                      onCancel={() => setEditingRuleId(null)}
                      onSubmit={(values) => updateRule(rule, toRulePayload(values, rule))}
                      rule={rule}
                    />
                  ) : (
                    <div className="grid gap-4 xl:grid-cols-[1fr_auto] xl:items-center">
                      <div className="flex min-w-0 items-start gap-3">
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary-soft text-xs font-black text-primary">
                          {index + 1}
                        </span>
                        <GripVertical
                          aria-hidden
                          className="mt-1.5 h-5 w-5 shrink-0 touch-none text-muted"
                          data-rule-drag-handle="true"
                        />
                        <p className="min-w-0 text-sm leading-6 text-muted">{rule.description}</p>
                      </div>
                      <div className="flex flex-wrap gap-2 xl:justify-end">
                        <button
                          aria-label="Editar regra"
                          className="grid h-10 w-10 place-items-center rounded-xl border border-border text-muted transition hover:border-primary hover:text-primary"
                          onClick={() => setEditingRuleId(rule.id)}
                          title="Editar regra"
                          type="button"
                        >
                          <Edit3 aria-hidden className="h-4 w-4" />
                        </button>
                        <button
                          aria-label="Remover regra"
                          className="grid h-10 w-10 place-items-center rounded-xl border border-danger-border text-danger transition hover:bg-danger-soft"
                          disabled={deleteMutation.isPending}
                          onClick={() => void deleteRule(rule)}
                          title="Remover regra"
                          type="button"
                        >
                          <Trash2 aria-hidden className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </article>
              );
            })
          )}
        </div>
      </section>

      <RuleCreateModal
        disabled={createMutation.isPending}
        nextPosition={nextPosition}
        onClose={() => setCreateModalOpen(false)}
        onSubmit={createRule}
        open={createModalOpen}
      />
    </>
  );
};
