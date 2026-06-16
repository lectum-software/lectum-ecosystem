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

const getProfession = () => "Psicólogo";

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
        "inline-flex h-7 shrink-0 items-center gap-1 rounded-full border px-2.5 text-[10.5px] font-bold tracking-[-0.01em] transition",
        active
          ? "border-primary/20 bg-primary-soft text-primary shadow-[0_8px_18px_rgb(48_140_232_/_8%)]"
          : "border-border/80 bg-surface/80 text-muted hover:border-primary/20 hover:bg-primary-soft/45 hover:text-primary dark:border-border dark:bg-surface dark:text-muted",
      )}
      onClick={onClick}
      type="button"
    >
      <Icon className="h-3 w-3" aria-hidden="true" />
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
  const profession = getProfession();

  const handleFavoriteClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    onToggleFavorite(psychologist);
  };

  return (
    <article
      aria-label={`Abrir perfil de ${psychologist.name}`}
      className="group relative isolate flex min-h-[226px] w-full flex-col overflow-hidden rounded-[24px] border border-[#E7ECF2] bg-white p-3.5 text-center shadow-[0_12px_28px_rgb(15_23_42_/_6%)] transition duration-300 hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-[0_18px_42px_rgb(15_23_42_/_10%)] dark:border-border dark:bg-surface sm:min-h-[264px] sm:rounded-[28px] sm:p-4"
    >
      <button
        aria-label={`Remover ${psychologist.name} dos favoritos`}
        aria-pressed="true"
        className="absolute top-3 right-3 z-20 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-transparent text-rose-500/90 transition hover:scale-105 hover:bg-rose-50/80 hover:text-rose-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/20 disabled:pointer-events-none disabled:opacity-60 sm:top-3.5 sm:right-3.5"
        disabled={favoritePending}
        onClick={handleFavoriteClick}
        type="button"
      >
        {favoritePending ? (
          <Loader2 className="h-[18px] w-[18px] animate-spin" aria-hidden="true" />
        ) : (
          <Heart className="h-5 w-5 fill-current" aria-hidden="true" />
        )}
      </button>

      <Link
        aria-label={`Abrir perfil de ${psychologist.name}`}
        className="grid min-h-0 content-start justify-items-center text-center no-underline hover:no-underline"
        href={route}
      >
        <div className="relative mt-1.5 h-[88px] w-[88px] rounded-full bg-primary-soft p-1 shadow-[0_14px_30px_rgb(15_23_42_/_10%)] sm:mt-2 sm:h-[110px] sm:w-[110px]">
          <div className="relative h-full w-full overflow-hidden rounded-full bg-surface-muted ring-4 ring-white dark:ring-surface">
            <FavoriteMedia psychologist={psychologist} />
          </div>

          {psychologist.available_today ? (
            <span
              className="absolute right-1.5 bottom-1.5 grid h-5 w-5 place-items-center rounded-full bg-white shadow-[0_8px_18px_rgb(15_23_42_/_12%)] ring-1 ring-success/15 dark:bg-surface"
              title="Disponível hoje"
            >
              <span className="absolute h-3.5 w-3.5 rounded-full bg-success/35 motion-safe:animate-[ping_2.4s_cubic-bezier(0,0,0.2,1)_infinite]" />
              <span className="relative h-3 w-3 rounded-full bg-success ring-2 ring-white dark:ring-surface" />
              <span className="sr-only">Disponível hoje</span>
            </span>
          ) : null}
        </div>

        <div className="mt-4 grid min-w-0 justify-items-center gap-1 sm:mt-[1.125rem] sm:gap-1.5">
          <span className="flex min-w-0 max-w-full items-start justify-center gap-1.5">
            <span className="line-clamp-2 min-w-0 text-[0.88rem] font-bold leading-[1.15] tracking-[-0.02em] text-foreground sm:text-[0.98rem]">
              {psychologist.name}
            </span>
            {psychologist.verified ? (
              <VerifiedBadgeIcon className="mt-[1px] h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
            ) : null}
          </span>
          <p className="text-xs font-medium text-muted sm:text-[0.82rem]">{profession}</p>
        </div>
      </Link>

      <PsychologistWhatsAppRedirectButton
        aria-label={`Chamar ${psychologist.name} no WhatsApp`}
        className="mt-3.5 inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-[12px] bg-success px-2.5 font-black text-white shadow-[0_10px_20px_rgb(34_197_94_/_20%)] transition hover:bg-success/90 hover:shadow-[0_14px_26px_rgb(34_197_94_/_24%)] active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-success/45 disabled:shadow-none sm:mt-4 sm:h-[34px] sm:gap-1.5 sm:rounded-[14px]"
        psychologist={{
          avatar: psychologist.avatar,
          crp: psychologist.crp,
          id: psychologist.id,
          name: psychologist.name,
          typeLabel: getContactProfession(psychologist.gender),
          whatsappUrl: psychologist.whatsapp_url,
        }}
        style={{ fontSize: "0.6875rem" }}
        stopPropagation
      >
        <WhatsAppIcon className="h-3.5 w-3.5 text-white" aria-hidden="true" />
        WhatsApp
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
    <PrivateTemplate contentClassName="max-w-none px-0 pt-0 pb-8 sm:px-0 sm:py-0">
      <section className="grid w-full gap-4 lg:gap-6">
        <header className="mx-auto grid w-full max-w-[1120px] gap-4 px-5 pt-5 sm:px-8 md:pt-8 lg:px-0">
          <div className="flex items-start justify-between gap-4">
            <div className="grid min-w-0 gap-2">
              <p className="inline-flex w-fit items-center rounded-full border border-primary/10 bg-primary/5 px-2.5 py-1 text-[0.64rem] font-black uppercase tracking-[0.18em] text-primary/80">
                {copy.eyebrow as string}
              </p>
              <div className="grid gap-1.5">
                <h1 className="text-2xl font-extrabold leading-tight tracking-tight text-foreground sm:text-3xl">
                  {copy.title as string}
                </h1>
                <p className="max-w-[34rem] text-sm leading-5 text-muted sm:text-[0.95rem] sm:leading-6">
                  {copy.description as string}
                </p>
              </div>
            </div>

            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-primary sm:h-12 sm:w-12">
              <Heart
                className="h-[22px] w-[22px] fill-primary/12 stroke-primary sm:h-6 sm:w-6"
                aria-hidden="true"
              />
            </span>
          </div>

          <div className="-mx-5 overflow-x-auto scroll-smooth px-5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:px-0">
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

        <div className="mx-auto grid w-full max-w-[1120px] gap-4 px-4 sm:px-8 lg:px-0">
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
                  {total} {total === 1 ? "perfil salvo" : "perfis salvos"}
                </span>
                {activeQuery.isFetching ? <LoadingState label="Atualizando" /> : null}
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
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
        </div>
      </section>
    </PrivateTemplate>
  );
}
