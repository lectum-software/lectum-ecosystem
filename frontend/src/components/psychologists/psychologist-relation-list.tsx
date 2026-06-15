"use client";

import {
  BadgeCheck,
  Banknote,
  Heart,
  Loader2,
  ShieldCheck,
  Sparkles,
  Star,
  TicketPercent,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { type MouseEvent, useMemo, useState } from "react";
import { usePatient } from "@/api/callers/patient";
import type { PatientRelationPsychologist, PatientRelationQuery } from "@/api/generator/types";
import { PsychologistWhatsAppRedirectButton } from "@/components/psychologists/psychologist-whatsapp-redirect-button";
import { EmptyState } from "@/components/ui/empty-state";
import { InlineAlert } from "@/components/ui/inline-alert";
import { LoadingState } from "@/components/ui/loading-state";
import { VerifiedBadgeIcon } from "@/components/ui/verified-badge";
import { WhatsAppIcon } from "@/components/ui/whatsapp-icon";
import { getToken } from "@/hooks/cookies/token";
import { cn } from "@/lib/utils";
import { Button } from "@/registry/new-york-v4/ui/button";
import { PrivateTemplate } from "@/templates/private";
import { isPublicMediaUrl, resolvePublicMediaUrl } from "@/utils/media";

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

type FilterKey =
  | "available_today"
  | "verified"
  | "accepts_insurance"
  | "social_value"
  | "discount_first_session";

type FavoriteFilter = {
  key: FilterKey;
  label: string;
  shortLabel: string;
  icon: typeof Sparkles;
};

const favoriteFilters: FavoriteFilter[] = [
  {
    key: "available_today",
    label: "Disponível hoje",
    shortLabel: "Disponível hoje",
    icon: Sparkles,
  },
  {
    key: "verified",
    label: "Verificados",
    shortLabel: "Verificados",
    icon: ShieldCheck,
  },
  {
    key: "accepts_insurance",
    label: "Aceita convênios",
    shortLabel: "Convênios",
    icon: BadgeCheck,
  },
  {
    key: "social_value",
    label: "Valor social",
    shortLabel: "Valor social",
    icon: Banknote,
  },
  {
    key: "discount_first_session",
    label: "Desconto na 1ª sessão",
    shortLabel: "1ª sessão",
    icon: TicketPercent,
  },
];

const config = {
  favorites: {
    title: "Favoritos",
    eyebrow: "Sua curadoria",
    description: "Profissionais que você salvou para comparar e chamar no WhatsApp.",
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
  const apiError = error as ApiError;
  const rawMessage =
    apiError?.data?.error ||
    apiError?.data?.message ||
    (error instanceof Error ? error.message : "");
  const normalized = rawMessage.toLowerCase();

  if (normalized.includes("token") || normalized.includes("sess")) {
    return "Sua sessão precisa estar ativa para carregar seus favoritos.";
  }

  if (normalized.includes("network") || normalized.includes("conex")) {
    return "Não foi possível conectar à API agora. Tente novamente em alguns instantes.";
  }

  return rawMessage || "Não foi possível carregar seus psicólogos favoritos.";
};

const getInitials = (name: string) => {
  const parts = name.split(/\s+/).filter(Boolean);

  if (parts.length === 0) return "L";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};

const getProfession = (gender?: string | null) => {
  return gender?.toLowerCase() === "feminino" ? "Psicóloga" : "Psicólogo";
};

const getContactProfession = (gender?: string | null) => {
  return gender?.toLowerCase() === "feminino" ? "Psic\u00f3loga" : "Psic\u00f3logo";
};

const formatRating = (ratingAvg: number) => {
  return (ratingAvg / 100).toFixed(1).replace(".", ",");
};

const buildMetaLine = (psychologist: PatientRelationPsychologist) => {
  const parts = [getProfession(psychologist.gender)];

  if (psychologist.show_experience_tag !== false && psychologist.formation_years) {
    parts.push(`${psychologist.formation_years} anos exp.`);
  }

  return parts.join(" • ");
};

const buildBenefitTags = (psychologist: PatientRelationPsychologist) => {
  const tags: Array<{ label: string; icon: typeof Sparkles }> = [];

  if (psychologist.accepts_insurance) {
    tags.push({ label: "Aceita convênios", icon: BadgeCheck });
  }

  if (psychologist.social_value) {
    tags.push({ label: "Valor social", icon: Banknote });
  }

  if (psychologist.discount_first_session) {
    tags.push({ label: "Desconto na 1ª sessão", icon: TicketPercent });
  }

  return tags;
};

const FavoriteMedia = ({ psychologist }: { psychologist: PatientRelationPsychologist }) => {
  const mediaSrc = resolvePublicMediaUrl(psychologist.video_cover_url || psychologist.avatar);
  const mediaIsPublic = isPublicMediaUrl(mediaSrc);

  if (!mediaSrc) {
    return (
      <div className="relative flex h-full w-full items-center justify-center overflow-hidden bg-gradient-to-br from-primary-soft via-surface-muted to-surface">
        <span className="-top-10 -right-8 absolute h-28 w-28 rounded-full bg-primary/12 blur-2xl" />
        <span className="-bottom-12 -left-8 absolute h-32 w-32 rounded-full bg-success/10 blur-2xl" />
        <span className="absolute inset-0 bg-[radial-gradient(circle_at_30%_18%,rgb(255_255_255_/_72%),transparent_34%)] dark:bg-[radial-gradient(circle_at_30%_18%,rgb(255_255_255_/_8%),transparent_34%)]" />
        <span className="relative grid h-20 w-20 place-items-center rounded-[28px] border border-surface/80 bg-surface/80 text-2xl font-black tracking-[-0.04em] text-primary shadow-[0_18px_36px_rgb(15_23_42_/_12%)] backdrop-blur-xl">
          {getInitials(psychologist.name)}
        </span>
      </div>
    );
  }

  return (
    <Image
      alt={psychologist.name}
      className="object-cover object-top"
      fill
      priority={false}
      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 240px"
      src={mediaSrc}
      unoptimized={mediaIsPublic}
    />
  );
};

const FilterChip = ({
  active,
  filter,
  onClick,
}: {
  active: boolean;
  filter: FavoriteFilter;
  onClick: () => void;
}) => {
  const Icon = filter.icon;

  return (
    <button
      aria-pressed={active}
      className={cn(
        "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-bold transition",
        active
          ? "border-primary/30 bg-primary-soft text-primary shadow-sm"
          : "border-border bg-surface/85 text-muted hover:border-primary/30 hover:text-primary",
      )}
      onClick={onClick}
      type="button"
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {filter.shortLabel}
    </button>
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
  const tags = buildBenefitTags(psychologist);
  const metaLine = buildMetaLine(psychologist);
  const route = `/app/psychologist/${psychologist.id}`;
  const visibleTags = tags.slice(0, 2);

  const handleFavoriteClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    onToggleFavorite(psychologist);
  };

  return (
    <article
      aria-label={`Abrir perfil de ${psychologist.name}`}
      className="group relative isolate min-w-0 cursor-pointer overflow-hidden rounded-[26px] border border-border/90 bg-surface shadow-[0_14px_34px_rgb(15_23_42_/_8%)] transition duration-300 hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-[0_22px_48px_rgb(15_23_42_/_13%)]"
    >
      <Link
        aria-label={`Abrir perfil de ${psychologist.name}`}
        className="absolute inset-0 z-10"
        href={route}
      />

      <div className="relative m-2 mb-0 aspect-[4/5] overflow-hidden rounded-[22px] bg-primary-soft">
        <FavoriteMedia psychologist={psychologist} />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-foreground/16 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-foreground/18 to-transparent" />
        <button
          aria-label={`Remover ${psychologist.name} dos favoritos`}
          aria-pressed="true"
          className="absolute right-2.5 top-2.5 z-30 grid h-9 w-9 shrink-0 place-items-center rounded-full border border-surface/80 bg-surface/90 text-danger shadow-[0_10px_22px_rgb(15_23_42_/_14%)] backdrop-blur-xl transition hover:scale-105 disabled:pointer-events-none disabled:opacity-60"
          disabled={favoritePending}
          onClick={handleFavoriteClick}
          type="button"
        >
          {favoritePending ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Heart className="h-4 w-4 fill-current" aria-hidden="true" />
          )}
        </button>
      </div>

      <div className="pointer-events-none relative z-20 grid gap-2.5 p-3.5 pt-3">
        <div className="min-w-0">
          <span className="flex min-w-0 items-start gap-1.5 pr-1">
            <span className="line-clamp-2 text-[0.96rem] font-black leading-[1.18] tracking-[-0.025em] text-foreground">
              {psychologist.name}
            </span>
            {psychologist.verified ? (
              <VerifiedBadgeIcon className="mt-0.5 h-4 w-4 shrink-0" />
            ) : null}
          </span>
          <p className="mt-1 line-clamp-1 text-[11px] font-extrabold uppercase tracking-[0.06em] text-muted">
            {metaLine}
          </p>
        </div>

        <div className="flex min-h-6 flex-wrap items-center gap-1.5 text-[11px]">
          <span className="inline-flex items-center gap-1 rounded-full border border-warning/12 bg-warning/10 px-2 py-1 font-black text-foreground">
            <Star className="h-3 w-3 fill-warning text-warning" aria-hidden="true" />
            {formatRating(psychologist.rating_avg)}
          </span>

          {psychologist.available_today ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-success/15 bg-success/10 px-2 py-1 font-black text-success">
              <span className="h-1.5 w-1.5 rounded-full bg-success motion-safe:animate-pulse" />
              Hoje
            </span>
          ) : null}
        </div>

        {visibleTags.length > 0 ? (
          <div className="flex min-h-6 flex-wrap gap-1.5">
            {visibleTags.map((tag) => {
              const Icon = tag.icon;

              return (
                <span
                  className="inline-flex max-w-full items-center gap-1 rounded-full border border-primary/10 bg-primary-soft/70 px-2 py-1 text-[10px] font-bold text-primary"
                  key={tag.label}
                >
                  <Icon className="h-3 w-3 shrink-0" aria-hidden="true" />
                  <span className="truncate">{tag.label}</span>
                </span>
              );
            })}
          </div>
        ) : null}

        {psychologist.whatsapp_url ? (
          <PsychologistWhatsAppRedirectButton
            aria-label={`Chamar ${psychologist.name} no WhatsApp`}
            className="pointer-events-auto relative z-30 mt-0.5 inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-full border border-success/25 bg-surface-muted px-3 text-xs font-black text-success transition hover:border-success hover:bg-success hover:text-white"
            psychologist={{
              avatar: psychologist.avatar,
              crp: psychologist.crp,
              id: psychologist.id,
              name: psychologist.name,
              typeLabel: getContactProfession(psychologist.gender),
              whatsappUrl: psychologist.whatsapp_url,
            }}
            stopPropagation
          >
            <WhatsAppIcon className="h-3.5 w-3.5" aria-hidden="true" />
            WhatsApp
          </PsychologistWhatsAppRedirectButton>
        ) : null}
      </div>
    </article>
  );
};

