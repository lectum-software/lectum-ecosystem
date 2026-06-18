"use client";

import {
  ArrowLeft,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Compass,
  Flame,
  PlusCircle,
  Search,
  UsersRound,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { useCommunities } from "@/api/callers/community";
import { EmptyState } from "@/components/ui/empty-state";
import { InlineAlert } from "@/components/ui/inline-alert";
import { LoadingState } from "@/components/ui/loading-state";
import { Button } from "@/registry/new-york-v4/ui/button";
import { Input } from "@/registry/new-york-v4/ui/input";
import { PrivateTemplate } from "@/templates/private";
import { navigateBackWithFallback } from "@/utils/navigation-history";
import { buildCommunityExploreCard, type CommunityExploreCard } from "./explore-content";

const PAGE_LIMIT = 10;

type ApiErrorData = {
  error?: string;
  message?: string;
  status?: number;
};

type ApiError = Error & {
  data?: ApiErrorData;
};

const resolveCommunityError = (error: unknown) => {
  const apiError = error as ApiError;
  const rawMessage =
    apiError?.data?.error ||
    apiError?.data?.message ||
    (error instanceof Error ? error.message : "");
  const normalized = rawMessage.toLowerCase();

  if (normalized.includes("token") || normalized.includes("sess")) {
    return "Sua sessão precisa estar ativa para visualizar comunidades.";
  }

  if (normalized.includes("network") || normalized.includes("conex")) {
    return "Não foi possível conectar à API agora. Tente novamente em alguns instantes.";
  }

  return rawMessage || "Não foi possível carregar as comunidades agora.";
};

const formatMembers = (value: number) => {
  if (value === 1) return "1 membro";

  return `${value.toLocaleString("pt-BR")} membros`;
};

const FeaturedCommunity = ({ community }: { community: CommunityExploreCard }) => {
  return (
    <Link
      className="group relative block min-h-[190px] overflow-hidden rounded-[24px] border border-white/70 bg-[#101827] p-4 text-white transition duration-300 sm:min-h-[224px] sm:p-5"
      href={`/app/community/${community.slug}`}
    >
      <Image
        alt={`Imagem da comunidade ${community.name}`}
        className="object-cover transition duration-700 ease-out group-hover:scale-[1.04]"
        fill
        priority
        sizes="(min-width: 1024px) 896px, (min-width: 640px) 672px, 100vw"
        src={community.imageUrl}
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,6,23,0.08)_0%,rgba(2,6,23,0.44)_42%,rgba(2,6,23,0.9)_100%)]"
      />
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-2/3 bg-[radial-gradient(ellipse_at_50%_100%,rgba(15,23,42,0.96),rgba(15,23,42,0.52)_52%,transparent_76%)]"
      />
      <div className="relative z-10 flex h-full min-h-[154px] flex-col justify-end gap-3 sm:min-h-[184px]">
        <div className="flex flex-wrap items-center gap-2">
          <span className="w-fit rounded-full border border-white/20 bg-white/18 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.1em] text-white backdrop-blur">
            {community.growthLabel ?? "Destaque"}
          </span>
          {community.category ? (
            <span className="w-fit rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[10px] font-bold text-white/90 backdrop-blur">
              {community.category}
            </span>
          ) : null}
        </div>
        <div className="grid gap-2">
          <h2 className="max-w-xl text-[1.65rem] font-black leading-[0.98] tracking-[-0.05em] sm:text-[2.35rem]">
            {community.name}
          </h2>
          <p className="line-clamp-2 max-w-2xl text-[13px] font-semibold leading-5 text-white/88 sm:text-sm sm:leading-6">
            {community.description}
          </p>
        </div>
        <span className="inline-flex w-fit items-center gap-2 rounded-full bg-white px-4 py-2 text-[13px] font-extrabold text-primary transition group-hover:translate-x-1">
          Explorar
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </span>
      </div>
    </Link>
  );
};

const CommunityCard = ({ community }: { community: CommunityExploreCard }) => {
  return (
    <Link
      className="group relative flex h-[286px] w-[min(calc(100vw-2.5rem),212px)] shrink-0 snap-start overflow-hidden rounded-[22px] border border-white/70 bg-[#101827] p-3.5 text-white transition duration-300 sm:h-[318px] sm:w-[232px] lg:h-[306px] lg:w-[238px]"
      href={`/app/community/${community.slug}`}
    >
      <Image
        alt={`Imagem da comunidade ${community.name}`}
        className="object-cover transition duration-700 ease-out group-hover:scale-[1.05]"
        fill
        sizes="(min-width: 640px) 270px, 76vw"
        src={community.imageUrl}
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,6,23,0.04)_0%,rgba(2,6,23,0.26)_44%,rgba(2,6,23,0.92)_100%)]"
      />
      <span className="absolute left-4 top-4 z-10 w-fit rounded-full border border-white/20 bg-white/18 px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.08em] text-white backdrop-blur">
        {community.category ?? "Comunidade"}
      </span>
      <div className="relative z-10 flex h-full flex-col justify-end gap-3 text-white">
        <div className="grid gap-2">
          <h3 className="line-clamp-2 text-xl font-black leading-[0.98] tracking-[-0.04em] sm:text-[1.35rem]">
            {community.name}
          </h3>
          <p className="line-clamp-2 text-xs font-semibold leading-5 text-white/82">
            {community.description}
          </p>
          <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-white/65">
            {formatMembers(community.membersCount)}
          </p>
        </div>
        <span className="inline-flex min-h-9 items-center justify-center rounded-full bg-white px-4 text-[13px] font-extrabold text-primary transition group-hover:translate-x-1">
          Explorar
        </span>
      </div>
    </Link>
  );
};

