"use client";

import { useQueries } from "@tanstack/react-query";
import { Heart, Loader2, Sparkles } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { type MouseEvent, useMemo, useState } from "react";
import keys from "@/api/cache/keys";
import { usePatient } from "@/api/callers/patient";
import { getSafeApiErrorMessage } from "@/api/errors";
import type { PatientRelationPsychologist, PatientRelationQuery } from "@/api/generator/types";
import { getFavoritePsychologists } from "@/api/req/patient";
import {
  getPsychologistWhatsappDisplayName,
  PsychologistWhatsAppButtonContent,
  PsychologistWhatsAppRedirectButton,
} from "@/components/psychologists/psychologist-whatsapp-redirect-button";
import { EmptyState } from "@/components/ui/empty-state";
import { InlineAlert } from "@/components/ui/inline-alert";
import { LoadingState } from "@/components/ui/loading-state";
import { VerifiedBadgeIcon } from "@/components/ui/verified-badge";
import { getToken } from "@/hooks/cookies/token";
import { cn } from "@/lib/utils";
import { Button } from "@/registry/new-york-v4/ui/button";
import { PrivateTemplate } from "@/templates/private";
import { isPublicMediaUrl, resolvePublicMediaUrl } from "@/utils/media";
import { normalizeProfessionalDisplayName } from "@/utils/professional-name";

const PAGE_LIMIT = 20;
const FAVORITES_HEADER_DESCRIPTION =
  "Profissionais que voc\u00ea salvou para comparar e conversar quando quiser.";

type RelationMode = "favorites";

type PsychologistRelationListProps = {
  mode: RelationMode;
};

type FavoriteFilterKey =
  | "all"
  | "available_today"
  | "accepts_insurance"
  | "discount_first_session"
  | "social_value"
  | "more_experienced";

type FavoriteFilterQuery = Partial<
  Pick<
    PatientRelationQuery,
    | "available_today"
    | "accepts_insurance"
    | "discount_first_session"
    | "social_value"
    | "more_experienced"
  >
>;

const FAVORITE_FILTER_PARAM_KEYS: Exclude<FavoriteFilterKey, "all">[] = [
  "available_today",
  "accepts_insurance",
  "discount_first_session",
  "social_value",
  "more_experienced",
];

const FAVORITE_FILTER_CHIPS = [
  {
    key: "all",
    label: "Todos",
  },
  {
    key: "available_today",
    label: "Disponível hoje",
  },
  {
    key: "accepts_insurance",
    label: "Convênio",
  },
  {
    key: "discount_first_session",
    label: "Desconto 1ª Sessão",
  },
  {
    key: "social_value",
    label: "Valor social",
  },
  {
    key: "more_experienced",
    label: "Mais experientes",
  },
] satisfies { key: FavoriteFilterKey; label: string }[];

const getActiveFavoriteFilter = (params: URLSearchParams): FavoriteFilterKey => {
  for (const key of FAVORITE_FILTER_PARAM_KEYS) {
    if (params.get(key) === "true") return key;
  }

  return "all";
};

const favoriteFilterQuery = (key: FavoriteFilterKey): FavoriteFilterQuery => {
  if (key === "all") return {};

  return {
    [key]: true,
  };
};

const favoriteCountQuery = (key: FavoriteFilterKey): PatientRelationQuery => ({
  page: 1,
  limit: 1,
  ...favoriteFilterQuery(key),
});

const formatFavoriteChipCount = (count?: number) => {
  if (typeof count !== "number") return "…";

  return String(count);
};

const favoriteFilterChipClassName = (active: boolean) =>
  cn(
    "group inline-flex h-8 min-h-8 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-full border px-3 text-xs font-bold leading-none tracking-[-0.01em] shadow-none transition-[background-color,border-color,color,transform] duration-200 active:scale-[0.99]",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20",
    active
      ? "border-primary bg-primary text-primary-foreground hover:bg-primary/95 dark:border-primary dark:bg-primary dark:text-primary-foreground"
      : "border-border bg-surface text-muted hover:border-border hover:bg-surface-muted hover:text-foreground dark:border-border dark:bg-surface/70 dark:text-muted dark:hover:bg-surface-muted/70 dark:hover:text-foreground",
  );

const favoriteFilterCountClassName =
  "inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-primary-soft px-1 text-xs font-bold leading-none text-primary";

