"use client";

import { ChevronLeft, ChevronRight, Search, UserRound, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDirectoryPsychologists } from "@/api/callers/directory";
import { usePatient } from "@/api/callers/patient";
import type { DirectoryPsychologistsQuery } from "@/api/generator/types/directory";
import {
  PsychologistCard,
  type PsychologistCardItem,
} from "@/components/psychologists/psychologist-card";
import { EmptyState } from "@/components/ui/empty-state";
import { InlineAlert } from "@/components/ui/inline-alert";
import { LoadingState } from "@/components/ui/loading-state";
import { getToken } from "@/hooks/cookies/token";
import { useAppSelector } from "@/hooks/redux";
import { Button } from "@/registry/new-york-v4/ui/button";
import { PrivateTemplate } from "@/templates/private";
import {
  defaultPsychologistsFilterValues,
  type PsychologistsFilterForm,
  usePsychologistsFilterForm,
} from "./use-form";

const PAGE_LIMIT = 20;

type ApiErrorData = {
  error?: string;
  message?: string;
  status?: number;
};

type ApiError = Error & {
  data?: ApiErrorData;
};

const normalizeNullable = (value?: string | null) => {
  return value?.trim() ? value : null;
};

const normalizeFormValues = (values: Partial<PsychologistsFilterForm>): PsychologistsFilterForm => {
  return {
    search: values.search?.trim() || "",
    specialty: normalizeNullable(values.specialty),
    service: normalizeNullable(values.service),
    approach: normalizeNullable(values.approach),
  };
};

const readFiltersFromParams = (params: URLSearchParams): PsychologistsFilterForm => {
  return normalizeFormValues({
    search: params.get("search") || "",
    specialty: params.get("specialty"),
    service: params.get("service"),
    approach: params.get("approach"),
  });
};

const getPageFromParams = (params: URLSearchParams) => {
  const parsed = Number(params.get("page") || "1");

  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 1;
};

const toQuery = (values: PsychologistsFilterForm, page: number): DirectoryPsychologistsQuery => {
  return {
    page,
    limit: PAGE_LIMIT,
    search: values.search?.trim() || undefined,
    specialty: values.specialty || undefined,
    service: values.service || undefined,
    approach: values.approach || undefined,
  };
};

const buildFiltersParams = (values: PsychologistsFilterForm, page = 1) => {
  const normalized = normalizeFormValues(values);
  const next = new URLSearchParams();

  if (normalized.search?.trim()) next.set("search", normalized.search.trim());
  if (normalized.specialty) next.set("specialty", normalized.specialty);
  if (normalized.service) next.set("service", normalized.service);
  if (normalized.approach) next.set("approach", normalized.approach);
  if (page > 1) next.set("page", String(page));

  return next;
};

const resolveDirectoryErrorMessage = (error: unknown) => {
  const apiError = error as ApiError;
  const rawMessage =
    apiError?.data?.error ||
    apiError?.data?.message ||
    (error instanceof Error ? error.message : "");
  const normalized = rawMessage.toLowerCase();

  if (normalized.includes("token") || normalized.includes("sess")) {
    return "Sua sessão precisa estar ativa para consultar psicólogos.";
  }

  if (normalized.includes("network") || normalized.includes("conex")) {
    return "Não foi possível conectar à API agora. Tente novamente em alguns instantes.";
  }

  return rawMessage || "Não foi possível carregar a listagem de psicólogos.";
};

