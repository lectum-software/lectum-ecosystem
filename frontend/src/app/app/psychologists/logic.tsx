"use client";

import {
  ChevronLeft,
  ChevronRight,
  Info,
  Search,
  SlidersHorizontal,
  UserRound,
  X,
} from "lucide-react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { type FormEvent, useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { useDirectoryPsychologists } from "@/api/callers/directory";
import { usePatient } from "@/api/callers/patient";
import type {
  DirectoryCatalogItem,
  DirectoryPsychologistsQuery,
} from "@/api/generator/types/directory";
import {
  PsychologistCard,
  type PsychologistCardItem,
} from "@/components/psychologists/psychologist-card";
import { EmptyState } from "@/components/ui/empty-state";
import { InlineAlert } from "@/components/ui/inline-alert";
import { LoadingState } from "@/components/ui/loading-state";
import { useAppSelector } from "@/hooks/redux";
import { cn } from "@/lib/utils";
import { Button } from "@/registry/new-york-v4/ui/button";
import { Input } from "@/registry/new-york-v4/ui/input";
import { PrivateTemplate } from "@/templates/private";
import {
  defaultPsychologistsFilterValues,
  type PsychologistsFilterForm,
  usePsychologistsFilterForm,
} from "./use-form";

const PAGE_LIMIT = 20;
const QUICK_TOPIC_TAGS = ["Ansiedade", "Depressão", "Luto", "Compulsões", "Traumas"];

type ActiveFilter = {
  key: keyof PsychologistsFilterForm;
  label: string;
};

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
    verified: Boolean(values.verified),
  };
};

