"use client";

import { ChevronLeft, ChevronRight, UserRound } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
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
import type { PsychologistsFilterForm } from "./use-form";

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
  const goToPage = (page: number) => {
    const next = new URLSearchParams();

    if (filterValues.search?.trim()) next.set("search", filterValues.search.trim());
    if (filterValues.specialty) next.set("specialty", filterValues.specialty);
    if (filterValues.service) next.set("service", filterValues.service);
    if (filterValues.approach) next.set("approach", filterValues.approach);
    if (page > 1) next.set("page", String(page));

    router.replace(next.toString() ? `/app/psychologists?${next}` : "/app/psychologists", {
      scroll: false,
    });
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
  const errorMessage = directory.isError ? resolveDirectoryErrorMessage(directory.error) : null;
  const showInitialLoading = directory.isLoading && !response;

  return (
    <PrivateTemplate allowAnonymous>
      <section className="mx-auto grid w-full max-w-[390px] gap-4 px-4 sm:max-w-[430px] sm:px-0">
        <header className="pt-2 sm:pt-4">
          <h1 className="text-[2rem] leading-tight font-extrabold tracking-tight text-foreground sm:text-[2.2rem]">
            Psicólogos
          </h1>
        </header>

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
