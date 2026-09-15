"use client";

import { type PointerEvent, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  useAdminSettingsCatalogs,
  useAdminSettingsCreateCatalogItem,
  useAdminSettingsCreateSpecialtyCategory,
  useAdminSettingsDeleteCatalogItem,
  useAdminSettingsDeleteSpecialtyCategory,
  useAdminSettingsReorderCatalog,
  useAdminSettingsUpdateCatalogItem,
  useAdminSettingsUpdateSpecialtyCategory,
} from "@/api/callers/settings";
import type {
  AdminSettingsCatalogOption,
  AdminSettingsCatalogType,
  AdminSettingsSpecialty,
  AdminSettingsSpecialtyCategory,
} from "@/api/req/settings";
import {
  applyOptimisticOrder,
  type CatalogDeleteModalState,
  type CatalogDragInput,
  type CatalogDragSession,
  type CatalogDragState,
  type CatalogForm,
  type CatalogModalState,
  catalogScopeKey,
  getErrorMessage,
  isCatalogDragBlockedTarget,
  isCatalogDragCurrentCardTarget,
  isCatalogDragHandleTarget,
  isCatalogNestedDragScopeTarget,
  type ListCatalogType,
  type MutableCatalogType,
  measureCatalogCards,
  reorderIds,
  resolveCatalogSlotSize,
  resolveCatalogTargetIndex,
  type SettingsSectionId,
  sameScope,
} from "../modules/catalog-support";

export const useAdminSettingsController = () => {
  const catalogs = useAdminSettingsCatalogs();
  const createCategory = useAdminSettingsCreateSpecialtyCategory();
  const updateCategory = useAdminSettingsUpdateSpecialtyCategory();
  const deleteCategory = useAdminSettingsDeleteSpecialtyCategory();
  const createItem = useAdminSettingsCreateCatalogItem();
  const updateItem = useAdminSettingsUpdateCatalogItem();
  const deleteItem = useAdminSettingsDeleteCatalogItem();
  const reorder = useAdminSettingsReorderCatalog();
  const [modal, setModal] = useState<CatalogModalState | null>(null);
  const [deleteModal, setDeleteModal] = useState<CatalogDeleteModalState | null>(null);
  const [dragging, setDragging] = useState<CatalogDragState | null>(null);
  const [optimisticOrders, setOptimisticOrders] = useState<Record<string, string[]>>({});
  const [openCategoryIds, setOpenCategoryIds] = useState<Record<string, boolean>>({});
  const [openSections, setOpenSections] = useState<Record<SettingsSectionId, boolean>>({
    approach: false,
    gender: false,
    language: false,
    race_color: false,
    religion: false,
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
    deleteCategory.isPending ||
    createItem.isPending ||
    updateItem.isPending ||
    deleteItem.isPending ||
    reorder.isPending;
  const counts = useMemo(
    () => ({
      approaches: data?.approaches.length ?? 0,
      genders: data?.genders.length ?? 0,
      languages: data?.languages.length ?? 0,
      raceColors: data?.race_colors.length ?? 0,
      religions: data?.religions.length ?? 0,
      services: data?.services.length ?? 0,
      specialties: categories.reduce((total, category) => total + category.specialties.length, 0),
      targetAudiences: data?.target_audiences.length ?? 0,
    }),
    [categories, data],
  );
  const itemsByType: Record<ListCatalogType, AdminSettingsCatalogOption[]> = {
    approach: data?.approaches ?? [],
    gender: data?.genders ?? [],
    language: data?.languages ?? [],
    race_color: data?.race_colors ?? [],
    religion: data?.religions ?? [],
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

  const deleteCatalog = async (confirmation: string) => {
    if (!deleteModal) return;

    try {
      if (deleteModal.kind === "category") {
        await deleteCategory.mutateAsync({
          id: deleteModal.category.id,
          input: { confirmation: confirmation.trim().toUpperCase() },
        });
      } else {
        await deleteItem.mutateAsync({
          id: deleteModal.item.id,
          input: { confirmation: confirmation.trim().toUpperCase() },
          type: deleteModal.type,
        });
      }

      toast.success("Catálogo excluído");
      setOptimisticOrders({});
      setDeleteModal(null);
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

  return {
    cancelCatalogPointerDrag,
    catalogs,
    categories,
    counts,
    createCategory,
    createItem,
    deleteCatalog,
    deleteCategory,
    deleteItem,
    deleteModal,
    dragging,
    getOptimisticItems,
    handleCatalogPointerEnd,
    handleCatalogPointerMove,
    isMutating,
    itemsByType,
    modal,
    openCategoryIds,
    openSections,
    resolveCatalogTransform,
    setDeleteModal,
    setModal,
    startCatalogDrag,
    submitModal,
    toggleCategory,
    toggleCategoryOpen,
    toggleItem,
    toggleSection,
    updateCategory,
    updateItem,
  };
};

export type AdminSettingsController = ReturnType<typeof useAdminSettingsController>;