const config = {
  favorites: {
    title: "Favoritos",
    emptyTitle: "Você ainda não possui favoritos",
    emptyDescription:
      "Explore psicólogos, toque no coração dos perfis que combinam com você e eles aparecerão aqui.",
    icon: Heart,
  },
} satisfies Record<RelationMode, Record<string, unknown>>;

const getPageFromParams = (params: URLSearchParams) => {
  const parsed = Number(params.get("page") || "1");

  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 1;
};

const resolveRelationErrorMessage = (error: unknown) => {
  const rawMessage = getSafeApiErrorMessage(error, "");
  const normalized = rawMessage.toLowerCase();

  if (normalized.includes("token") || normalized.includes("sess")) {
    return "Sua sessão precisa estar ativa para carregar seus favoritos.";
  }

  if (normalized.includes("network") || normalized.includes("conex")) {
    return "Não foi possível conectar ao serviço agora. Tente novamente em alguns instantes.";
  }

  return rawMessage || "Não foi possível carregar seus psicólogos favoritos.";
};

const getInitials = (name: string) => {
  const parts = name.split(/\s+/).filter(Boolean);

  if (parts.length === 0) return "L";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};

const getContactProfession = (gender?: string | null) => {
  return gender?.toLowerCase() === "feminino" ? "Psic\u00f3loga" : "Psic\u00f3logo";
};

const getFavoriteBio = (psychologist: PatientRelationPsychologist) => {
  const headline = psychologist.headline?.trim();
  if (headline) return headline;

  const bio = psychologist.bio?.trim().replace(/\s+/g, " ");
  if (bio) return bio;

  const specialties = psychologist.specialties
    .map((specialty) => specialty.name.trim())
    .filter(Boolean)
    .slice(0, 2)
    .join(" • ");

  return specialties || getContactProfession(psychologist.gender);
};

const FavoritePageHeader = () => (
  <header className="overflow-hidden rounded-[var(--lectum-card-radius)] border border-border bg-surface shadow-[var(--lectum-shadow-soft)]">
    <div className="grid justify-items-center bg-surface px-6 py-8 text-center dark:bg-surface">
      <span className="grid h-28 w-28 place-items-center overflow-hidden rounded-full border-4 border-media-foreground bg-primary-soft text-primary shadow-[var(--lectum-shadow-soft)] dark:border-surface dark:bg-primary/15">
        <Heart className="h-11 w-11" aria-hidden="true" strokeWidth={1.85} />
      </span>

      <div className="mt-5 min-w-0">
        <h1 className="text-2xl font-bold leading-7 text-foreground">Favoritos</h1>
        <p className="mx-auto mt-2 max-w-[34rem] text-sm leading-5 text-muted">
          {FAVORITES_HEADER_DESCRIPTION}
        </p>
      </div>
    </div>
  </header>
);

