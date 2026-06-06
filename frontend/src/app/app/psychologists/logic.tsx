"use client";

import {
  BadgeCheck,
  ChevronLeft,
  ChevronRight,
  Filter,
  Search,
  SlidersHorizontal,
  Star,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { useDirectoryPsychologists } from "@/api/callers/directory";
import type {
  DirectoryCatalogItem,
  DirectoryPsychologist,
  DirectoryPsychologistsQuery,
} from "@/api/generator/types/directory";
import { EmptyState } from "@/components/ui/empty-state";
import { InlineAlert } from "@/components/ui/inline-alert";
import { LoadingState } from "@/components/ui/loading-state";
import { cn } from "@/lib/utils";
import { Button } from "@/registry/new-york-v4/ui/button";
import { PrivateTemplate } from "@/templates/private";
import {
  defaultPsychologistsFilterValues,
  type PsychologistsFilterForm,
  usePsychologistsFilterForm,
} from "./use-form";

const PAGE_LIMIT = 20;

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

const getInitials = (name: string) => {
  const parts = name.split(/\s+/).filter(Boolean);

  if (parts.length === 0) return "L";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};

const isGoogleAvatar = (avatar?: string | null) => {
  return Boolean(avatar?.startsWith("https://lh3.googleusercontent.com/"));
};

const formatRating = (ratingAvg: number, ratingCount: number) => {
  if (ratingCount <= 0) return "Sem avaliações";

  return `${(ratingAvg / 100).toFixed(1)} (${ratingCount})`;
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

function PsychologistCard({ psychologist }: { psychologist: DirectoryPsychologist }) {
  const tags = [
    ...psychologist.specialties.slice(0, 2).map((item) => item.name),
    ...psychologist.services.slice(0, 2).map((item) => item.name),
    psychologist.modality,
  ].filter(Boolean) as string[];

  return (
    <article className="overflow-hidden rounded-[var(--lectum-card-radius)] border border-border bg-surface shadow-[var(--lectum-shadow-soft)]">
      <div className="grid gap-4 p-5">
        <div className="flex items-start gap-4">
          <div className="relative grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-2xl bg-primary-soft text-lg font-bold text-primary">
            {isGoogleAvatar(psychologist.avatar) ? (
              <Image
                alt={psychologist.name}
                className="object-cover"
                fill
                sizes="64px"
                src={psychologist.avatar as string}
              />
            ) : (
              getInitials(psychologist.name)
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="flex items-center gap-1.5 text-lg font-bold leading-6 text-foreground">
                  <span className="truncate">{psychologist.name}</span>
                  {psychologist.verified ? (
                    <BadgeCheck className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                  ) : null}
                </h2>
                <p className="mt-1 text-[0.68rem] font-bold uppercase tracking-[0.28em] text-subtle">
                  Psicólogo
                </p>
              </div>

              <Link
                aria-label={`Abrir perfil de ${psychologist.name}`}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-border bg-surface text-muted transition hover:border-primary hover:text-primary"
                href={`/app/psychologist/${psychologist.id}`}
              >
                <ChevronRight className="h-5 w-5" aria-hidden="true" />
              </Link>
            </div>

            <div className="mt-2 flex items-center gap-1 text-xs font-semibold text-muted">
              <Star className="h-4 w-4 fill-warning text-warning" aria-hidden="true" />
              <span>{formatRating(psychologist.rating_avg, psychologist.rating_count)}</span>
            </div>
          </div>
        </div>

        {psychologist.headline || psychologist.bio ? (
          <p className="line-clamp-3 text-sm leading-6 text-muted">
            {psychologist.headline || psychologist.bio}
          </p>
        ) : (
          <p className="text-sm leading-6 text-muted">
            Perfil publicado na Lectum. Abra o perfil para conferir as informações disponíveis.
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          {tags.length > 0 ? (
            tags.map((tag) => (
              <span
                className="rounded-full border border-border bg-surface-muted px-3 py-1 text-xs font-semibold text-muted"
                key={tag}
              >
                {tag}
              </span>
            ))
          ) : (
            <span className="rounded-full border border-border bg-surface-muted px-3 py-1 text-xs font-semibold text-muted">
              Dados profissionais públicos
            </span>
          )}
        </div>

        <Button asChild className="w-full" variant="outline">
          <Link href={`/app/psychologist/${psychologist.id}`}>Ver perfil profissional</Link>
        </Button>
      </div>
    </article>
  );
}

export const PsychologistsLogic = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchParamsString = searchParams.toString();
  const [filtersOpen, setFiltersOpen] = useState(false);

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
  const searchFormProps = {
    ...formProps,
    fields: formProps.fields.filter((field) => field.name === "search"),
  };

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

  const submitFilters = hook.handleSubmit((values) => {
    const normalized = normalizeFormValues(values);
    hook.reset(normalized);
    navigateWithFilters(normalized, 1);
    setFiltersOpen(false);
  });

  const clearFilters = () => {
    hook.reset(defaultPsychologistsFilterValues);
    navigateWithFilters(defaultPsychologistsFilterValues, 1);
  };

  const removeFilter = (key: keyof PsychologistsFilterForm) => {
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

  const quickSpecialties = response?.filters.specialties.slice(0, 2) ?? [];
  const hasFilters = activeFilters.length > 0;
  const errorMessage = directory.isError ? resolveDirectoryErrorMessage(directory.error) : null;
  const showInitialLoading = directory.isLoading && !response;

  return (
    <PrivateTemplate>
      <section className="mx-auto grid w-full max-w-[430px] gap-5 md:max-w-3xl">
        <header className="grid gap-4">
          <div className="flex items-center justify-between gap-4">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-primary-soft text-primary">
              <UsersRound className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1 text-center">
              <p className="text-xs font-bold uppercase tracking-[0.28em] text-subtle">Lectum</p>
              <h1 className="truncate text-xl font-bold text-foreground">Encontre seu psicólogo</h1>
            </div>
            <Button
              aria-expanded={filtersOpen}
              aria-label="Abrir filtros"
              className="h-10 w-10 px-0"
              onClick={() => setFiltersOpen((current) => !current)}
              type="button"
              variant="outline"
            >
              {filtersOpen ? (
                <X className="h-5 w-5" aria-hidden="true" />
              ) : (
                <Filter className="h-5 w-5" aria-hidden="true" />
              )}
            </Button>
          </div>

          <div className="rounded-[var(--lectum-card-radius)] border border-border bg-surface p-4 shadow-[var(--lectum-shadow-soft)]">
            <Form className="grid gap-3" {...searchFormProps} onSubmit={submitFilters}>
              <div className="grid grid-cols-[1fr_auto] gap-3">
                <Button className="h-12 px-4" disabled={directory.isFetching} type="submit">
                  <Search className="h-4 w-4" aria-hidden="true" />
                  Buscar
                </Button>
              </div>
            </Form>

            <div className="mt-2 flex flex-wrap gap-2">
              <button
                className={cn(
                  "rounded-full border px-4 py-2 text-sm font-semibold transition",
                  !hasFilters
                    ? "border-primary bg-primary text-white"
                    : "border-border bg-surface text-muted hover:border-primary hover:text-primary",
                )}
                onClick={clearFilters}
                type="button"
              >
                Tudo
              </button>

              {quickSpecialties.map((item) => {
                const selected = filterValues.specialty === item.slug;

                return (
                  <button
                    className={cn(
                      "rounded-full border px-4 py-2 text-sm font-semibold transition",
                      selected
                        ? "border-primary bg-primary text-white"
                        : "border-border bg-surface text-muted hover:border-primary hover:text-primary",
                    )}
                    key={item.id}
                    onClick={() =>
                      navigateWithFilters(
                        normalizeFormValues({
                          ...filterValues,
                          specialty: selected ? null : item.slug,
                        }),
                        1,
                      )
                    }
                    type="button"
                  >
                    {item.name}
                  </button>
                );
              })}

              <button
                className={cn(
                  "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition",
                  filterValues.verified
                    ? "border-primary bg-primary text-white"
                    : "border-border bg-surface text-muted hover:border-primary hover:text-primary",
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
                type="button"
              >
                <BadgeCheck className="h-4 w-4" aria-hidden="true" />
                Verificados
              </button>
            </div>
          </div>
        </header>

        {filtersOpen ? (
          <section className="rounded-[var(--lectum-card-radius)] border border-border bg-surface p-4 shadow-[var(--lectum-shadow-soft)]">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.28em] text-subtle">Filtros</p>
                <h2 className="text-lg font-bold text-foreground">Refinar busca</h2>
              </div>
              <Button onClick={clearFilters} type="button" variant="ghost">
                Limpar
              </Button>
            </div>

            <Form className="grid gap-3" {...formProps} onSubmit={submitFilters}>
              <Button className="mt-1 w-full" disabled={directory.isFetching} type="submit">
                <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
                Aplicar filtros
                {typeof total === "number" ? (
                  <span className="rounded-full bg-white/15 px-2 py-1 text-[0.68rem]">
                    {total} resultado{total === 1 ? "" : "s"}
                  </span>
                ) : null}
              </Button>
            </Form>
          </section>
        ) : null}

        {hasFilters ? (
          <fieldset className="flex flex-wrap gap-2">
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
          <InlineAlert title="Não foi possível carregar" variant="error">
            {errorMessage}
          </InlineAlert>
        ) : null}

        {showInitialLoading ? (
          <div className="grid min-h-[40vh] place-items-center rounded-[var(--lectum-card-radius)] border border-border bg-surface shadow-[var(--lectum-shadow-soft)]">
            <LoadingState label="Carregando psicólogos" />
          </div>
        ) : null}

        {!showInitialLoading && !errorMessage ? (
          <>
            <div className="flex items-center justify-between gap-3 text-sm text-muted">
              <span>
                {total > 0
                  ? `${total} profissional${total === 1 ? "" : "is"} encontrado${total === 1 ? "" : "s"}`
                  : "Nenhum profissional publicado encontrado"}
              </span>
              {directory.isFetching ? <LoadingState label="Atualizando" /> : null}
            </div>

            {total > 0 ? (
              <InlineAlert title="Busca conectada" variant="success">
                A listagem usa somente psicólogos publicados e dados persistidos da API privada.
              </InlineAlert>
            ) : null}

            {psychologists.length > 0 ? (
              <div className="grid gap-4">
                {psychologists.map((psychologist) => (
                  <PsychologistCard key={psychologist.id} psychologist={psychologist} />
                ))}
              </div>
            ) : (
              <EmptyState
                description="Ainda não existem psicólogos publicados para estes filtros. Quando profissionais reais forem aprovados e publicados, eles aparecerão aqui."
                icon={UserRound}
                title="Nenhum psicólogo encontrado"
              />
            )}

            {pages > 1 ? (
              <nav
                aria-label="Paginação de psicólogos"
                className="flex items-center justify-between gap-3 rounded-[var(--lectum-card-radius)] border border-border bg-surface p-3"
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