const PopularCommunitiesCarousel = ({ communities }: { communities: CommunityExploreCard[] }) => {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [canScrollNext, setCanScrollNext] = useState(false);

  const updateScrollState = useCallback(() => {
    const node = scrollRef.current;
    if (!node) return;

    setCanScrollNext(node.scrollLeft + node.clientWidth < node.scrollWidth - 8);
  }, []);

  useEffect(() => {
    const node = scrollRef.current;
    if (!node) return;
    const frame = window.requestAnimationFrame(updateScrollState);

    node.addEventListener("scroll", updateScrollState, { passive: true });
    window.addEventListener("resize", updateScrollState);

    return () => {
      window.cancelAnimationFrame(frame);
      node.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
    };
  }, [updateScrollState]);

  const scrollNext = () => {
    const node = scrollRef.current;
    if (!node) return;

    node.scrollBy({
      behavior: "smooth",
      left: Math.min(360, node.clientWidth * 0.72),
    });
  };

  return (
    <div className="relative min-w-0 max-w-full overflow-hidden">
      <div
        className="max-w-full overflow-x-auto overscroll-x-contain scroll-smooth pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        ref={scrollRef}
      >
        <div className="flex w-max max-w-none snap-x snap-mandatory gap-3.5 sm:gap-4">
          {communities.map((community) => (
            <CommunityCard community={community} key={community.communityId} />
          ))}
        </div>
      </div>

      {canScrollNext ? (
        <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-24 items-center justify-end bg-gradient-to-l from-white via-white/85 to-transparent pr-1 lg:flex">
          <button
            aria-label="Ver mais comunidades populares"
            className="pointer-events-auto grid h-10 w-10 place-items-center rounded-full border border-[#DCE7F2] bg-white/92 text-primary backdrop-blur transition hover:border-primary/35 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
            onClick={scrollNext}
            type="button"
          >
            <ChevronRight className="h-[18px] w-[18px]" aria-hidden="true" />
          </button>
        </div>
      ) : null}
    </div>
  );
};

const Pagination = ({
  currentPage,
  disabled,
  onPageChange,
  pages,
}: {
  currentPage: number;
  disabled?: boolean;
  onPageChange: (page: number) => void;
  pages: number;
}) => {
  if (pages <= 1) return null;

  return (
    <nav
      aria-label="Paginação de comunidades"
      className="flex items-center justify-between gap-3 rounded-[var(--lectum-card-radius)] border border-border bg-surface p-3"
    >
      <Button
        disabled={currentPage <= 1 || disabled}
        onClick={() => onPageChange(currentPage - 1)}
        type="button"
        variant="outline"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        Anterior
      </Button>
      <span className="text-sm font-bold text-muted">
        {currentPage} de {pages}
      </span>
      <Button
        disabled={currentPage >= pages || disabled}
        onClick={() => onPageChange(currentPage + 1)}
        type="button"
        variant="outline"
      >
        Próxima
        <ChevronRight className="h-4 w-4" aria-hidden="true" />
      </Button>
    </nav>
  );
};

