"use client";

import {
  ChevronDown,
  Edit3,
  Loader2,
  Plus,
  SlidersHorizontal,
  ToggleLeft,
  ToggleRight,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CatalogModal, DeleteCatalogModal } from "../components/catalog-modals";
import {
  CatalogRow,
  DragHandle,
  EmptyState,
  ExpandToggle,
  SettingsHeader,
  StatusBadge,
} from "../components/catalog-row";
import { useAdminSettingsController } from "../hooks/use-admin-settings-controller";
import {
  CATALOG_SECTIONS,
  cardClass,
  getErrorMessage,
  orderedIds,
  sameScope,
  singularLabel,
} from "../modules/catalog-support";

export const AdminSettingsClient = () => {
  const controller = useAdminSettingsController();
  const {
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
  } = controller;

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
                  onDelete={() => setDeleteModal({ item, kind: "item", type: section.type })}
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
      <SettingsHeader />

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-8">
        {[
          ["Especialidades", counts.specialties],
          ["Abordagens", counts.approaches],
          ["Serviços", counts.services],
          ["Idiomas", counts.languages],
          ["Públicos", counts.targetAudiences],
          ["Gênero", counts.genders],
          ["Raça", counts.raceColors],
          ["Religião", counts.religions],
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
                    <span className="rounded-full bg-primary-soft px-2.5 py-1 text-xs font-bold text-primary">
                      {counts.specialties} opções
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-muted">
                    Especialidades usadas nos filtros e no perfil profissional, organizadas por
                    categoria.
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
                                  ? "border-warning-border bg-warning-soft text-warning hover:bg-warning-soft"
                                  : "border-success-border bg-success-soft text-success hover:bg-success-soft",
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
                            <button
                              aria-label={`Excluir ${category.name}`}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-danger/25 bg-danger/5 text-danger transition hover:bg-danger/10 disabled:opacity-50"
                              disabled={isMutating}
                              onClick={() => setDeleteModal({ category, kind: "category" })}
                              title={`Excluir ${category.name}`}
                              type="button"
                            >
                              <Trash2 className="h-4 w-4" />
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
                                  onDelete={() =>
                                    setDeleteModal({ item, kind: "item", type: "specialty" })
                                  }
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
      {deleteModal ? (
        <DeleteCatalogModal
          onClose={() => setDeleteModal(null)}
          onSubmit={deleteCatalog}
          state={deleteModal}
          submitting={deleteCategory.isPending || deleteItem.isPending}
        />
      ) : null}
    </div>
  );
};
