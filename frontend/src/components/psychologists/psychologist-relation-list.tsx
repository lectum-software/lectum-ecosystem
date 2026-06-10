"use client";

import { Heart, Search } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { usePatient } from "@/api/callers/patient";
import type { PatientRelationPsychologist, PatientRelationQuery } from "@/api/generator/types";
import { EmptyState } from "@/components/ui/empty-state";
import { InlineAlert } from "@/components/ui/inline-alert";
import { LoadingState } from "@/components/ui/loading-state";
import { getToken } from "@/hooks/cookies/token";
import { Button } from "@/registry/new-york-v4/ui/button";
import { PrivateTemplate } from "@/templates/private";
import { PsychologistCard, type PsychologistCardItem } from "./psychologist-card";

const PAGE_LIMIT = 20;

type RelationMode = "favorites";

type PsychologistRelationListProps = {
  mode: RelationMode;
};

type ApiErrorData = {
  error?: string;
  message?: string;
  status?: number;
};

type ApiError = Error & {
  data?: ApiErrorData;
};

const config = {
  favorites: {
    title: "Favoritos",
    subtitle: "",
    emptyTitle: "Nenhum favorito encontrado",
    emptyDescription:
      "Favorite psicólogos publicados na descoberta para montar sua lista pessoal com dados reais.",
    icon: Heart,
  },
} satisfies Record<RelationMode, Record<string, unknown>>;

const getPageFromParams = (params: URLSearchParams) => {
  const parsed = Number(params.get("page") || "1");

  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 1;
};

const resolveRelationErrorMessage = (error: unknown) => {
  const apiError = error as ApiError;
  const rawMessage =
    apiError?.data?.error ||
    apiError?.data?.message ||
    (error instanceof Error ? error.message : "");
  const normalized = rawMessage.toLowerCase();

  if (normalized.includes("token") || normalized.includes("sess")) {
    return "Sua sessão precisa estar ativa para carregar esta lista.";
  }

  if (normalized.includes("network") || normalized.includes("conex")) {
    return "Não foi possível conectar à API agora. Tente novamente em alguns instantes.";
  }

  return rawMessage || "Não foi possível carregar os psicólogos desta lista.";
};

export function PsychologistRelationList({ mode }: PsychologistRelationListProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [hasAuthToken] = useState(() => {
    if (typeof window === "undefined") return false;

    return Boolean(getToken());
  });
  const currentPage = useMemo(() => getPageFromParams(searchParams), [searchParams]);
  const query = useMemo<PatientRelationQuery>(
    () => ({ page: currentPage, limit: PAGE_LIMIT }),
    [currentPage],
  );
  const copy = config[mode];
  const { favoritePsychologist, favorites, unfavoritePsychologist } = usePatient({
    enableFavorites: hasAuthToken,
    enableFollows: false,
    enableProfile: false,
    favoritesQuery: query,
  });

  const activeQuery = favorites;
  const response = activeQuery.data;
  const psychologists: PatientRelationPsychologist[] = response?.data ?? [];
  const total = response?.count ?? 0;
  const pages = response?.pages ?? 0;
  const errorMessage = activeQuery.isError ? resolveRelationErrorMessage(activeQuery.error) : null;
  const showInitialLoading = activeQuery.isLoading && !response;
  const Icon = copy.icon as typeof Heart;

  const goToPage = (page: number) => {
    const next = new URLSearchParams(searchParams.toString());
    if (page > 1) next.set("page", String(page));
    else next.delete("page");

    router.replace(`/app/favorites${next.toString() ? `?${next}` : ""}`, {
      scroll: false,
    });
  };

  const toggleFavorite = (psychologist: PsychologistCardItem) => {
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

  return (
    <PrivateTemplate>
      <section className="mx-auto grid w-full max-w-[390px] gap-5 sm:max-w-[430px] lg:max-w-6xl">
        <header className="-mx-5 -mt-6 border-b border-border bg-surface px-4 py-4 sm:mx-0 sm:mt-0 sm:rounded-[28px] sm:border sm:p-6 lg:p-8">
          <div className="grid gap-3">
            <div className="flex min-w-0 items-center justify-between gap-3">
              <h1 className="text-2xl font-extrabold text-foreground lg:text-3xl">
                {copy.title as string}
              </h1>
              <span className="shrink-0 rounded-full border border-border bg-primary-soft px-3 py-1.5 text-xs font-extrabold text-primary">
                {total} perfil{total === 1 ? "" : "s"} selecionado{total === 1 ? "" : "s"}
              </span>
            </div>
            {copy.subtitle ? (
              <p className="text-sm leading-6 text-muted">{copy.subtitle as string}</p>
            ) : null}
          </div>
        </header>

        <div className="grid gap-4">
          {errorMessage ? (
            <InlineAlert title="Não foi possível carregar" variant="error">
              {errorMessage}
            </InlineAlert>
          ) : null}

          {showInitialLoading ? (
            <div className="grid min-h-[38vh] place-items-center rounded-[18px] border border-border bg-surface shadow-[var(--lectum-shadow-soft)]">
              <LoadingState label={`Carregando ${copy.title as string}`} />
            </div>
          ) : null}

          {!showInitialLoading && !errorMessage && psychologists.length === 0 ? (
            <EmptyState
              action={
                <Button asChild className="rounded-full">
                  <Link href="/app/psychologists">
                    <Search className="h-4 w-4" aria-hidden="true" />
                    Buscar psicólogos
                  </Link>
                </Button>
              }
              description={copy.emptyDescription as string}
              icon={Icon}
              title={copy.emptyTitle as string}
            />
          ) : null}

          {!showInitialLoading && !errorMessage && psychologists.length > 0 ? (
            <>
              <div className="flex items-center justify-end gap-3 text-sm text-muted">
                {activeQuery.isFetching ? <LoadingState label="Atualizando" /> : null}
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                {psychologists.map((psychologist) => (
                  <PsychologistCard
                    favoritePending={favoritePendingId === psychologist.id}
                    key={psychologist.id}
                    onToggleFavorite={toggleFavorite}
                    psychologist={psychologist}
                  />
                ))}
              </div>
            </>
          ) : null}

          {pages > 1 ? (
            <nav
              aria-label={`Paginação de ${copy.title as string}`}
              className="flex items-center justify-between gap-3 rounded-[18px] border border-border bg-surface p-3"
            >
              <Button
                disabled={currentPage <= 1 || activeQuery.isFetching}
                onClick={() => goToPage(currentPage - 1)}
                type="button"
                variant="outline"
              >
                Anterior
              </Button>

              <span className="text-sm font-semibold text-muted">
                Página {currentPage} de {pages}
              </span>

              <Button
                disabled={currentPage >= pages || activeQuery.isFetching}
                onClick={() => goToPage(currentPage + 1)}
                type="button"
                variant="outline"
              >
                Próxima
              </Button>
            </nav>
          ) : null}
        </div>
      </section>
    </PrivateTemplate>
  );
}
