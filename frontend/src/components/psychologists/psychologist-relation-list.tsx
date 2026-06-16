"use client";

import {
  BadgeCheck,
  Banknote,
  Heart,
  Loader2,
  ShieldCheck,
  Sparkles,
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

const FavoriteMedia = ({ psychologist }: { psychologist: PatientRelationPsychologist }) => {
  const mediaSrc = resolvePublicMediaUrl(psychologist.avatar);
  const mediaIsPublic = isPublicMediaUrl(mediaSrc);

  if (!mediaSrc) {
    return (
      <div className="relative flex h-full w-full items-center justify-center overflow-hidden bg-gradient-to-br from-primary-soft via-white to-surface-muted">
        <span className="-top-7 -right-7 absolute h-20 w-20 rounded-full bg-primary/10 blur-2xl" />
        <span className="-bottom-8 -left-7 absolute h-24 w-24 rounded-full bg-success/10 blur-2xl" />
        <span className="relative grid h-full w-full place-items-center rounded-full border border-white/80 bg-white/76 text-3xl font-black tracking-[-0.05em] text-primary shadow-[0_18px_42px_rgb(15_23_42_/_10%)] backdrop-blur-xl">
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
      sizes="120px"
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
  const route = `/app/psychologist/${psychologist.id}`;
  const profession = getProfession(psychologist.gender);

  const handleFavoriteClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    onToggleFavorite(psychologist);
  };

  return (
    <article
      aria-label={`Abrir perfil de ${psychologist.name}`}
      className="group relative isolate flex min-h-[312px] w-[264px] shrink-0 snap-start flex-col overflow-hidden rounded-[26px] border border-[#E7ECF2] bg-white p-4 text-center shadow-[0_14px_34px_rgb(15_23_42_/_7%)] transition duration-300 hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-[0_22px_48px_rgb(15_23_42_/_11%)] dark:border-border dark:bg-surface"
    >
      <button
        aria-label={`Remover ${psychologist.name} dos favoritos`}
        aria-pressed="true"
        className="absolute top-3.5 right-3.5 z-20 grid h-8 w-8 shrink-0 place-items-center rounded-full border border-[#EDF1F5] bg-white/92 text-rose-500 shadow-[0_10px_22px_rgb(15_23_42_/_8%)] backdrop-blur-xl transition hover:scale-105 hover:bg-white disabled:pointer-events-none disabled:opacity-60 dark:border-border dark:bg-surface/92"
        disabled={favoritePending}
        onClick={handleFavoriteClick}
        type="button"
      >
        {favoritePending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
        ) : (
          <Heart className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
        )}
      </button>

      <Link
        aria-label={`Abrir perfil de ${psychologist.name}`}
        className="grid min-h-0 flex-1 content-start justify-items-center text-center no-underline hover:no-underline"
        href={route}
      >
        <div className="relative mt-2 h-[116px] w-[116px] rounded-full bg-primary-soft p-1 shadow-[0_16px_36px_rgb(15_23_42_/_10%)] sm:h-[120px] sm:w-[120px]">
          <div className="relative h-full w-full overflow-hidden rounded-full bg-surface-muted ring-4 ring-white dark:ring-surface">
            <FavoriteMedia psychologist={psychologist} />
          </div>

          {psychologist.available_today ? (
            <span
              className="absolute right-2 bottom-2 grid h-5 w-5 place-items-center rounded-full bg-white shadow-[0_8px_18px_rgb(15_23_42_/_12%)] ring-1 ring-success/15 dark:bg-surface"
              title="Disponível hoje"
            >
              <span className="absolute h-3.5 w-3.5 rounded-full bg-success/35 motion-safe:animate-[ping_2.4s_cubic-bezier(0,0,0.2,1)_infinite]" />
              <span className="relative h-3 w-3 rounded-full bg-success ring-2 ring-white dark:ring-surface" />
              <span className="sr-only">Disponível hoje</span>
            </span>
          ) : null}
        </div>

        <div className="mt-5 grid min-w-0 justify-items-center gap-1.5">
          <span className="flex max-w-full items-start justify-center gap-1.5">
            <span className="line-clamp-2 text-[0.98rem] font-bold leading-[1.18] tracking-[-0.02em] text-foreground">
              {psychologist.name}
            </span>
            {psychologist.verified ? (
              <VerifiedBadgeIcon className="mt-[1px] h-4 w-4 shrink-0" />
            ) : null}
          </span>
          <p className="text-sm font-medium text-muted">{profession}</p>
        </div>
      </Link>

      <PsychologistWhatsAppRedirectButton
        aria-label={`Chamar ${psychologist.name} no WhatsApp`}
        className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-[14px] bg-success px-4 text-sm font-black text-white shadow-[0_12px_24px_rgb(34_197_94_/_22%)] transition hover:bg-success/90 hover:shadow-[0_16px_30px_rgb(34_197_94_/_26%)] active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-success/45 disabled:shadow-none"
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
        <WhatsAppIcon className="h-[18px] w-[18px] text-white" aria-hidden="true" />
        Chamar no WhatsApp
      </PsychologistWhatsAppRedirectButton>
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

            <div className="-mx-5 overflow-x-auto scroll-smooth px-5 pb-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden lg:-mx-1 lg:px-1">
              <div className="flex w-max snap-x snap-mandatory gap-3.5 lg:gap-4">
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