export const CommunityLogic = () => {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [category] = useState(() => {
    if (typeof window === "undefined") return "";

    return new URLSearchParams(window.location.search).get("category") ?? "";
  });
  const [page, setPage] = useState(1);
  const deferredSearch = useDeferredValue(search.trim());
  const query = useMemo(
    () => ({
      page,
      limit: PAGE_LIMIT,
      search: deferredSearch || undefined,
      category: category || undefined,
    }),
    [category, deferredSearch, page],
  );
  const communities = useCommunities(query);
  const items = useMemo(() => communities.data?.data ?? [], [communities.data?.data]);
  const exploreCards = useMemo(
    () => items.map((community, index) => buildCommunityExploreCard(community, index)),
    [items],
  );
  const featured =
    !category && !deferredSearch
      ? (exploreCards.find((community) => community.isFeatured) ?? exploreCards[0] ?? null)
      : null;
  const visibleCards = featured
    ? exploreCards.filter((community) => community.communityId !== featured.communityId)
    : exploreCards;
  const popularCards = visibleCards.filter((community) => community.isPopular);
  const carouselCards = popularCards.length > 0 ? popularCards : visibleCards;
  const errorMessage = communities.isError ? resolveCommunityError(communities.error) : null;

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  return (
    <PrivateTemplate
      allowAnonymous
      contentClassName="relative min-h-screen max-w-none overflow-x-hidden bg-white px-0 pt-0 sm:pt-0"
      navigationTheme="solidWhite"
    >
      <section className="relative z-10 mx-auto grid w-full max-w-[430px] min-w-0 gap-6 overflow-x-clip px-5 pb-10 sm:max-w-2xl lg:max-w-4xl">
        <div className="sticky top-0 z-20 -mx-5 bg-white/95 px-5 py-2.5 backdrop-blur supports-[backdrop-filter]:bg-white/86">
          <div className="flex items-center gap-3">
            <button
              aria-label="Voltar"
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-[#E2E8F0] bg-white text-[#64748B] transition hover:border-primary/40 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
              onClick={() => navigateBackWithFallback(router)}
              type="button"
            >
              <ArrowLeft className="h-[18px] w-[18px]" aria-hidden="true" />
            </button>
            <div className="relative min-w-0 flex-1">
              <Search
                className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle"
                aria-hidden="true"
              />
              <Input
                aria-label="Explorar comunidades"
                className="h-10 rounded-full border-[#E2E8F0] bg-[#F8FAFC] pl-10 text-sm shadow-none placeholder:text-[#94A3B8] sm:h-11"
                onChange={(event) => handleSearchChange(event.target.value)}
                placeholder="Explorar comunidades..."
                type="search"
                value={search}
              />
            </div>
          </div>
        </div>

        <header className="grid gap-3 pt-2">
          <p className="text-xs font-extrabold uppercase tracking-[0.08em] text-primary">
            Comunidades Lectum
          </p>
          <h1 className="text-[2.05rem] font-black leading-[0.98] tracking-[-0.055em] text-[#111827] sm:text-[2.8rem]">
            Encontre seu espaço seguro
          </h1>
          <p className="max-w-xl text-sm font-medium leading-6 text-[#64748B] sm:text-[15px]">
            Conecte-se com pessoas que compartilham jornadas semelhantes à sua.
          </p>
        </header>

        {communities.isLoading || communities.isPending ? (
          <div className="grid min-h-52 place-items-center rounded-[var(--lectum-card-radius)] border border-border bg-surface">
            <LoadingState label="Carregando comunidades reais" />
          </div>
        ) : null}

        {errorMessage ? (
          <InlineAlert title="Não foi possível carregar" variant="error">
            {errorMessage}
          </InlineAlert>
        ) : null}

        {!communities.isLoading && !communities.isPending && !errorMessage && items.length === 0 ? (
          <EmptyState
            action={
              <Button asChild>
                <Link href="/app/community/suggest">
                  <PlusCircle className="h-4 w-4" aria-hidden="true" />
                  Solicitar nova comunidade
                </Link>
              </Button>
            }
            description="Ainda não há comunidades reais cadastradas para estes filtros. Você pode sugerir um tema para análise da equipe."
            icon={Compass}
            title="Nenhuma comunidade disponível"
          />
        ) : null}

        {featured ? (
          <section className="grid gap-3.5">
            <div className="flex items-center gap-2">
              <Flame className="h-[18px] w-[18px] text-warning" aria-hidden="true" />
              <h2 className="text-lg font-black tracking-[-0.025em] text-[#111827]">
                Tendência Hoje
              </h2>
            </div>
            <FeaturedCommunity community={featured} />
          </section>
        ) : null}

        {carouselCards.length > 0 ? (
          <section className="grid gap-3.5">
            <div className="flex items-center gap-2">
              <UsersRound className="h-[18px] w-[18px] text-primary" aria-hidden="true" />
              <h2 className="text-lg font-black tracking-[-0.025em] text-[#111827]">
                {featured ? "Mais Populares" : "Comunidades"}
              </h2>
            </div>
            <PopularCommunitiesCarousel
              communities={carouselCards}
              key={carouselCards.map((community) => community.communityId).join("|")}
            />
          </section>
        ) : null}

        <section className="grid justify-items-center gap-3.5 rounded-[24px] border border-[#E2E8F0] bg-[#F8FAFC] px-5 py-8 text-center">
          <span className="grid h-12 w-12 place-items-center rounded-2xl border border-[#DCEBFA] bg-white text-primary">
            <PlusCircle className="h-6 w-6" aria-hidden="true" />
          </span>
          <div className="grid gap-2">
            <h2 className="text-xl font-black tracking-[-0.035em] text-[#111827]">
              Sugira uma Comunidade
            </h2>
            <p className="max-w-sm text-sm font-medium leading-6 text-[#64748B]">
              Não encontrou o que procurava? Nossa equipe está pronta para criar novos espaços para
              você.
            </p>
          </div>
          <Button asChild className="h-10 w-full max-w-xs rounded-full text-sm shadow-none">
            <Link href="/app/community/suggest">Solicitar Nova Comunidade</Link>
          </Button>
        </section>

        <Pagination
          currentPage={page}
          disabled={communities.isFetching}
          onPageChange={setPage}
          pages={communities.data?.pages ?? 0}
        />
      </section>
    </PrivateTemplate>
  );
};