export const PsychologistsLogic = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchParamsString = searchParams.toString();
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const filterDialogRef = useRef<HTMLDivElement>(null);
  const [hasAuthToken] = useState(() => {
    if (typeof window === "undefined") return false;

    return Boolean(getToken());
  });
  const currentUser = useAppSelector((state) => state.user);
  const canFavoritePsychologists = Boolean(hasAuthToken && currentUser?.id);
  const { favoritePsychologist, unfavoritePsychologist } = usePatient({ enableProfile: false });

  const params = useMemo(() => new URLSearchParams(searchParamsString), [searchParamsString]);
  const filterValues = useMemo(() => readFiltersFromParams(params), [params]);
  const currentPage = useMemo(() => getPageFromParams(params), [params]);
  const query = useMemo(() => toQuery(filterValues, currentPage), [currentPage, filterValues]);

  const directory = useDirectoryPsychologists(query);
  const response = directory.data;
  const pages = response?.pages ?? 0;
  const psychologists = response?.data ?? [];
  const hasActiveFilters =
    Boolean(filterValues.search?.trim()) ||
    Boolean(filterValues.specialty) ||
    Boolean(filterValues.service) ||
    Boolean(filterValues.approach);

  const filters = usePsychologistsFilterForm({
    filters: response?.filters,
    loading: directory.isLoading || directory.isFetching,
    values: filterValues,
  });

  const goToPage = (page: number) => {
    const next = buildFiltersParams(filterValues, page);

    router.replace(next.toString() ? `/app/psychologists?${next}` : "/app/psychologists", {
      scroll: false,
    });
  };

  const applyFilterValues = (values: PsychologistsFilterForm) => {
    const next = buildFiltersParams(normalizeFormValues(values), 1);

    router.replace(next.toString() ? `/app/psychologists?${next}` : "/app/psychologists", {
      scroll: false,
    });
  };

  const handleSubmitFilters = filters.hook.handleSubmit((values) => {
    applyFilterValues(values);
    setIsFiltersOpen(false);
  });

  const clearFilters = () => {
    filters.hook.reset(defaultPsychologistsFilterValues);
    applyFilterValues(defaultPsychologistsFilterValues);
    setIsFiltersOpen(false);
  };

  const handleFiltersOpen = useCallback(() => {
    setIsFiltersOpen(true);
  }, []);

  const handleFiltersClose = useCallback(() => {
    filters.hook.reset(filterValues);
    setIsFiltersOpen(false);
  }, [filterValues, filters.hook]);

  useEffect(() => {
    if (!isFiltersOpen) return;

    const timer = setTimeout(() => {
      filterDialogRef.current?.focus();
    }, 0);

    return () => clearTimeout(timer);
  }, [isFiltersOpen]);

  useEffect(() => {
    if (!isFiltersOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        handleFiltersClose();
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [handleFiltersClose, isFiltersOpen]);

  const toggleFavorite = (psychologist: PsychologistCardItem) => {
    if (!canFavoritePsychologists) return;

    if (psychologist.favorited) {
      unfavoritePsychologist.mutate(psychologist.id);
      return;
    }

    favoritePsychologist.mutate(psychologist.id);
  };

  const favoritePendingId =
    favoritePsychologist.isPending && typeof favoritePsychologist.variables === "string"
      ? favoritePsychologist.variables
      : unfavoritePsychologist.isPending && typeof unfavoritePsychologist.variables === "string"
        ? unfavoritePsychologist.variables
        : null;
  const errorMessage = directory.isError ? resolveDirectoryErrorMessage(directory.error) : null;
  const showInitialLoading = directory.isLoading && !response;

  return (
    <PrivateTemplate allowAnonymous>
      <section className="mx-auto grid w-full max-w-[390px] gap-4 px-4 sm:max-w-[430px] sm:px-0">
        <header className="-mx-5 -mt-6 border-b border-border bg-surface px-4 py-4 sm:mx-0 sm:mt-0 sm:rounded-[28px] sm:border sm:p-6 lg:p-8">
          <div className="grid gap-3">
            <div className="flex min-w-0 items-center justify-between gap-3">
              <h1 className="text-2xl font-extrabold text-foreground lg:text-3xl">Psicólogos</h1>
              <button
                aria-label="Abrir filtros"
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-border bg-primary-soft text-primary transition hover:bg-primary/15"
                onClick={handleFiltersOpen}
                type="button"
              >
                <Search className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            {hasActiveFilters ? (
              <p className="text-sm leading-6 text-muted">
                Filtros ativos aplicados. Clique na lupa para ajustar.
              </p>
            ) : null}
          </div>
        </header>

        {isFiltersOpen ? (
          <div
            aria-labelledby="psychologist-filters-title"
            aria-modal="true"
            className="fixed inset-0 z-50 grid place-items-center bg-foreground/50 p-4 backdrop-blur-sm"
            onMouseDown={handleFiltersClose}
            role="dialog"
          >
            <div
              className="grid w-full max-w-[500px] gap-4 rounded-[28px] border border-border bg-surface p-5 shadow-[0_24px_70px_rgb(15_23_42_/_26%)]"
              onMouseDown={(event) => event.stopPropagation()}
              ref={filterDialogRef}
              role="document"
              tabIndex={-1}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2
                    className="text-lg font-extrabold text-foreground"
                    id="psychologist-filters-title"
                  >
                    Filtros de busca
                  </h2>
                  <p className="mt-1 text-sm leading-6 text-muted">
                    Ajuste os critérios e aplique para refinar sua busca.
                  </p>
                </div>
                <button
                  aria-label="Fechar filtros"
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-muted transition hover:bg-surface-muted hover:text-foreground"
                  onClick={handleFiltersClose}
                  type="button"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>

              <form onSubmit={handleSubmitFilters}>
                <filters.Form {...filters.formProps} />
                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:justify-end">
                  <Button onClick={clearFilters} type="button" variant="outline">
                    Limpar filtros
                  </Button>
                  <Button type="submit">Aplicar filtros</Button>
                </div>
              </form>
            </div>
          </div>
        ) : null}

        {errorMessage ? (
          <InlineAlert className="" title="Não foi possível carregar" variant="error">
            {errorMessage}
          </InlineAlert>
        ) : null}

        {showInitialLoading ? (
          <div className="grid min-h-[42vh] place-items-center rounded-[18px] border border-border bg-surface shadow-[var(--lectum-shadow-soft)]">
            <LoadingState label="Carregando psicólogos" />
          </div>
        ) : null}

        {!showInitialLoading && !errorMessage ? (
          <>
            {directory.isFetching ? (
              <div className="flex items-center justify-end text-sm text-muted">
                <LoadingState label="Atualizando" />
              </div>
            ) : null}

            {psychologists.length > 0 ? (
              <div className="grid gap-6">
                {psychologists.map((psychologist) => (
                  <PsychologistCard
                    canFavorite={canFavoritePsychologists}
                    favoritePending={favoritePendingId === psychologist.id}
                    key={psychologist.id}
                    onToggleFavorite={toggleFavorite}
                    psychologist={psychologist}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                className="mt-0"
                description="Ainda não existem psicólogos publicados para estes filtros. Quando profissionais reais forem aprovados e publicados, eles aparecerão aqui."
                icon={UserRound}
                title="Nenhum psicólogo encontrado"
              />
            )}

            {pages > 1 ? (
              <nav
                aria-label="Paginação de psicólogos"
                className="mt-4 flex items-center justify-between gap-3 rounded-[18px] border border-border bg-surface p-3"
              >
                <Button
                  disabled={currentPage <= 1 || directory.isFetching}
                  onClick={() => goToPage(currentPage - 1)}
                  type="button"
                  variant="outline"
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                  Anterior
                </Button>

                <span className="text-sm font-semibold text-muted">
                  Página {currentPage} de {pages}
                </span>

                <Button
                  disabled={currentPage >= pages || directory.isFetching}
                  onClick={() => goToPage(currentPage + 1)}
                  type="button"
                  variant="outline"
                >
                  Próxima
                  <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </Button>
              </nav>
            ) : null}
          </>
        ) : null}
      </section>
    </PrivateTemplate>
  );
};
