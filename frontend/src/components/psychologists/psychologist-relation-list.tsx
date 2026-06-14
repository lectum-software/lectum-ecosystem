"use client";

import {
  BadgeCheck,
  Banknote,
  Heart,
  Loader2,
  Search,
  ShieldCheck,
  SlidersHorizontal,
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
import { Input } from "@/registry/new-york-v4/ui/input";
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
    description: "Profissionais que você salvou para comparar, conversar e retomar quando quiser.",
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
      <div className="flex h-full w-full items-center justify-center bg-primary-soft text-5xl font-black text-primary">
        {getInitials(psychologist.name)}
      </div>
    );
  }

  return (
    <Image
      alt={psychologist.name}
      className="object-cover object-top"
      fill
      priority={false}
      sizes="(max-width: 430px) 92vw, (max-width: 1024px) 420px, 360px"
      src={mediaSrc}
      unoptimized={mediaIsPublic}
    />
  );
};

const MiniAvatar = ({ psychologist }: { psychologist: PatientRelationPsychologist }) => {
  const avatarSrc = resolvePublicMediaUrl(psychologist.avatar);
  const avatarIsPublic = isPublicMediaUrl(avatarSrc);

  return (
    <span className="relative grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-2xl border border-surface/80 bg-surface text-sm font-black text-primary shadow-[var(--lectum-shadow-soft)]">
      {avatarSrc ? (
        <Image
          alt=""
          className="object-cover object-top"
          fill
          sizes="56px"
          src={avatarSrc}
          unoptimized={avatarIsPublic}
        />
      ) : (
        getInitials(psychologist.name)
      )}
    </span>
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

  const handleFavoriteClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    onToggleFavorite(psychologist);
  };

  return (
    <article
      aria-label={`Abrir perfil de ${psychologist.name}`}
      className="group relative isolate aspect-[9/14] min-h-[520px] w-full cursor-pointer overflow-hidden rounded-[28px] border border-border bg-surface shadow-[0_18px_46px_rgb(15_23_42_/_16%)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_22px_54px_rgb(15_23_42_/_18%)]"
    >
      <FavoriteMedia psychologist={psychologist} />

      <div className="absolute inset-0 bg-gradient-to-b from-foreground/15 via-transparent to-foreground/55" />
      <Link
        aria-label={`Abrir perfil de ${psychologist.name}`}
        className="absolute inset-0 z-10"
        href={route}
      />

      <div className="pointer-events-none absolute left-4 right-4 top-4 z-20 flex items-start justify-between gap-3">
        {psychologist.available_today ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-surface/70 bg-surface/82 px-3 py-1.5 text-[11px] font-extrabold text-success shadow-sm backdrop-blur-xl">
            <span className="h-2 w-2 rounded-full bg-success motion-safe:animate-pulse" />
            Disponível hoje
          </span>
        ) : (
          <span />
        )}

        <button
          aria-label={`Remover ${psychologist.name} dos favoritos`}
          aria-pressed="true"
          className="pointer-events-auto grid h-11 w-11 shrink-0 place-items-center rounded-full border border-surface/70 bg-surface/82 text-danger shadow-sm backdrop-blur-xl transition hover:scale-105 disabled:pointer-events-none disabled:opacity-60"
          disabled={favoritePending}
          onClick={handleFavoriteClick}
          type="button"
        >
          {favoritePending ? (
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
          ) : (
            <Heart className="h-5 w-5 fill-current" aria-hidden="true" />
          )}
        </button>
      </div>

      <div className="pointer-events-none absolute inset-x-4 bottom-4 z-20">
        <div className="rounded-[26px] border border-border/70 bg-surface/76 p-4 shadow-[0_18px_40px_rgb(15_23_42_/_18%)] backdrop-blur-2xl supports-[backdrop-filter]:bg-surface/68">
          <div className="-mt-11 mb-2 flex items-end justify-between gap-3">
            <MiniAvatar psychologist={psychologist} />
            <div className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-surface/82 px-2.5 py-1 text-xs font-black text-foreground shadow-sm backdrop-blur">
              <Star className="h-3.5 w-3.5 fill-warning text-warning" aria-hidden="true" />
              {formatRating(psychologist.rating_avg)}
            </div>
          </div>

          <div className="grid gap-2">
            <div className="min-w-0 text-left">
              <span className="flex min-w-0 items-center gap-1.5">
                <span className="truncate text-[1.08rem] font-black leading-6 text-foreground">
                  {psychologist.name}
                </span>
                {psychologist.verified ? <VerifiedBadgeIcon className="h-4 w-4 shrink-0" /> : null}
              </span>
            </div>

            <p className="text-xs font-bold uppercase tracking-[0.08em] text-muted">{metaLine}</p>

            {psychologist.bio ? (
              <p className="line-clamp-2 text-sm leading-5 text-muted">{psychologist.bio}</p>
            ) : null}

            {tags.length > 0 ? (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {tags.map((tag) => {
                  const Icon = tag.icon;

                  return (
                    <span
                      className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-surface/75 px-2.5 py-1 text-[11px] font-bold text-foreground"
                      key={tag.label}
                    >
                      <Icon className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                      {tag.label}
                    </span>
                  );
                })}
              </div>
            ) : null}

            {psychologist.whatsapp_url ? (
              <PsychologistWhatsAppRedirectButton
                className="pointer-events-auto mt-2 inline-flex h-11 items-center justify-center gap-2 rounded-full bg-success px-4 text-sm font-black text-white shadow-[var(--lectum-shadow-soft)] transition hover:brightness-105"
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
                <WhatsAppIcon className="h-4 w-4" aria-hidden="true" />
                Chamar no WhatsApp
              </PsychologistWhatsAppRedirectButton>
            ) : (
              <button
                className="pointer-events-auto mt-2 inline-flex h-11 cursor-not-allowed items-center justify-center gap-2 rounded-full bg-surface-muted px-4 text-sm font-black text-muted"
                disabled
                type="button"
              >
                <WhatsAppIcon className="h-4 w-4" aria-hidden="true" />
                WhatsApp indisponível
              </button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
};

export function PsychologistRelationList({ mode }: PsychologistRelationListProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(true);
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
      search: search.trim() || undefined,
      ...activeFilters,
    }),
    [activeFilters, currentPage, search],
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

  const clearFilters = () => {
    setSearch("");
    setActiveFilters({
      available_today: false,
      verified: false,
      accepts_insurance: false,
      social_value: false,
      discount_first_session: false,
    });
    goToPage(1);
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
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
  const hasAnyFilter = activeFilterCount > 0 || Boolean(search.trim());

  return (
    <PrivateTemplate>
      <section className="mx-auto grid w-full max-w-[430px] gap-5 lg:max-w-[1120px]">
        <header className="grid gap-4 rounded-[32px] border border-border bg-surface p-5 shadow-[var(--lectum-shadow-soft)] lg:grid-cols-[minmax(0,0.8fr)_minmax(360px,1fr)] lg:items-end lg:p-7">
          <div className="grid gap-2">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-primary">
              {copy.eyebrow as string}
            </p>
            <div className="flex items-start justify-between gap-3 lg:block">
              <div>
                <h1 className="text-3xl font-black leading-tight text-foreground lg:text-4xl">
                  {copy.title as string}
                </h1>
                <p className="mt-2 max-w-sm text-sm leading-6 text-muted">
                  {copy.description as string}
                </p>
              </div>
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-primary-soft text-primary lg:hidden">
                <Heart className="h-6 w-6 fill-current" aria-hidden="true" />
              </span>
            </div>
          </div>

          <div className="grid gap-3">
            <div className="flex items-center gap-2">
              <label className="relative min-w-0 flex-1" htmlFor="favorites-search">
                <span className="sr-only">Buscar favoritos</span>
                <Search
                  className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle"
                  aria-hidden="true"
                />
                <Input
                  className="h-12 rounded-full bg-background pl-11 shadow-sm"
                  id="favorites-search"
                  onChange={(event) => handleSearchChange(event.target.value)}
                  placeholder="Buscar psicólogos favoritos"
                  value={search}
                />
              </label>

              <button
                aria-expanded={showFilters}
                className="relative grid h-12 w-12 shrink-0 place-items-center rounded-full border border-border bg-background text-foreground shadow-sm transition hover:bg-primary-soft hover:text-primary"
                onClick={() => setShowFilters((current) => !current)}
                type="button"
              >
                <SlidersHorizontal className="h-5 w-5" aria-hidden="true" />
                {activeFilterCount > 0 ? (
                  <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-[10px] font-black text-white">
                    {activeFilterCount}
                  </span>
                ) : null}
              </button>
            </div>

            {showFilters ? (
              <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
                {favoriteFilters.map((filter) => (
                  <FilterChip
                    active={activeFilters[filter.key]}
                    filter={filter}
                    key={filter.key}
                    onClick={() => toggleFilter(filter.key)}
                  />
                ))}
                {hasAnyFilter ? (
                  <button
                    className="h-9 shrink-0 rounded-full border border-border bg-surface px-3 text-xs font-bold text-muted transition hover:text-primary"
                    onClick={clearFilters}
                    type="button"
                  >
                    Limpar
                  </button>
                ) : null}
              </div>
            ) : null}
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
                  <Search className="h-4 w-4" aria-hidden="true" />
                  Explorar psicólogos
                </Link>
              </Button>
            }
            className="min-h-[48vh] rounded-[32px] border-border bg-surface"
            description={
              hasAnyFilter
                ? "Nenhum favorito corresponde à busca ou aos filtros aplicados."
                : (copy.emptyDescription as string)
            }
            icon={hasAnyFilter ? Search : Icon}
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

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
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
