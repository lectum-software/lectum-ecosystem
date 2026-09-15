"use client";

import { Edit3, GripVertical, Plus, Trash2 } from "lucide-react";
import { type PointerEvent, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  useAdminCommunityCreateRule,
  useAdminCommunityDeleteRule,
  useAdminCommunityDetail,
  useAdminCommunityUpdateRule,
} from "@/api/callers/communities";
import { resolveApiError } from "@/api/handle";
import type { AdminCommunityRule, AdminCommunityRuleInput } from "@/api/req/communities";
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
  resolveRuleSlotSize,
  resolveRuleTargetIndex,
  toRulePayload,
} from "../modules/detail-support";

import {
  acquireRuleOperation,
  planRuleMove,
  settleRuleUpdates,
  sortCommunityRules,
} from "../modules/rule-order";
import { RuleCreateModal, RuleEditForm } from "./rule-forms";
import { RuleOrderControls } from "./rule-order-controls";

type RulesManagerProps = { id: string; rules: AdminCommunityRule[] };
export const RulesManager = (props: RulesManagerProps) => (
  <RulesManagerContent key={props.id} {...props} />
);

const RulesManagerContent = ({ id, rules }: RulesManagerProps) => {
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [dragState, setDragState] = useState<RuleDragState | null>(null);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [optimisticRules, setOptimisticRules] = useState<AdminCommunityRule[] | null>(null);
  const [pending, setPending] = useState(false);
  const [needsRefresh, setNeedsRefresh] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const operationRef = useRef(false);
  const needsRefreshRef = useRef(false);
  const mountedRef = useRef(true);
  const focusAfterMoveRef = useRef<{ card: HTMLElement; previous: Element | null } | null>(null);
  const dragSessionRef = useRef<RuleDragSession | null>(null);
  const dragStateRef = useRef<RuleDragState | null>(null);
  const rulesListRef = useRef<HTMLDivElement | null>(null);
  const createMutation = useAdminCommunityCreateRule(id);
  const updateMutation = useAdminCommunityUpdateRule(id);
  const deleteMutation = useAdminCommunityDeleteRule(id);
  // The current parent passes its query slug as id. Reuse that key for a final
  // refetch without an extra automatic fetch; normal rendering follows parent props.
  const detailQuery = useAdminCommunityDetail(id, { enabled: false });
  const sortedRules = useMemo(() => sortCommunityRules(rules), [rules]);
  // Freeze complete records during the batch: intermediate invalidations must not
  // mix new positions/content with an old optimistic list of IDs.
  const orderedRules = optimisticRules ?? sortedRules;
  const mutationPending =
    createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;
  const busy = pending || mutationPending;
  const actionsDisabled = busy || needsRefresh || Boolean(dragState);
  const movementDisabled = actionsDisabled || Boolean(editingRuleId) || createModalOpen;
  const nextPosition =
    sortedRules.length > 0 ? Math.max(...sortedRules.map((rule) => rule.position)) + 1 : 0;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      focusAfterMoveRef.current = null;
    };
  }, []);

  const preserveFocusedRule = (ruleId: string) => {
    const card = Array.from(
      rulesListRef.current?.querySelectorAll<HTMLElement>("[data-rule-card]") ?? [],
    ).find((element) => element.dataset.ruleId === ruleId);
    if (card?.contains(document.activeElement)) {
      focusAfterMoveRef.current = { card, previous: document.activeElement };
    }
  };
  useLayoutEffect(() => {
    const request = focusAfterMoveRef.current;
    focusAfterMoveRef.current = null;
    // One commit only, never a delayed focus after the user has moved elsewhere.
    if (
      request?.card.isConnected &&
      (document.activeElement === request.previous || document.activeElement === document.body)
    ) {
      request.card.focus({ preventScroll: true });
    }
  });

  const beginOperation = (refreshOnly = false) => {
    if (
      !acquireRuleOperation(
        operationRef,
        mutationPending ||
          Boolean(dragSessionRef.current) ||
          (!refreshOnly && needsRefreshRef.current),
      )
    )
      return false;
    setPending(true);
    return true;
  };
  const endOperation = () => {
    operationRef.current = false;
    if (mountedRef.current) setPending(false);
  };
  const updateRuleDragState = (nextState: RuleDragState | null) => {
    dragStateRef.current = nextState;
    setDragState(nextState);
  };
  const refreshSavedRules = async () => {
    const result = await detailQuery.refetch({ throwOnError: true });
    if (result.isError || !result.data) throw new Error("Rule state unavailable");
    if (!mountedRef.current) return;
    setOptimisticRules(null);
    needsRefreshRef.current = false;
    setNeedsRefresh(false);
  };
  const reportUnconfirmedOrder = () => {
    needsRefreshRef.current = true;
    setNeedsRefresh(true);
    const message =
      "Não foi possível confirmar a ordem salva. Atualize a lista antes de continuar.";
    setAnnouncement(message);
    toast.error(message);
  };
  const retryRefresh = async () => {
    if (!needsRefreshRef.current || !beginOperation(true)) return;
    setAnnouncement("Atualizando as regras salvas.");
    try {
      await refreshSavedRules();
      if (mountedRef.current) setAnnouncement("Lista atualizada com as regras salvas.");
    } catch {
      if (mountedRef.current) reportUnconfirmedOrder();
    } finally {
      endOperation();
    }
  };
  const updateRule = async (rule: AdminCommunityRule, input: AdminCommunityRuleInput) => {
    if (!beginOperation()) return;
    try {
      await updateMutation.mutateAsync({ input, ruleId: rule.id });
      if (!mountedRef.current) return;
      toast.success("Regra atualizada.");
      setEditingRuleId(null);
    } catch (error) {
      if (mountedRef.current) toast.error(resolveApiError(error));
    } finally {
      endOperation();
    }
  };
  const createRule = async (input: AdminCommunityRuleInput) => {
    if (!beginOperation()) return false;
    try {
      await createMutation.mutateAsync(input);
      if (!mountedRef.current) return false;
      toast.success("Regra adicionada.");
      return true;
    } catch (error) {
      if (mountedRef.current) toast.error(resolveApiError(error));
      return false;
    } finally {
      endOperation();
    }
  };
  const deleteRule = async (rule: AdminCommunityRule) => {
    if (editingRuleId || createModalOpen || !beginOperation()) return;
    try {
      if (!window.confirm("Remover esta regra?")) return;
      await deleteMutation.mutateAsync(rule.id);
      if (mountedRef.current) toast.success("Regra removida.");
    } catch (error) {
      if (mountedRef.current) toast.error(resolveApiError(error));
    } finally {
      endOperation();
    }
  };
  const reorderRules = async (sourceRuleId: string, targetIndex: number) => {
    if (editingRuleId || createModalOpen) return;
    const plan = planRuleMove(orderedRules, sourceRuleId, targetIndex);
    if (!plan || !beginOperation()) return;
    preserveFocusedRule(sourceRuleId);
    setOptimisticRules(plan.ordered);
    const position = plan.ordered.findIndex((rule) => rule.id === sourceRuleId) + 1;
    setAnnouncement(
      `Regra movida para a posição ${position} de ${plan.ordered.length}. Salvando ordem.`,
    );
    try {
      const results = await settleRuleUpdates(plan.updates, ({ rule, position }) =>
        updateMutation.mutateAsync({ input: existingRulePayload(rule, position), ruleId: rule.id }),
      );
      if (!mountedRef.current) return;
      // Individual PUTs are not atomic. Read the real state after every write settles,
      // even on rejection; never display an assumed rollback or leave optimistic IDs.
      await refreshSavedRules();
      if (!mountedRef.current) return;
      if (results.some((result) => result.status === "rejected")) {
        const message = "Não foi possível salvar toda a ordem. A lista mostra as posições salvas.";
        setAnnouncement(message);
        toast.error(message);
      } else {
        setAnnouncement("Ordem das regras salva. Lista atualizada.");
        toast.success("Ordem das regras atualizada.");
      }
    } catch {
      if (mountedRef.current) reportUnconfirmedOrder();
    } finally {
      endOperation();
    }
  };
  const handlePointerDown = (
    event: PointerEvent<HTMLElement>,
    ruleId: string,
    sourceIndex: number,
  ) => {
    if (
      movementDisabled ||
      operationRef.current ||
      needsRefreshRef.current ||
      dragSessionRef.current
    )
      return;
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
            className="inline-flex h-11 items-center justify-center gap-2 rounded-control bg-primary px-4 text-sm font-black text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:opacity-40 sm:ml-auto"
            disabled={movementDisabled}
            onClick={() => {
              if (!movementDisabled && !operationRef.current && !needsRefreshRef.current)
                setCreateModalOpen(true);
            }}
            type="button"
          >
            <Plus aria-hidden className="h-4 w-4" />
            Criar nova regra
          </button>
        </div>
        <p className="mt-2 min-h-5 text-sm text-muted">
          {busy
            ? "Atualizando regras..."
            : `${formatCountLabel(orderedRules.length, "regra exibida", "regras exibidas")} na comunidade.`}
        </p>

        <p aria-live="polite" aria-atomic="true" className="sr-only" role="status">
          {announcement}
        </p>
        {needsRefresh ? (
          <div className="mt-3 rounded-xl border border-warning-border bg-warning-soft p-3 text-sm text-foreground">
            <p>A ordem exibida ainda não foi confirmada. Algumas posições podem ter sido salvas.</p>
            <button
              className="mt-2 min-h-11 rounded-control border border-border bg-surface px-4 font-bold disabled:opacity-40"
              disabled={busy}
              onClick={() => void retryRefresh()}
              type="button"
            >
              Atualizar regras
            </button>
          </div>
        ) : null}
        <div aria-busy={busy} className="mt-5 space-y-3" ref={rulesListRef}>
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
                  aria-label={`Regra ${index + 1} de ${orderedRules.length}`}
                  className={cn(
                    "rounded-2xl border border-border bg-surface p-4 will-change-transform focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                    isDragging
                      ? "relative z-20 cursor-grabbing select-none border-primary bg-primary-soft/50 shadow-admin-soft ring-2 ring-primary/20"
                      : "transition-[transform,border-color,background-color,box-shadow] duration-200 ease-out",
                    !movementDisabled && "cursor-grab",
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
                  tabIndex={-1}
                >
                  {isEditing ? (
                    <RuleEditForm
                      disabled={busy || needsRefresh}
                      onCancel={() => {
                        if (!operationRef.current && !busy) setEditingRuleId(null);
                      }}
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
                      <div className="flex flex-col items-start gap-2 sm:flex-row sm:flex-wrap xl:flex-nowrap xl:justify-end">
                        <div className="flex flex-wrap gap-2">
                          <RuleOrderControls
                            disabled={movementDisabled}
                            index={index}
                            total={orderedRules.length}
                            onMove={(targetIndex) => void reorderRules(rule.id, targetIndex)}
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            aria-label={`Editar regra ${index + 1}`}
                            className="grid h-11 w-11 place-items-center rounded-xl border border-border text-muted transition hover:border-primary hover:text-primary disabled:opacity-40"
                            disabled={movementDisabled}
                            onClick={() => {
                              if (
                                !movementDisabled &&
                                !operationRef.current &&
                                !needsRefreshRef.current
                              )
                                setEditingRuleId(rule.id);
                            }}
                            title="Editar regra"
                            type="button"
                          >
                            <Edit3 aria-hidden className="h-4 w-4" />
                          </button>
                          <button
                            aria-label={`Remover regra ${index + 1}`}
                            className="grid h-11 w-11 place-items-center rounded-xl border border-danger-border text-danger transition hover:bg-danger-soft disabled:opacity-40"
                            disabled={movementDisabled}
                            onClick={() => void deleteRule(rule)}
                            title="Remover regra"
                            type="button"
                          >
                            <Trash2 aria-hidden className="h-4 w-4" />
                          </button>
                        </div>
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
        disabled={busy || needsRefresh}
        nextPosition={nextPosition}
        onClose={() => {
          if (!operationRef.current && !busy) setCreateModalOpen(false);
        }}
        onSubmit={createRule}
        open={createModalOpen}
      />
    </>
  );
};
