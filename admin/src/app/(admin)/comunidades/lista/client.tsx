"use client";

import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileText,
  Flag,
  MessageCircleMore,
  MessageSquareText,
  RefreshCw,
  Search,
  UsersRound,
} from "lucide-react";
import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { useAdminCommunitiesList } from "@/api/callers/communities";
import { resolveApiError } from "@/api/handle";
import type {
  AdminCommunitiesListItem,
  AdminCommunitiesListQuery,
  AdminCommunitiesListSort,
} from "@/api/req/communities";
import { cn } from "@/lib/utils";

const SORT_OPTIONS: Array<{ id: AdminCommunitiesListSort; label: string }> = [
  { id: "name", label: "Nome" },
  { id: "members", label: "Mais membros" },
  { id: "posts", label: "Mais posts" },
  { id: "activity", label: "Mais atividade" },
  { id: "recent", label: "Cadastro recente" },
];

const numberFormatter = new Intl.NumberFormat("pt-BR");
const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  timeZone: "America/Sao_Paulo",
  year: "numeric",
});
const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
const listSorts = new Set(SORT_OPTIONS.map((item) => item.id));
const LOADING_ROWS = ["loading-1", "loading-2", "loading-3", "loading-4", "loading-5", "loading-6"];
const SEARCH_DEBOUNCE_MS = 350;

const CardShell = ({ children, className }: { children?: ReactNode; className?: string }) => (
  <section
    className={cn(
      "min-w-0 max-w-full rounded-card border border-border/80 bg-surface/95 shadow-admin-soft backdrop-blur",
      className,
    )}
  >
    {children}
  </section>
);

const parsePositiveNumber = (value: string | null, fallback: number) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;

  return Math.floor(parsed);
};

const parseQuery = (params: URLSearchParams): AdminCommunitiesListQuery => {
  const sort = params.get("sort") as AdminCommunitiesListSort | null;

  return {
    category: params.get("category") || undefined,
    limit: Math.min(50, parsePositiveNumber(params.get("limit"), 12)),
    page: parsePositiveNumber(params.get("page"), 1),
    q: params.get("q") || undefined,
    sort: sort && listSorts.has(sort) ? sort : "name",
  };
};

const canRenderImage = (src: string | null) => {
  if (!src) return false;
  if (src.startsWith("/")) return true;

  try {
    const url = new URL(src);
    const apiHost = new URL(apiUrl).hostname;

    return ["localhost", "127.0.0.1", apiHost].includes(url.hostname);
  } catch {
    return false;
  }
};

const formatDate = (value: string | null) => {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return dateFormatter.format(date);
};