export function PsychologistRelationList({ mode }: PsychologistRelationListProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeFilters, setActiveFilters] = useState<Record<FilterKey, boolean>>({
    available_today: false,
    verified: false,
    accepts_insurance: false,
    social_value: false,
    discount_first_session: false,
  });
  const [hasAuthToken] = useState(() => {
    if (typeof window === "undefined") return false;

    return Boolean(getToken());
  });
  const currentPage = useMemo(() => getPageFromParams(searchParams), [searchParams]);
  const activeFilterCount = favoriteFilters.filter((item) => activeFilters[item.key]).length;
  const query = useMemo<PatientRelationQuery>(
    () => ({
      page: currentPage,
      limit: PAGE_LIMIT,
      ...activeFilters,
    }),
    [activeFilters, currentPage],
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

  const toggleFilter = (key: FilterKey) => {
    setActiveFilters((current) => ({ ...current, [key]: !current[key] }));
    goToPage(1);
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
  const hasAnyFilter = activeFilterCount > 0;

  return (
    <PrivateTemplate>
      <section className="mx-auto grid w-full max-w-[430px] gap-5 lg:max-w-[1120px]">
        <header className="relative grid gap-4 overflow-hidden rounded-[32px] border border-border bg-surface p-5 shadow-[var(--lectum-shadow-soft)] lg:p-7">
          <span className="pointer-events-none absolute top-0 right-0 h-28 w-28 rounded-bl-[42px] bg-primary-soft/60" />
          <span className="pointer-events-none absolute top-5 right-5 grid h-12 w-12 place-items-center rounded-2xl border border-primary/10 bg-primary-soft text-primary shadow-[0_12px_28px_rgb(48_140_232_/_16%)] lg:top-7 lg:right-7 lg:h-14 lg:w-14 lg:rounded-[22px]">
            <Heart className="h-6 w-6 fill-current lg:h-7 lg:w-7" aria-hidden="true" />
          </span>

          <div className="relative grid min-w-0 gap-2">
            <p className="pr-16 text-xs font-black uppercase tracking-[0.22em] text-primary lg:pr-20">
              {copy.eyebrow as string}
            </p>
            <h1 className="pr-16 text-3xl font-black leading-tight text-foreground lg:pr-20 lg:text-4xl">
              {copy.title as string}
            </h1>
            <p className="max-w-none text-sm leading-6 text-muted lg:text-base">
              {copy.description as string}
            </p>
          </div>

          <div className="-mx-5 overflow-x-auto scroll-smooth px-5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:-mx-7 lg:px-7">
            <div className="flex w-max flex-nowrap gap-2 whitespace-nowrap">
              {favoriteFilters.map((filter) => (
                <FilterChip
                  active={activeFilters[filter.key]}
                  filter={filter}
                  key={filter.key}
                  onClick={() => toggleFilter(filter.key)}
                />
              ))}
            </div>
          </div>
        </header>

        {errorMessage ? (
          <InlineAlert title="Não foi possível carregar" variant="error">
            {errorMessage}
          </InlineAlert>
        ) : null}

        {showInitialLoading ? (
          <div className="grid min-h-[50vh] place-items-center rounded-[28px] border border-border bg-surface shadow-[var(--lectum-shadow-soft)]">
            <LoadingState label="Carregando favoritos" />
          </div>
        ) : null}

        {!showInitialLoading && !errorMessage && psychologists.length === 0 ? (
          <EmptyState
            action={
              <Button asChild className="rounded-full">
                <Link href="/app/psychologists">
                  <Sparkles className="h-4 w-4" aria-hidden="true" />
                  Explorar psicólogos
                </Link>
              </Button>
            }
            className="min-h-[48vh] rounded-[32px] border-border bg-surface"
            description={
              hasAnyFilter
                ? "Nenhum favorito corresponde aos filtros aplicados."
                : (copy.emptyDescription as string)
            }
            icon={hasAnyFilter ? Sparkles : Icon}
            title={hasAnyFilter ? "Nenhum favorito encontrado" : (copy.emptyTitle as string)}
          />
        ) : null}

        {!showInitialLoading && !errorMessage && psychologists.length > 0 ? (
          <div className="grid gap-4">
            <div className="flex items-center justify-between gap-3 px-1 text-sm text-muted">
              <span className="font-bold">
                {total} perfil{total === 1 ? "" : "s"} salvo{total === 1 ? "" : "s"}
              </span>
              {activeQuery.isFetching ? <LoadingState label="Atualizando" /> : null}
            </div>

            <div className="grid grid-cols-1 gap-3.5 min-[360px]:grid-cols-2 sm:grid-cols-[repeat(auto-fill,minmax(190px,1fr))] lg:gap-4">
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
            className="flex items-center justify-between gap-3 rounded-[24px] border border-border bg-surface p-3 shadow-[var(--lectum-shadow-soft)]"
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
      </section>
    </PrivateTemplate>
  );
}