const readFiltersFromParams = (params: URLSearchParams): PsychologistsFilterForm => {
  return normalizeFormValues({
    search: params.get("search") || "",
    specialty: params.get("specialty"),
    service: params.get("service"),
    approach: params.get("approach"),
    verified: params.get("verified") === "true",
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
    verified: values.verified || undefined,
  };
};

const findCatalogLabel = (items: DirectoryCatalogItem[] | undefined, slug?: string | null) => {
  if (!slug) return null;

  return items?.find((item) => item.slug === slug)?.name || slug;
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

const buildActiveFilters = (
  values: PsychologistsFilterForm,
  filters?: {
    specialties: DirectoryCatalogItem[];
    services: DirectoryCatalogItem[];
    approaches: DirectoryCatalogItem[];
  },
): ActiveFilter[] => {
  const active: ActiveFilter[] = [];

  if (values.search?.trim())
    active.push({ key: "search", label: `Busca: ${values.search.trim()}` });

  const specialtyLabel = findCatalogLabel(filters?.specialties, values.specialty);
  if (specialtyLabel) active.push({ key: "specialty", label: specialtyLabel });

  const serviceLabel = findCatalogLabel(filters?.services, values.service);
  if (serviceLabel) active.push({ key: "service", label: serviceLabel });

  const approachLabel = findCatalogLabel(filters?.approaches, values.approach);
  if (approachLabel) active.push({ key: "approach", label: approachLabel });

  if (values.verified) active.push({ key: "verified", label: "Somente verificados" });

  return active;
};

export const PsychologistsLogic = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchParamsString = searchParams.toString();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const closeFiltersButtonRef = useRef<HTMLButtonElement>(null);
  const filtersTitleId = useId();
  const currentUser = useAppSelector((state) => state.user);
  const canFavoritePsychologists = currentUser?.role === "paciente";
  const { favoritePsychologist, unfavoritePsychologist } = usePatient({ enableProfile: false });

  const params = useMemo(() => new URLSearchParams(searchParamsString), [searchParamsString]);
  const filterValues = useMemo(() => readFiltersFromParams(params), [params]);
  const currentPage = useMemo(() => getPageFromParams(params), [params]);
  const query = useMemo(() => toQuery(filterValues, currentPage), [currentPage, filterValues]);

  const directory = useDirectoryPsychologists(query);
  const response = directory.data;
  const total = response?.count ?? 0;
  const pages = response?.pages ?? 0;
  const psychologists = response?.data ?? [];
  const activeFilters = useMemo(
    () => buildActiveFilters(filterValues, response?.filters),
    [filterValues, response?.filters],
  );

  const form = usePsychologistsFilterForm({
    filters: response?.filters,
    loading: directory.isLoading,
    values: filterValues,
  });
  const { Form, formProps, hook } = form;
  const filterFormProps = {
    ...formProps,
    fields: formProps.fields.filter((field) => field.name !== "search"),
  };

  useEffect(() => {
    if (!filtersOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setFiltersOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    const focusTimer = window.setTimeout(() => closeFiltersButtonRef.current?.focus(), 0);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
      window.clearTimeout(focusTimer);
    };
  }, [filtersOpen]);

  const navigateWithFilters = useCallback(
    (values: PsychologistsFilterForm, page = 1) => {
      const normalized = normalizeFormValues(values);
      const next = new URLSearchParams();

      if (normalized.search?.trim()) next.set("search", normalized.search.trim());
      if (normalized.specialty) next.set("specialty", normalized.specialty);
      if (normalized.service) next.set("service", normalized.service);
      if (normalized.approach) next.set("approach", normalized.approach);
      if (normalized.verified) next.set("verified", "true");
      if (page > 1) next.set("page", String(page));

      const queryString = next.toString();
      router.replace(queryString ? `/app/psychologists?${queryString}` : "/app/psychologists", {
        scroll: false,
      });
    },
    [router],
  );

  const submitFilters = (event: FormEvent<HTMLFormElement>) => {
    void hook.handleSubmit((values) => {
      const normalized = normalizeFormValues({
        ...values,
        search: searchInputRef.current?.value ?? values.search ?? "",
      });
      hook.reset(normalized);
      navigateWithFilters(normalized, 1);
      setFiltersOpen(false);
    })(event);
  };

  const clearFilters = () => {
    if (searchInputRef.current) {
      searchInputRef.current.value = "";
    }

    hook.reset(defaultPsychologistsFilterValues);
    navigateWithFilters(defaultPsychologistsFilterValues, 1);
  };

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const next = normalizeFormValues({
      ...filterValues,
      search: searchInputRef.current?.value || "",
    });

    hook.reset(next);
    navigateWithFilters(next, 1);
  };

  const removeFilter = (key: keyof PsychologistsFilterForm) => {
    if (key === "search" && searchInputRef.current) {
      searchInputRef.current.value = "";
    }

    const next = normalizeFormValues({
      ...filterValues,
      [key]: key === "verified" ? false : key === "search" ? "" : null,
    });

    hook.reset(next);
    navigateWithFilters(next, 1);
  };

  const goToPage = (page: number) => {
    navigateWithFilters(filterValues, page);
  };

  const toggleTopic = (topic: string) => {
    const selected = (filterValues.search || "").toLowerCase() === topic.toLowerCase();
    const next = normalizeFormValues({
      ...filterValues,
      search: selected ? "" : topic,
    });

    if (searchInputRef.current) {
      searchInputRef.current.value = next.search || "";
    }

    hook.reset(next);
    navigateWithFilters(next, 1);
  };

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
  const hasFilters = activeFilters.length > 0;
  const errorMessage = directory.isError ? resolveDirectoryErrorMessage(directory.error) : null;
  const showInitialLoading = directory.isLoading && !response;

  return (
    <PrivateTemplate>
      <section className="mx-auto grid w-full max-w-[390px] gap-0 bg-background sm:max-w-[430px] lg:max-w-6xl lg:gap-5 lg:bg-transparent">
        <header className="-mx-5 -mt-6 border-b border-border bg-surface px-4 pb-4 pt-4 sm:mx-0 sm:mt-0 sm:rounded-t-[20px] sm:border sm:border-b-0 lg:rounded-t-[28px] lg:px-8 lg:pb-4 lg:pt-8">
          <div className="relative flex min-h-12 items-center justify-center lg:justify-start lg:gap-4">
            <Image
              alt="Lectum"
              className="absolute left-0 h-8 w-8 object-contain lg:static lg:h-10 lg:w-10"
              height={40}
              priority
              src="/icon.png"
              width={40}
            />
            <div className="min-w-0 px-10 text-center lg:px-0 lg:text-left">
              <h1 className="text-lg font-extrabold text-foreground lg:text-3xl">
                Encontre seu psicólogo
              </h1>
              <p className="mt-1 hidden text-sm font-medium text-muted lg:block">
                Busque profissionais publicados, filtre por especialidade e refine a descoberta.
              </p>
            </div>
          </div>
        </header>

        <div className="-mx-5 grid gap-3 border-b border-border bg-surface-muted/70 px-4 py-4 sm:mx-0 sm:border-x lg:gap-y-3 lg:rounded-b-[28px] lg:border-b lg:px-8 lg:pb-6 lg:pt-3">
          <form className="grid grid-cols-[1fr_auto] gap-3" onSubmit={submitSearch}>
            <label className="relative block" htmlFor="directory-psychologist-search">
              <span className="sr-only">Buscar profissional</span>
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-subtle lg:left-4"
                aria-hidden="true"
              />
              <Input
                className="h-11 rounded-xl bg-surface pl-10 text-[0.95rem] lg:h-14 lg:rounded-2xl lg:pl-12 lg:text-base"
                defaultValue={filterValues.search || ""}
                disabled={directory.isFetching}
                id="directory-psychologist-search"
                key={filterValues.search || "empty-search"}
                placeholder="Buscar profissional..."
                ref={searchInputRef}
                type="search"
              />
            </label>
            <Button
              aria-controls="directory-psychologists-filters"
              aria-expanded={filtersOpen}
              className="h-11 rounded-xl border-border bg-surface px-4 text-xs uppercase tracking-wide lg:h-14 lg:rounded-2xl lg:px-6 lg:text-sm"
              disabled={directory.isFetching}
              onClick={() => setFiltersOpen(true)}
              type="button"
              variant="outline"
            >
              <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
              Filtros
            </Button>
          </form>

          <div className="flex gap-2 overflow-x-auto pb-1 lg:flex-wrap lg:overflow-visible lg:pb-0">
            {QUICK_TOPIC_TAGS.map((topic) => {
              const selected = (filterValues.search || "").toLowerCase() === topic.toLowerCase();

              return (
                <button
                  className={cn(
                    "shrink-0 rounded-full border px-4 py-2 text-sm font-bold transition",
                    selected
                      ? "border-primary bg-primary text-white"
                      : "border-border bg-surface text-muted hover:border-primary hover:text-primary",
                  )}
                  key={topic}
                  onClick={() => toggleTopic(topic)}
                  type="button"
                >
                  {topic}
                </button>
              );
            })}
          </div>

          <div className="-mx-4 -mb-4 mt-1 flex items-center justify-between border-t border-border bg-surface px-4 py-3 lg:mx-0 lg:mb-0 lg:mt-0 lg:rounded-2xl lg:border lg:border-border lg:px-4 lg:py-3">
            <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-foreground">
              Somente verificados
              <Info className="h-3.5 w-3.5 text-subtle" aria-hidden="true" />
            </span>
            <button
              aria-checked={filterValues.verified}
              aria-label="Filtrar somente psicólogos verificados"
              className={cn(
                "relative h-8 w-14 rounded-full border border-border bg-border transition",
                filterValues.verified && "border-primary bg-primary",
              )}
              onClick={() =>
                navigateWithFilters(
                  normalizeFormValues({
                    ...filterValues,
                    verified: !filterValues.verified,
                  }),
                  1,
                )
              }
              role="switch"
              type="button"
            >
              <span
                className={cn(
                  "absolute left-1 top-1 h-6 w-6 rounded-full bg-surface shadow-sm transition",
                  filterValues.verified && "translate-x-6",
                )}
              />
            </button>
          </div>
        </div>

        {filtersOpen ? (
          <div className="fixed inset-0 z-50 flex items-end bg-slate-950/45 backdrop-blur-sm sm:items-center sm:justify-center sm:p-6">
            <button
              aria-label="Fechar filtros"
              className="absolute inset-0 cursor-default"
              onClick={() => setFiltersOpen(false)}
              type="button"
            />
            <section
              aria-labelledby={filtersTitleId}
              aria-modal="true"
              className="relative z-10 grid max-h-[100dvh] w-full gap-5 overflow-y-auto bg-background px-4 pb-5 pt-4 shadow-2xl sm:max-h-[min(760px,calc(100dvh-3rem))] sm:max-w-[520px] sm:rounded-[28px] sm:border sm:border-border sm:px-6 sm:pb-6 sm:pt-5"
              id="directory-psychologists-filters"
              role="dialog"
            >
              <div className="sticky top-0 z-10 -mx-4 -mt-4 flex items-center justify-between gap-4 border-b border-border bg-background/95 px-4 py-4 backdrop-blur sm:-mx-6 sm:-mt-5 sm:px-6">
                <div className="flex min-w-0 items-center gap-3">
                  <button
                    aria-label="Fechar filtros"
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-muted transition hover:bg-primary-soft hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                    onClick={() => setFiltersOpen(false)}
                    ref={closeFiltersButtonRef}
                    type="button"
                  >
                    <X className="h-5 w-5" aria-hidden="true" />
                  </button>
                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-[0.28em] text-subtle">
                      Filtros
                    </p>
                    <h2
                      className="truncate text-xl font-extrabold text-foreground"
                      id={filtersTitleId}
                    >
                      Refinar busca
                    </h2>
                  </div>
                </div>

                <Button
                  className="h-10 px-2 text-primary hover:text-primary"
                  onClick={clearFilters}
                  type="button"
                  variant="ghost"
                >
                  Limpar
                </Button>
              </div>

              <p className="text-sm leading-6 text-muted">
                Ajuste os filtros avançados sem sair da listagem. No desktop, a busca continua
                visível ao fundo e esta janela concentra o refinamento.
              </p>

              <Form className="grid gap-3" {...filterFormProps} onSubmit={submitFilters}>
                <div className="sticky bottom-0 -mx-4 -mb-5 mt-2 border-t border-border bg-background/95 p-4 backdrop-blur sm:-mx-6 sm:-mb-6 sm:p-6">
                  <Button
                    className="w-full rounded-xl"
                    disabled={directory.isFetching}
                    type="submit"
                  >
                    <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
                    Aplicar filtros
                    {typeof total === "number" ? (
                      <span className="rounded-full bg-white/15 px-2 py-1 text-[0.68rem]">
                        {total} resultado{total === 1 ? "" : "s"}
                      </span>
                    ) : null}
                  </Button>
                </div>
              </Form>
            </section>
          </div>
        ) : null}

        {hasFilters ? (
          <fieldset className="mt-4 flex flex-wrap gap-2 lg:mt-0">
            <legend className="sr-only">Filtros ativos</legend>
            {activeFilters.map((item) => (
              <button
                className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary-soft px-3 py-1.5 text-xs font-semibold text-primary"
                key={`${item.key}-${item.label}`}
                onClick={() => removeFilter(item.key)}
                type="button"
              >
                {item.label}
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            ))}
          </fieldset>
        ) : null}

        {errorMessage ? (
          <InlineAlert className="mt-4 lg:mt-0" title="Não foi possível carregar" variant="error">
            {errorMessage}
          </InlineAlert>
        ) : null}

        {showInitialLoading ? (
          <div className="mt-4 grid min-h-[40vh] place-items-center rounded-[18px] border border-border bg-surface shadow-[var(--lectum-shadow-soft)] lg:mt-0">
            <LoadingState label="Carregando psicólogos" />
          </div>
        ) : null}

        {!showInitialLoading && !errorMessage ? (
          <>
            <div className="mt-4 flex items-center justify-between gap-3 text-sm text-muted lg:mt-0">
              <span>
                {total > 0
                  ? `${total} profissional${total === 1 ? "" : "is"} encontrado${total === 1 ? "" : "s"}`
                  : "Nenhum profissional publicado encontrado"}
              </span>
              {directory.isFetching ? <LoadingState label="Atualizando" /> : null}
            </div>

            {psychologists.length > 0 ? (
              <div className="mt-4 grid gap-6 lg:grid-cols-2">
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
                className="mt-4"
                description="Ainda não existem psicólogos publicados para estes filtros. Quando profissionais reais forem aprovados e publicados, eles aparecerão aqui."
                icon={UserRound}
                title="Nenhum psicólogo encontrado"
              />
            )}

            {pages > 1 ? (
              <nav
                aria-label="Paginação de psicólogos"
                className="mt-4 flex items-center justify-between gap-3 rounded-[18px] border border-border bg-surface p-3 lg:col-span-2"
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