const SearchBox = ({ onSearch, value }: { onSearch: (value: string) => void; value?: string }) => {
  const [draft, setDraft] = useState(value || "");
  const onSearchRef = useRef(onSearch);

  useEffect(() => {
    onSearchRef.current = onSearch;
  }, [onSearch]);

  useEffect(() => {
    const normalized = draft.trim();
    const current = value || "";

    if (normalized === current) return;

    const timer = window.setTimeout(() => {
      onSearchRef.current(normalized);
    }, SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [draft, value]);

  return (
    <label className="relative block h-12 w-full min-w-0">
      <span className="sr-only">Buscar comunidade por nome, slug ou descrição</span>
      <Search
        aria-hidden
        className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle"
      />
      <input
        className="h-full w-full appearance-none rounded-full border border-border bg-surface py-0 pl-10 pr-4 text-sm font-bold text-foreground shadow-control outline-none transition placeholder:text-subtle focus:border-primary"
        onChange={(event) => setDraft(event.target.value)}
        placeholder="Nome, slug ou descrição..."
        type="search"
        value={draft}
      />
    </label>
  );
};

const CommunityAvatar = ({ item }: { item: AdminCommunitiesListItem }) => {
  if (canRenderImage(item.avatar_url)) {
    return (
      <Image
        alt=""
        className="h-12 w-12 rounded-2xl border border-border object-cover"
        height={48}
        src={item.avatar_url || ""}
        width={48}
      />
    );
  }

  return (
    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-border bg-primary-soft text-primary">
      <MessageCircleMore aria-hidden className="h-5 w-5" />
    </span>
  );
};

const CompactBadge = ({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "danger" | "neutral" | "primary" | "success" | "warning";
}) => (
  <span
    className={cn(
      "inline-flex rounded-full px-2.5 py-1 text-xs font-bold",
      tone === "danger" && "bg-danger/10 text-danger",
      tone === "neutral" && "bg-surface-muted text-muted",
      tone === "primary" && "bg-primary-soft text-primary",
      tone === "success" && "bg-success/10 text-success",
      tone === "warning" && "bg-warning/10 text-warning",
    )}
  >
    {children}
  </span>
);

const CommunitySummary = ({ item }: { item: AdminCommunitiesListItem }) => (
  <div className="flex min-w-0 items-center gap-3">
    <CommunityAvatar item={item} />
    <div className="min-w-0">
      <p className="truncate font-semibold text-foreground">{item.name}</p>
      <p className="truncate text-xs font-bold text-muted" title={`/${item.slug}`}>
        /{item.slug}
      </p>
      {item.description ? (
        <p className="mt-1 line-clamp-1 text-xs font-medium text-muted" title={item.description}>
          {item.description}
        </p>
      ) : null}
    </div>
  </div>
);

const RowActions = ({ item }: { item: AdminCommunitiesListItem }) => (
  <div className="flex shrink-0 items-center justify-center gap-1.5">
    <button
      className="grid h-8 w-8 place-items-center rounded-full border border-border bg-surface text-foreground shadow-control transition hover:border-primary hover:text-primary"
      title="Abrir detalhe administrativo"
      type="button"
    >
      <Eye aria-hidden className="h-4 w-4" />
      <span className="sr-only">Abrir detalhe administrativo de {item.name}</span>
    </button>
  </div>
);

const CommunityCard = ({
  item,
  onOpenDetail,
}: {
  item: AdminCommunitiesListItem;
  onOpenDetail: (href: string) => void;
}) => (
  <button
    aria-label={`Abrir detalhe administrativo de ${item.name}`}
    className="min-w-0 cursor-pointer rounded-[1.5rem] border border-border bg-surface p-4 text-left transition hover:border-primary/40 hover:bg-primary-soft/25 focus:bg-primary-soft/50 focus:outline-none"
    onClick={() => onOpenDetail(item.detail_url)}
    type="button"
  >
    <div className="flex min-w-0 items-start justify-between gap-3">
      <CommunitySummary item={item} />
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-border bg-surface text-foreground shadow-control">
        <Eye aria-hidden className="h-4 w-4" />
      </span>
    </div>

    <div className="mt-4 flex flex-wrap gap-2">
      <CompactBadge tone={item.category ? "primary" : "neutral"}>
        {item.category || "Sem categoria"}
      </CompactBadge>
      {item.reports_count > 0 ? (
        <CompactBadge tone="danger">
          {numberFormatter.format(item.reports_count)} denúncias
        </CompactBadge>
      ) : (
        <CompactBadge tone="success">Sem denúncias</CompactBadge>
      )}
    </div>

    <dl className="mt-4 grid grid-cols-2 gap-2 text-xs text-muted">
      <div className="rounded-2xl bg-surface-muted px-3 py-2">
        <dt>Membros</dt>
        <dd className="mt-1 text-sm font-semibold text-foreground">
          {numberFormatter.format(item.members_count)}
        </dd>
      </div>
      <div className="rounded-2xl bg-surface-muted px-3 py-2">
        <dt>Atividade</dt>
        <dd className="mt-1 text-sm font-semibold text-foreground">
          {numberFormatter.format(item.activity_count)}
        </dd>
      </div>
    </dl>
  </button>
);

const CommunitiesTable = ({
  items,
  onOpenDetail,
}: {
  items: AdminCommunitiesListItem[];
  onOpenDetail: (href: string) => void;
}) => (
  <>
    <div className="grid min-w-0 gap-3 p-3 lg:hidden">
      {items.map((item) => (
        <CommunityCard item={item} key={item.id} onOpenDetail={onOpenDetail} />
      ))}
    </div>

    <div className="hidden min-w-0 max-w-full overflow-hidden lg:block">
      <table className="w-full table-fixed text-left text-sm">
        <caption className="sr-only">Lista administrativa de comunidades</caption>
        <colgroup>
          <col className="w-[30%]" />
          <col className="w-[14%]" />
          <col className="w-[10%]" />
          <col className="w-[10%]" />
          <col className="w-[12%]" />
          <col className="w-[10%]" />
          <col className="w-[10%]" />
          <col className="w-[4%]" />
        </colgroup>
        <thead className="border-b border-border bg-surface-muted/70 text-xs text-muted">
          <tr>
            <th className="py-4 pl-4 pr-2 font-semibold">Comunidade</th>
            <th className="px-2 py-4 font-semibold">Categoria</th>
            <th className="px-2 py-4 font-semibold">Membros</th>
            <th className="px-2 py-4 font-semibold">Posts</th>
            <th className="px-2 py-4 font-semibold">Comentários</th>
            <th className="px-2 py-4 font-semibold">Denúncias</th>
            <th className="px-2 py-4 font-semibold">Atividade</th>
            <th className="px-2 py-4 text-center font-semibold">Ações</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {items.map((item) => (
            <tr
              aria-label={`Abrir detalhe administrativo de ${item.name}`}
              className="cursor-pointer transition hover:bg-primary-soft/35 focus:bg-primary-soft/60 focus:outline-none"
              key={item.id}
              onClick={() => onOpenDetail(item.detail_url)}
              onKeyDown={(event) => {
                if (event.target !== event.currentTarget) return;
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onOpenDetail(item.detail_url);
                }
              }}
              tabIndex={0}
            >
              <td className="py-4 pl-4 pr-2">
                <CommunitySummary item={item} />
              </td>
              <td className="whitespace-nowrap px-2 py-3">
                <CompactBadge tone={item.category ? "primary" : "neutral"}>
                  {item.category || "Sem categoria"}
                </CompactBadge>
              </td>
              <td className="whitespace-nowrap px-2 py-3 font-semibold text-foreground">
                {numberFormatter.format(item.members_count)}
              </td>
              <td className="whitespace-nowrap px-2 py-3 font-semibold text-foreground">
                {numberFormatter.format(item.posts_count)}
              </td>
              <td className="whitespace-nowrap px-2 py-3 font-semibold text-foreground">
                {numberFormatter.format(item.comments_count)}
              </td>
              <td className="whitespace-nowrap px-2 py-3">
                <span
                  className={cn(
                    "inline-flex items-center gap-1 font-semibold",
                    item.reports_count > 0 ? "text-danger" : "text-success",
                  )}
                >
                  <Flag aria-hidden className="h-4 w-4" />
                  {numberFormatter.format(item.reports_count)}
                </span>
              </td>
              <td className="whitespace-nowrap px-2 py-3">
                <p className="font-semibold text-foreground">
                  {numberFormatter.format(item.activity_count)}
                </p>
                <p className="text-xs font-medium text-muted">
                  {formatDate(item.last_activity_at)}
                </p>
              </td>
              <td className="px-2 py-3 text-center">
                <RowActions item={item} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </>
);

const LoadingState = () => (
  <div className="space-y-4">
    {LOADING_ROWS.map((key) => (
      <div className="h-24 animate-pulse rounded-3xl bg-surface-muted" key={key} />
    ))}
  </div>
);

const ErrorState = ({ message, onRetry }: { message: string; onRetry: () => void }) => (
  <CardShell className="p-6">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex gap-3">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-danger/10 text-danger">
          <AlertTriangle aria-hidden className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Não foi possível carregar a lista</h2>
          <p className="mt-1 text-sm text-muted">{message}</p>
        </div>
      </div>
      <button
        className="inline-flex h-11 items-center justify-center gap-2 rounded-control border border-border bg-surface px-4 text-sm font-semibold text-foreground transition hover:border-border-strong"
        onClick={onRetry}
        type="button"
      >
        <RefreshCw aria-hidden className="h-4 w-4" />
        Tentar novamente
      </button>
    </div>
  </CardShell>
);

const EmptyState = () => (
  <div className="rounded-3xl border border-dashed border-border bg-surface-muted p-8 text-center">
    <MessageCircleMore aria-hidden className="mx-auto h-10 w-10 text-primary" />
    <h2 className="mt-3 text-lg font-semibold text-foreground">Nenhuma comunidade encontrada</h2>
    <p className="mt-1 text-sm text-muted">
      Ajuste a busca ou remova filtros para ver as comunidades cadastradas.
    </p>
  </div>
);

const pageNumbers = (current: number, pages: number) => {
  const window = new Set([1, pages, current - 1, current, current + 1, current + 2]);

  return [...window]
    .filter((value) => value >= 1 && value <= pages)
    .sort((left, right) => left - right);
};

const Pagination = ({
  onChangePage,
  onLimit,
  page,
  pages,
  perPage,
}: {
  onChangePage: (page: number) => void;
  onLimit: (limit: number) => void;
  page: number;
  pages: number;
  perPage: number;
}) => {
  const numbers = pageNumbers(page, pages);

  return (
    <div className="flex flex-col gap-4 border-t border-border px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-2">
        <button
          className="grid h-10 w-10 place-items-center rounded-2xl border border-border bg-surface text-foreground disabled:opacity-40"
          disabled={page <= 1}
          onClick={() => onChangePage(page - 1)}
          type="button"
        >
          <ChevronLeft aria-hidden className="h-4 w-4" />
          <span className="sr-only">Página anterior</span>
        </button>
        {numbers.map((number, index) => (
          <div className="flex items-center gap-2" key={number}>
            {index > 0 && number - numbers[index - 1] > 1 ? (
              <span className="px-1 text-sm font-semibold text-muted">...</span>
            ) : null}
            <button
              aria-current={number === page ? "page" : undefined}
              className={cn(
                "grid h-10 min-w-10 place-items-center rounded-2xl border border-border bg-surface px-3 text-sm font-semibold text-foreground",
                number === page && "border-primary bg-primary text-white",
              )}
              onClick={() => onChangePage(number)}
              type="button"
            >
              {number}
            </button>
          </div>
        ))}
        <button
          className="grid h-10 w-10 place-items-center rounded-2xl border border-border bg-surface text-foreground disabled:opacity-40"
          disabled={page >= pages}
          onClick={() => onChangePage(page + 1)}
          type="button"
        >
          <ChevronRight aria-hidden className="h-4 w-4" />
          <span className="sr-only">Próxima página</span>
        </button>
      </div>
      <label className="text-xs font-semibold text-muted">
        Itens por página
        <select
          className="ml-2 h-10 rounded-control border border-border bg-surface px-3 text-sm font-bold text-foreground shadow-control"
          onChange={(event) => onLimit(Number(event.target.value))}
          value={perPage}
        >
          {[8, 12, 20, 50].map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
};

export const AdminCommunitiesListClient = () => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchString = searchParams.toString();
  const query = useMemo(() => parseQuery(new URLSearchParams(searchString)), [searchString]);
  const listQuery = useAdminCommunitiesList(query);
  const queryError = listQuery.error ? resolveApiError(listQuery.error) : null;

  const replaceParams = (
    updates: Partial<Record<keyof AdminCommunitiesListQuery, string | number | null>>,
    options: { resetPage?: boolean } = { resetPage: true },
  ) => {
    const params = new URLSearchParams(searchString);

    for (const [key, value] of Object.entries(updates)) {
      if (value === null || value === undefined || value === "") {
        params.delete(key);
      } else {
        params.set(key, String(value));
      }
    }

    if (options.resetPage !== false) params.delete("page");
    const next = params.toString();
    router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false });
  };

  const summary = listQuery.data;
  const items = summary?.data ?? [];
  const pages = summary?.pages ?? 1;
  const page = Math.min(query.page ?? 1, pages);
  const categories = summary?.filters.categories ?? [];

  return (
    <div className="min-w-0 max-w-full space-y-7 overflow-x-clip">
      <header className="rounded-card border border-border/70 bg-surface/90 p-5 shadow-admin-soft backdrop-blur md:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">
              Comunidades
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground md:text-4xl">
              Lista de Comunidades
            </h1>
            <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-muted">
              Acesse todas as comunidades cadastradas na plataforma.
            </p>
          </div>
        </div>
      </header>

      <div className="min-w-0 space-y-4">
        <div className="flex min-w-0 flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
          <div className="min-w-0 xl:w-full xl:max-w-[560px]">
            <SearchBox onSearch={(value) => replaceParams({ q: value || null })} value={query.q} />
          </div>
          <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end xl:flex-nowrap xl:justify-end">
            <label className="flex min-w-0 flex-col gap-1 text-xs font-semibold text-muted sm:min-w-[220px]">
              Ordenar por
              <span className="relative block">
                <select
                  className="h-12 w-full min-w-0 appearance-none rounded-full border border-border bg-surface py-0 pl-4 pr-12 text-sm font-bold text-foreground shadow-control outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
                  onChange={(event) =>
                    replaceParams({ sort: event.target.value as AdminCommunitiesListSort })
                  }
                  value={query.sort || "name"}
                >
                  {SORT_OPTIONS.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <ChevronRight
                  aria-hidden
                  className="pointer-events-none absolute right-5 top-1/2 h-4 w-4 -translate-y-1/2 rotate-90 text-foreground"
                />
              </span>
            </label>
            <label className="flex min-w-0 flex-col gap-1 text-xs font-semibold text-muted sm:min-w-[220px]">
              Categoria
              <span className="relative block">
                <select
                  className="h-12 w-full min-w-0 appearance-none rounded-full border border-border bg-surface py-0 pl-4 pr-12 text-sm font-bold text-foreground shadow-control outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
                  onChange={(event) => replaceParams({ category: event.target.value || null })}
                  value={query.category || ""}
                >
                  <option value="">Todas as categorias</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.label} ({numberFormatter.format(category.count)})
                    </option>
                  ))}
                </select>
                <ChevronRight
                  aria-hidden
                  className="pointer-events-none absolute right-5 top-1/2 h-4 w-4 -translate-y-1/2 rotate-90 text-foreground"
                />
              </span>
            </label>
            <div className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-border bg-surface px-4 text-sm font-semibold text-foreground shadow-control">
              <MessageCircleMore aria-hidden className="h-4 w-4" />
              Filtros ativos
              <span className="rounded-full bg-primary-soft px-2 py-0.5 text-xs text-primary">
                {summary?.active_filters_count ?? 0}
              </span>
            </div>
          </div>
        </div>

        <CardShell className="overflow-hidden">
          <div className="grid gap-3 border-b border-border px-4 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
            <p className="text-sm font-semibold text-foreground">
              {summary ? numberFormatter.format(summary.count) : "—"} comunidades encontradas
            </p>
            <div className="flex flex-wrap gap-2 text-xs font-semibold text-muted">
              <span className="inline-flex items-center gap-1 rounded-full bg-surface-muted px-2.5 py-1">
                <UsersRound aria-hidden className="h-3.5 w-3.5" />
                Membros
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-surface-muted px-2.5 py-1">
                <FileText aria-hidden className="h-3.5 w-3.5" />
                Posts
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-surface-muted px-2.5 py-1">
                <MessageSquareText aria-hidden className="h-3.5 w-3.5" />
                Comentários
              </span>
            </div>
          </div>

          <div className="p-4 lg:p-0">
            {listQuery.isLoading ? <LoadingState /> : null}
            {listQuery.isError && queryError ? (
              <div className="p-4">
                <ErrorState message={queryError} onRetry={() => void listQuery.refetch()} />
              </div>
            ) : null}
            {summary && items.length === 0 ? <EmptyState /> : null}
            {summary && items.length > 0 ? (
              <CommunitiesTable items={items} onOpenDetail={(href) => router.push(href)} />
            ) : null}
          </div>

          {summary ? (
            <Pagination
              onChangePage={(nextPage) => replaceParams({ page: nextPage }, { resetPage: false })}
              onLimit={(limit) => replaceParams({ limit, page: 1 }, { resetPage: false })}
              page={page}
              pages={pages}
              perPage={summary.per_page}
            />
          ) : null}
        </CardShell>
      </div>
    </div>
  );
};
