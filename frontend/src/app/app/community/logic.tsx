"use client";

import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Compass,
  Flame,
  PlusCircle,
  Search,
  Sparkles,
  TrendingUp,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { useDeferredValue, useMemo, useState } from "react";
import { useCommunities } from "@/api/callers/community";
import type { Community } from "@/api/generator/types/community";
import { EmptyState } from "@/components/ui/empty-state";
import { InlineAlert } from "@/components/ui/inline-alert";
import { LoadingState } from "@/components/ui/loading-state";
import { cn } from "@/lib/utils";
import { Button } from "@/registry/new-york-v4/ui/button";
import { Input } from "@/registry/new-york-v4/ui/input";
import { PrivateTemplate } from "@/templates/private";

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

const CommunityGradient = ({ index }: { index: number }) => {
  const gradients = [
    "from-primary/90 via-primary/70 to-primary-soft",
    "from-success/90 via-primary/60 to-primary-soft",
    "from-warning/90 via-primary/60 to-surface-muted",
  ];

  return (
    <div
      aria-hidden="true"
      className={cn("absolute inset-0 bg-gradient-to-br", gradients[index % gradients.length])}
    >
      <span className="absolute -left-10 top-8 h-32 w-32 rounded-full bg-white/25 blur-2xl" />
      <span className="absolute -right-12 bottom-2 h-40 w-40 rounded-full bg-background/30 blur-3xl" />
    </div>
  );
};

const FeaturedCommunity = ({ community }: { community: Community }) => {
  return (
    <Link
      className="group relative min-h-[194px] overflow-hidden rounded-[var(--lectum-card-radius)] border border-border bg-surface p-5 text-white shadow-[var(--lectum-shadow-soft)] transition hover:-translate-y-0.5 hover:shadow-lg"
      href={`/app/community/${community.slug}`}
    >
      <CommunityGradient index={0} />
      <div className="relative z-10 flex h-full min-h-[154px] flex-col justify-end gap-4">
        <span className="w-fit rounded-full bg-white/20 px-3 py-1 text-xs font-extrabold uppercase tracking-[0.08em] backdrop-blur">
          Destaque real
        </span>
        <div className="grid gap-2">
          <h2 className="text-3xl font-black leading-tight tracking-tight">{community.name}</h2>
          {community.description ? (
            <p className="line-clamp-2 text-sm font-medium leading-6 text-white/90">
              {community.description}
            </p>
          ) : null}
        </div>
        <span className="inline-flex w-fit items-center gap-2 rounded-full bg-white px-5 py-2 text-sm font-extrabold text-primary transition group-hover:translate-x-1">
          Explorar
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </span>
      </div>
    </Link>
  );
};

const CommunityCard = ({ community, index }: { community: Community; index: number }) => {
  return (
    <Link
      className="group relative grid min-h-[214px] overflow-hidden rounded-[var(--lectum-card-radius)] border border-border bg-surface p-4 shadow-[var(--lectum-shadow-soft)] transition hover:-translate-y-0.5 hover:shadow-lg"
      href={`/app/community/${community.slug}`}
    >
      <CommunityGradient index={index + 1} />
      <div className="relative z-10 flex h-full flex-col justify-end gap-4 text-white">
        {community.category ? (
          <span className="w-fit rounded-full bg-white/20 px-3 py-1 text-xs font-bold backdrop-blur">
            {community.category}
          </span>
        ) : null}
        <div>
          <h3 className="line-clamp-2 text-xl font-black leading-tight">{community.name}</h3>
          <p className="mt-1 text-xs font-semibold text-white/80">
            {formatMembers(community.members_count)}
          </p>
        </div>
        <span className="inline-flex min-h-11 items-center justify-center rounded-full bg-white px-4 text-sm font-extrabold text-primary transition group-hover:translate-x-1">
          Abrir feed
        </span>
      </div>
    </Link>
  );
};