const FavoriteFilterChips = ({
  activeFilter,
  counts,
  onSelect,
}: {
  activeFilter: FavoriteFilterKey;
  counts: Partial<Record<FavoriteFilterKey, number>>;
  onSelect: (filter: FavoriteFilterKey) => void;
}) => {
  return (
    <nav
      aria-label="Filtros dos favoritos"
      className="w-full max-w-full overflow-x-auto scroll-smooth overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      <div className="flex min-w-max items-center gap-1.5 py-1 pr-2">
        {FAVORITE_FILTER_CHIPS.map((chip) => {
          const active = activeFilter === chip.key;

          return (
            <button
              aria-pressed={active}
              className={favoriteFilterChipClassName(active)}
              key={chip.key}
              onClick={() => onSelect(chip.key)}
              type="button"
            >
              <span className="whitespace-nowrap text-xs font-bold leading-none">{chip.label}</span>
              <span className={favoriteFilterCountClassName}>
                {formatFavoriteChipCount(counts[chip.key])}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

const FavoriteCoverMedia = ({ psychologist }: { psychologist: PatientRelationPsychologist }) => {
  const avatarSrc = resolvePublicMediaUrl(psychologist.avatar);
  const coverSrc =
    [psychologist.cover_image_url, psychologist.video_cover_url]
      .map((value) => resolvePublicMediaUrl(value))
      .find((value) => value && value !== avatarSrc) ?? null;
  const coverIsPublic = isPublicMediaUrl(coverSrc);

  if (!coverSrc) {
    return (
      <div
        aria-hidden="true"
        className="h-full w-full bg-gradient-to-br from-primary-soft via-surface to-primary-soft"
      />
    );
  }

  return (
    <Image
      alt=""
      aria-hidden="true"
      className="object-cover object-center"
      fill
      priority={false}
      sizes="(min-width: 640px) 310px, 50vw"
      src={coverSrc}
      unoptimized={coverIsPublic}
    />
  );
};

const FavoriteMedia = ({ psychologist }: { psychologist: PatientRelationPsychologist }) => {
  const mediaSrc = resolvePublicMediaUrl(psychologist.avatar);
  const mediaIsPublic = isPublicMediaUrl(mediaSrc);
  const displayName = normalizeProfessionalDisplayName(psychologist.name) || psychologist.name;

  if (!mediaSrc) {
    return (
      <div className="relative flex h-full w-full items-center justify-center overflow-hidden bg-gradient-to-br from-primary-soft via-surface to-surface-muted">
        <span className="-top-7 -right-7 absolute h-20 w-20 rounded-full bg-primary/10 blur-2xl" />
        <span className="-bottom-8 -left-7 absolute h-24 w-24 rounded-full bg-success/10 blur-2xl" />
        <span className="relative grid h-full w-full place-items-center rounded-full border border-border bg-surface/76 text-2xl font-black tracking-[-0.05em] text-primary backdrop-blur-xl sm:text-3xl">
          {getInitials(displayName)}
        </span>
      </div>
    );
  }

  return (
    <Image
      alt={displayName}
      className="object-cover object-top"
      fill
      priority={false}
      sizes="(min-width: 640px) 124px, 96px"
      src={mediaSrc}
      unoptimized={mediaIsPublic}
    />
  );
};

const FavoritePsychologistCard = ({
  favoritePending,
  onToggleFavorite,
  psychologist,
}: {
  favoritePending: boolean;
  onToggleFavorite: (psychologist: PatientRelationPsychologist) => void;
  psychologist: PatientRelationPsychologist;
}) => {
  const route = `/psicologos/${psychologist.id}`;
  const favoriteBio = getFavoriteBio(psychologist);
  const displayName = normalizeProfessionalDisplayName(psychologist.name) || psychologist.name;
  const whatsappName = getPsychologistWhatsappDisplayName({
    id: psychologist.id,
    name: displayName,
    whatsappName: psychologist.whatsapp_name,
  });

  const handleFavoriteClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    onToggleFavorite(psychologist);
  };

  return (
    <article
      aria-label={`Abrir perfil de ${displayName}`}
      className="group relative isolate mx-auto flex min-h-[242px] w-full max-w-none flex-col overflow-hidden rounded-[22px] border border-border bg-surface text-center shadow-lectum-soft transition duration-300 hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-lectum-soft dark:border-border dark:bg-surface sm:min-h-[318px] sm:rounded-[24px] sm:shadow-lectum-soft"
    >
      <div className="relative h-[68px] w-full overflow-hidden bg-primary-soft sm:h-[92px]">
        <FavoriteCoverMedia psychologist={psychologist} />
        <span
          className="absolute inset-0 bg-gradient-to-b from-media-background/5 to-media-background/10"
          aria-hidden="true"
        />
        <button
          aria-label={`Remover ${displayName} dos favoritos`}
          aria-pressed="true"
          className="absolute top-2 right-2 z-20 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-surface/90 text-danger shadow-lectum-soft backdrop-blur transition hover:scale-105 hover:bg-surface hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger-border/20 disabled:pointer-events-none disabled:opacity-60 sm:h-9 sm:w-9"
          disabled={favoritePending}
          onClick={handleFavoriteClick}
          type="button"
        >
          {favoritePending ? (
            <Loader2 className="h-4 w-4 animate-spin sm:h-[18px] sm:w-[18px]" aria-hidden="true" />
          ) : (
            <Heart className="h-[18px] w-[18px] fill-current sm:h-5 sm:w-5" aria-hidden="true" />
          )}
        </button>
      </div>

      <div className="flex flex-1 flex-col px-3 pb-3 sm:px-5 sm:pb-5">
        <Link
          aria-label={`Abrir perfil de ${displayName}`}
          className="grid min-h-0 content-start justify-items-center text-center no-underline hover:no-underline"
          href={route}
        >
          <div className="relative -mt-10 h-[96px] w-[96px] rounded-full sm:-mt-14 sm:h-[124px] sm:w-[124px]">
            <div className="relative h-full w-full overflow-hidden rounded-full border-2 border-media-foreground bg-surface-muted ring-1 ring-border dark:border-surface dark:ring-border">
              <FavoriteMedia psychologist={psychologist} />
            </div>

            {psychologist.available_today ? (
              <span
                className="absolute right-1.5 bottom-1.5 grid h-5 w-5 place-items-center rounded-full border-2 border-media-foreground bg-media-foreground shadow-lectum-soft sm:right-2 sm:bottom-2 sm:h-6 sm:w-6 dark:border-surface dark:bg-surface"
                title="Disponível hoje"
              >
                <span className="absolute top-1/2 left-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-success/35 motion-safe:animate-[ping_2.4s_cubic-bezier(0,0,0.2,1)_infinite] sm:h-5 sm:w-5" />
                <span className="relative h-3.5 w-3.5 rounded-full bg-success ring-1 ring-success/20 sm:h-4 sm:w-4" />
                <span className="sr-only">Disponível hoje</span>
              </span>
            ) : null}
          </div>

          <div className="mt-3 grid min-w-0 justify-items-center gap-1.5 sm:mt-5 sm:gap-2">
            <span className="flex w-full min-w-0 max-w-full items-center justify-center gap-1 text-center text-[0.95rem] font-black leading-[1.08] tracking-[-0.03em] text-foreground sm:text-[1.12rem]">
              <span className="min-w-0 max-w-full truncate">{displayName}</span>
              {psychologist.verified ? (
                <VerifiedBadgeIcon className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
              ) : null}
            </span>
            <p className="line-clamp-2 min-h-[2rem] text-[0.74rem] font-normal leading-[1.05rem] text-muted sm:min-h-[2.5rem] sm:text-[0.84rem] sm:leading-5">
              {favoriteBio}
            </p>
          </div>
        </Link>

        <div className="mt-3 sm:mt-4">
          <PsychologistWhatsAppRedirectButton
            aria-label={`Enviar mensagem pelo WhatsApp para ${displayName}`}
            className="inline-flex min-h-[36px] w-full min-w-0 items-center justify-center gap-1.5 rounded-[12px] bg-success px-2.5 py-2 text-xs font-bold leading-none text-primary-foreground transition-colors hover:bg-success/90 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-success/45 sm:min-h-[38px] sm:rounded-[13px] sm:px-3 sm:text-[13px]"
            psychologist={{
              avatar: psychologist.avatar,
              crp: psychologist.crp,
              id: psychologist.id,
              name: displayName,
              typeLabel: getContactProfession(psychologist.gender),
              whatsappName,
              whatsappUrl: psychologist.whatsapp_url,
            }}
            stopPropagation
            trackingContext={{
              pageKind: "psychologists",
              path: "/app/favoritos",
              targetId: psychologist.id,
              targetType: "psychologist",
            }}
          >
            <PsychologistWhatsAppButtonContent
              iconClassName="h-4 w-4 sm:h-[17px] sm:w-[17px]"
              label="WhatsApp"
              labelClassName="inline-flex min-w-max shrink-0 items-center self-center !overflow-visible !text-clip text-xs font-bold leading-none sm:text-[13px]"
            />
          </PsychologistWhatsAppRedirectButton>
        </div>
      </div>
    </article>
  );
};

export function PsychologistRelationList({ mode }: PsychologistRelationListProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [hasAuthToken] = useState(() => {
    if (typeof window === "undefined") return false;

    return Boolean(getToken());
  });
  const currentPage = useMemo(() => getPageFromParams(searchParams), [searchParams]);
  const activeFavoriteFilter = useMemo(() => getActiveFavoriteFilter(searchParams), [searchParams]);
  const query = useMemo<PatientRelationQuery>(
    () => ({
      page: currentPage,
      limit: PAGE_LIMIT,
      ...favoriteFilterQuery(activeFavoriteFilter),
    }),
    [activeFavoriteFilter, currentPage],
  );
  const favoriteFilterCountQueries = useQueries({
    queries: FAVORITE_FILTER_CHIPS.map((chip) => {
      const countQuery = favoriteCountQuery(chip.key);

      return {
        enabled: hasAuthToken,
        queryFn: () => getFavoritePsychologists(countQuery),
        queryKey: keys.patient.favorites(countQuery),
        refetchOnWindowFocus: false,
        retry: false,
        staleTime: 30_000,
      };
    }),
  });
  const favoriteFilterCounts = useMemo(() => {
    return FAVORITE_FILTER_CHIPS.reduce<Partial<Record<FavoriteFilterKey, number>>>(
      (accumulator, chip, index) => {
        const count = favoriteFilterCountQueries[index]?.data?.count;
        if (typeof count === "number") {
          accumulator[chip.key] = count;
        }

        return accumulator;
      },
      {},
    );
  }, [favoriteFilterCountQueries]);
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
  const pages = response?.pages ?? 0;
  const errorMessage = activeQuery.isError ? resolveRelationErrorMessage(activeQuery.error) : null;
  const showInitialLoading = activeQuery.isLoading && !response;
  const Icon = copy.icon as typeof Heart;

  const handleSelectFavoriteFilter = (filter: FavoriteFilterKey) => {
    const next = new URLSearchParams(searchParams.toString());
    for (const key of FAVORITE_FILTER_PARAM_KEYS) {
      next.delete(key);
    }
    next.delete("page");

    if (filter !== "all") {
      next.set(filter, "true");
    }

    router.replace(`/app/favoritos${next.toString() ? `?${next}` : ""}`, {
      scroll: false,
    });
  };

  const goToPage = (page: number) => {
    const next = new URLSearchParams(searchParams.toString());
    if (page > 1) next.set("page", String(page));
    else next.delete("page");

    router.replace(`/app/favoritos${next.toString() ? `?${next}` : ""}`, {
      scroll: false,
    });
  };

  const toggleFavorite = (psychologist: PatientRelationPsychologist) => {
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
      <section className="mx-auto grid min-w-0 w-full max-w-[430px] gap-5 overflow-hidden md:max-w-3xl">
        <FavoritePageHeader />

        {!errorMessage ? (
          <FavoriteFilterChips
            activeFilter={activeFavoriteFilter}
            counts={favoriteFilterCounts}
            onSelect={handleSelectFavoriteFilter}
          />
        ) : null}

        {errorMessage ? (
          <InlineAlert title="Não foi possível carregar" variant="error">
            {errorMessage}
          </InlineAlert>
        ) : null}

        {showInitialLoading ? (
          <div className="grid min-h-[50vh] w-full place-items-center rounded-[28px] border border-border bg-surface shadow-[var(--lectum-shadow-soft)]">
            <LoadingState label="Carregando favoritos" />
          </div>
        ) : null}

        {!showInitialLoading && !errorMessage && psychologists.length === 0 ? (
          <EmptyState
            action={
              <Button asChild className="rounded-full">
                <Link href="/psicologos">
                  <Sparkles className="h-4 w-4" aria-hidden="true" />
                  Explorar psicólogos
                </Link>
              </Button>
            }
            className="min-h-[40vh] w-full max-w-full content-center gap-2.5 rounded-[32px] border-border bg-surface px-4 py-8 sm:px-6"
            description={copy.emptyDescription as string}
            icon={Icon}
            title={copy.emptyTitle as string}
          />
        ) : null}

        {!showInitialLoading && !errorMessage && psychologists.length > 0 ? (
          <div className="grid gap-4 sm:gap-5">
            {activeQuery.isFetching ? (
              <span className="sr-only" aria-live="polite">
                Atualizando favoritos
              </span>
            ) : null}

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5">
              {psychologists.map((psychologist) => (
                <FavoritePsychologistCard
                  favoritePending={favoritePendingId === psychologist.id}
                  key={psychologist.id}
                  onToggleFavorite={toggleFavorite}
                  psychologist={psychologist}
                />
              ))}
            </div>
          </div>
        ) : null}

        {pages > 1 ? (
          <nav
            aria-label={`Paginação de ${copy.title as string}`}
            className="flex w-full items-center justify-between gap-2 rounded-[24px] border border-border bg-surface p-3 shadow-[var(--lectum-shadow-soft)]"
          >
            <Button
              disabled={currentPage <= 1 || activeQuery.isFetching}
              onClick={() => goToPage(currentPage - 1)}
              type="button"
              variant="outline"
            >
              Anterior
            </Button>

            <span className="shrink-0 text-sm font-semibold text-muted">
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
      </section>
    </PrivateTemplate>
  );
}
