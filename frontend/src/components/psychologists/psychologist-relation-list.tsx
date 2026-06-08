"use client";

import { ArrowLeft, BellRing, Heart, Search } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { usePatient } from "@/api/callers/patient";
import type { PatientRelationPsychologist, PatientRelationQuery } from "@/api/generator/types";
import { EmptyState } from "@/components/ui/empty-state";
import { InlineAlert } from "@/components/ui/inline-alert";
import { LoadingState } from "@/components/ui/loading-state";
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
    subtitle: "Psicólogos salvos para acessar rapidamente quando precisar.",
    emptyTitle: "Nenhum favorito encontrado",
    emptyDescription:
      "Favorite psicólogos publicados na descoberta para montar sua lista pessoal com dados reais.",
    icon: Heart,
    countLabel: "Perfis favoritos",
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
  const currentPage = useMemo(() => getPageFromParams(searchParams), [searchParams]);
  const query = useMemo<PatientRelationQuery>(
    () => ({ page: currentPage, limit: PAGE_LIMIT }),
    [currentPage],
  );
  const copy = config[mode];
  const { favoritePsychologist, favorites, unfavoritePsychologist } = usePatient({
    enableFavorites: true,
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
          <div className="flex items-center gap-3">
            <Link
              aria-label="Voltar para psicólogos"
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-muted transition hover:bg-primary-soft hover:text-primary"
              href="/app/psychologists"
            >
              <ArrowLeft className="h-5 w-5" aria-hidden="true" />
            </Link>
            <div className="min-w-0">
              <p className="text-xs font-extrabold uppercase tracking-[0.26em] text-subtle">
                Minha lista
              </p>
              <h1 className="text-2xl font-extrabold text-foreground lg:text-3xl">
                {copy.title as string}
              </h1>
              <p className="mt-1 text-sm leading-6 text-muted">{copy.subtitle as string}</p>
            </div>
          </div>

          <p className="mt-5 rounded-2xl border border-border bg-surface-muted px-4 py-3 text-sm leading-6 text-muted">
            A Lectum não possui seguir psicólogos: pacientes salvam favoritos e, futuramente,
            seguirão comunidades.
          </p>
        </header>

        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(240px,320px)] lg:items-start">
          <div className="rounded-[var(--lectum-card-radius)] border border-border bg-surface p-4 shadow-[var(--lectum-shadow-soft)] lg:order-2 lg:sticky lg:top-5">
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-full bg-primary-soft text-primary">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-subtle">
                  {copy.countLabel as string}
                </p>
                <p className="text-2xl font-extrabold text-foreground">{total}</p>
              </div>
            </div>
            <div className="mt-4 rounded-2xl border border-border bg-surface-muted p-3 text-sm leading-6 text-muted">
              <BellRing className="mr-2 inline h-4 w-4 text-primary" aria-hidden="true" />
              As alterações são persistidas e refletidas imediatamente na descoberta.
            </div>
          </div>

          <div className="grid gap-4 lg:order-1">
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
                <div className="flex items-center justify-between gap-3 text-sm text-muted">
                  <span>
                    {total} profissional{total === 1 ? "" : "is"} encontrado
                    {total === 1 ? "" : "s"}
                  </span>
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
        </div>
      </section>
    </PrivateTemplate>
  );
}