const CategoryFilter = ({
  activeCategory,
  categories,
  onChange,
}: {
  activeCategory: string;
  categories: string[];
  onChange: (category: string) => void;
}) => {
  if (categories.length === 0) return null;

  return (
    <div className="-mx-5 overflow-x-auto px-5 pb-1">
      <div className="flex min-w-max gap-2">
        <button
          className={cn(
            "min-h-10 rounded-full border px-4 text-sm font-bold transition",
            activeCategory === ""
              ? "border-primary bg-primary text-white"
              : "border-border bg-surface text-muted hover:border-primary/50 hover:text-primary",
          )}
          onClick={() => onChange("")}
          type="button"
        >
          Explorar
        </button>
        {categories.map((category) => {
          const isActive = activeCategory === category;

          return (
            <button
              className={cn(
                "min-h-10 rounded-full border px-4 text-sm font-bold transition",
                isActive
                  ? "border-primary bg-primary text-white"
                  : "border-border bg-surface text-muted hover:border-primary/50 hover:text-primary",
              )}
              key={category}
              onClick={() => onChange(category)}
              type="button"
            >
              {category}
            </button>
          );
        })}
      </div>
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
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState(() => {
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
  const items = communities.data?.data ?? [];
  const categories = communities.data?.categories ?? [];
  const featured = !category && !deferredSearch ? items[0] : null;
  const visibleCards = featured ? items.slice(1) : items;
  const errorMessage = communities.isError ? resolveCommunityError(communities.error) : null;

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleCategoryChange = (value: string) => {
    setCategory(value);
    setPage(1);
  };

  return (
    <PrivateTemplate>
      <section className="mx-auto grid w-full max-w-[430px] gap-6 sm:max-w-2xl lg:max-w-4xl">
        <div className="sticky top-0 z-20 -mx-5 border-b border-border bg-background/95 px-5 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/85">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle"
              aria-hidden="true"
            />
            <Input
              aria-label="Explorar comunidades"
              className="rounded-full bg-surface-muted pl-11"
              onChange={(event) => handleSearchChange(event.target.value)}
              placeholder="Explorar comunidades..."
              type="search"
              value={search}
            />
          </div>
        </div>

        <header className="grid gap-3">
          <p className="text-sm font-bold text-primary">Comunidades Lectum</p>
          <h1 className="text-4xl font-black leading-tight tracking-tight text-foreground">
            Encontre seu espaço seguro
          </h1>
          <p className="max-w-xl text-base leading-7 text-muted">
            Conecte-se com pessoas que compartilham jornadas semelhantes à sua. A lista abaixo vem
            apenas de comunidades persistidas no backend.
          </p>
        </header>

        <CategoryFilter
          activeCategory={category}
          categories={categories}
          onChange={handleCategoryChange}
        />

        {communities.isLoading || communities.isPending ? (
          <div className="grid min-h-52 place-items-center rounded-[var(--lectum-card-radius)] border border-border bg-surface shadow-[var(--lectum-shadow-soft)]">
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
          <section className="grid gap-4">
            <div className="flex items-center gap-2">
              <Flame className="h-5 w-5 text-warning" aria-hidden="true" />
              <h2 className="text-xl font-black text-foreground">Tendência hoje</h2>
            </div>
            <FeaturedCommunity community={featured} />
          </section>
        ) : null}

        {visibleCards.length > 0 ? (
          <section className="grid gap-4">
            <div className="flex items-center gap-2">
              <UsersRound className="h-5 w-5 text-primary" aria-hidden="true" />
              <h2 className="text-xl font-black text-foreground">
                {featured ? "Mais populares" : "Comunidades"}
              </h2>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {visibleCards.map((community, index) => (
                <CommunityCard community={community} index={index} key={community.id} />
              ))}
            </div>
          </section>
        ) : null}

        {items.length > 0 ? (
          <section className="grid gap-3 rounded-[var(--lectum-card-radius)] border border-border bg-surface p-5 shadow-[var(--lectum-shadow-soft)]">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" aria-hidden="true" />
              <h2 className="text-xl font-black text-foreground">Em ascensão</h2>
            </div>
            <div className="grid gap-3">
              {items.slice(0, 3).map((community) => (
                <Link
                  className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-background px-4 py-3 transition hover:border-primary/50 hover:bg-primary-soft/40"
                  href={`/app/community/${community.slug}`}
                  key={`rising-${community.id}`}
                >
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary-soft text-primary">
                    <Sparkles className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <strong className="block truncate text-sm text-foreground">
                      {community.name}
                    </strong>
                    <span className="text-xs font-semibold text-muted">
                      {formatMembers(community.members_count)}
                    </span>
                  </span>
                  <ChevronRight className="h-5 w-5 text-subtle" aria-hidden="true" />
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        <section className="grid justify-items-center gap-4 rounded-[var(--lectum-card-radius)] border border-border bg-surface px-6 py-10 text-center shadow-[var(--lectum-shadow-soft)]">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-primary-soft text-primary">
            <PlusCircle className="h-7 w-7" aria-hidden="true" />
          </span>
          <div className="grid gap-2">
            <h2 className="text-2xl font-black text-foreground">Sugira uma Comunidade</h2>
            <p className="max-w-sm text-sm leading-6 text-muted">
              Não encontrou o que procurava? Sua sugestão vira um registro pendente para curadoria.
            </p>
          </div>
          <Button asChild className="w-full max-w-xs rounded-full">
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
