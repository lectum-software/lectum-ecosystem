"use client";

import {
  ArrowLeft,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  FileText,
  MessageCircle,
  PenLine,
  Reply,
  Search,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useMyPosts } from "@/api/callers/posts";
import type { PostListPost, UserPostListItem, UserPostsType } from "@/api/generator/types/posts";
import { CommunityPostCard } from "@/components/community/community-post-card";
import { EmptyState } from "@/components/ui/empty-state";
import { InlineAlert } from "@/components/ui/inline-alert";
import { LoadingState } from "@/components/ui/loading-state";
import { useAppSelector } from "@/hooks/redux";
import { cn } from "@/lib/utils";
import { Button } from "@/registry/new-york-v4/ui/button";
import { PrivateTemplate } from "@/templates/private";
import { DEFAULT_COMMUNITY_FEED_HREF } from "@/utils/community";

const PAGE_LIMIT = 10;

const FILTERS: Array<{ label: string; value: UserPostsType }> = [
  { label: "Todos", value: "all" },
  { label: "Posts", value: "posts" },
  { label: "Respostas", value: "replies" },
];

type ApiErrorData = {
  error?: string;
  message?: string;
  status?: number;
};

type ApiError = Error & {
  data?: ApiErrorData;
};

const resolvePostsError = (error: unknown) => {
  const apiError = error as ApiError;
  const rawMessage =
    apiError?.data?.error ||
    apiError?.data?.message ||
    (error instanceof Error ? error.message : "");
  const normalized = rawMessage.toLowerCase();

  if (normalized.includes("token") || normalized.includes("sess")) {
    return "Sua sessão precisa estar ativa para visualizar seus posts.";
  }

  if (normalized.includes("network") || normalized.includes("conex")) {
    return "Não foi possível conectar à API agora. Tente novamente em alguns instantes.";
  }

  return rawMessage || "Não foi possível carregar seus posts agora.";
};

const formatRelativeTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "agora";

  const diffInSeconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  const minutes = Math.floor(diffInSeconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (minutes < 1) return "agora";
  if (minutes < 60) return `há ${minutes} min`;
  if (hours < 24) return `há ${hours} h`;
  if (days < 7) return `há ${days} d`;

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
  }).format(date);
};

const statusMeta = (status: string) => {
  if (status === "pendente") {
    return {
      label: "Pendente",
      className: "border-warning/25 bg-warning/10 text-warning",
    };
  }

  if (status === "removido") {
    return {
      label: "Removido",
      className: "border-danger/25 bg-danger/10 text-danger",
    };
  }

  return {
    label: "Publicado",
    className: "border-success/25 bg-success/10 text-success",
  };
};

const StatusBadge = ({ status }: { status: string }) => {
  const meta = statusMeta(status);

  return (
    <span
      className={cn(
        "ml-auto shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.08em]",
        meta.className,
      )}
    >
      {meta.label}
    </span>
  );
};

const FilterTabs = ({
  disabled,
  onChange,
  value,
}: {
  disabled?: boolean;
  onChange: (value: UserPostsType) => void;
  value: UserPostsType;
}) => (
  <nav aria-label="Filtrar meus posts" className="overflow-x-auto [scrollbar-width:none]">
    <div className="flex min-w-max gap-2 pb-1">
      {FILTERS.map((item) => {
        const active = item.value === value;

        return (
          <button
            aria-pressed={active}
            className={cn(
              "min-h-10 rounded-full border px-5 text-sm font-black transition disabled:opacity-70",
              active
                ? "border-primary bg-primary-soft text-primary"
                : "border-border bg-surface text-muted hover:border-primary/50 hover:text-primary",
            )}
            disabled={disabled}
            key={item.value}
            onClick={() => onChange(item.value)}
            type="button"
          >
            {item.label}
          </button>
        );
      })}
    </div>
  </nav>
);

const ReplyItemCard = ({
  item,
  onShare,
}: {
  item: UserPostListItem;
  onShare: (post: PostListPost) => void;
}) => {
  const reply = item.reply;
  if (!reply) return null;

  return (
    <article className="grid gap-4 rounded-[22px] border border-border bg-surface p-4 shadow-[var(--lectum-shadow-soft)]">
      <div className="flex min-w-0 items-center gap-1.5 text-[11px] font-semibold text-muted">
        <Reply className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span className="shrink-0">Respondido em</span>
        <Link
          className="block min-w-0 overflow-hidden text-ellipsis whitespace-nowrap font-black text-foreground underline-offset-4 hover:text-primary hover:underline"
          href={`/app/community/${item.post.community.slug}/post/${item.post.id}`}
        >
          {item.post.community.name}
        </Link>
        <span className="ml-auto shrink-0">{formatRelativeTime(reply.created_at)}</span>
      </div>

      {reply.parent_content ? (
        <blockquote className="rounded-2xl border-primary border-l-4 bg-surface-muted px-4 py-3 text-xs leading-5 text-muted">
          “{reply.parent_content}”
        </blockquote>
      ) : null}

      <div className="grid gap-2">
        {reply.title ? <h2 className="text-lg font-black text-foreground">{reply.title}</h2> : null}
        <p className="whitespace-pre-line text-sm leading-6 text-foreground">{reply.content}</p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-border border-t pt-3">
        <div className="flex items-center gap-2 text-xs font-bold text-muted">
          <span className="inline-flex h-9 items-center gap-1.5 rounded-full px-2">
            <PenLine className="h-4 w-4" aria-hidden="true" />
            Resposta
          </span>
          <span className="inline-flex h-9 items-center gap-1.5 rounded-full px-2">
            <MessageCircle className="h-4 w-4" aria-hidden="true" />
            {reply.upvotes_count.toLocaleString("pt-BR")} upvotes
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild className="h-9 rounded-full px-3 text-xs" variant="outline">
            <Link href={`/app/community/${item.post.community.slug}/post/${item.post.id}`}>
              Abrir post
            </Link>
          </Button>
          <Button
            className="h-9 rounded-full px-3 text-xs"
            onClick={() => onShare(item.post)}
            type="button"
            variant="ghost"
          >
            Compartilhar
          </Button>
        </div>
      </div>
    </article>
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
      aria-label="Paginação dos meus posts"
      className="flex items-center justify-between gap-3 rounded-[22px] border border-border bg-surface p-3"
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

export const MyPostsLogic = () => {
  const sessionUser = useAppSelector((state) => state.user);
  const [type, setType] = useState<UserPostsType>("all");
  const [page, setPage] = useState(1);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);
  const query = useMemo(() => ({ page, limit: PAGE_LIMIT, type }), [page, type]);
  const postsQuery = useMyPosts(query);
  const items = postsQuery.data?.data ?? [];
  const errorMessage = postsQuery.isError ? resolvePostsError(postsQuery.error) : null;
  const isPsychologist = sessionUser?.role === "psicologo";

  const sharePost = async (post: PostListPost) => {
    if (typeof window === "undefined") return;

    const url = `${window.location.origin}/app/community/${post.community.slug}/post/${post.id}`;

    try {
      if (navigator.share) {
        await navigator.share({ title: post.title, url });
      } else {
        await navigator.clipboard.writeText(url);
      }
      setShareFeedback(post.id);
      window.setTimeout(() => setShareFeedback(null), 2400);
    } catch {
      setShareFeedback(null);
    }
  };

  const handleFilterChange = (value: UserPostsType) => {
    setType(value);
    setPage(1);
  };

  return (
    <PrivateTemplate
      contentClassName="bg-background px-0 py-0"
      navigationTheme="solidWhite"
      showHeader
    >
      <section className="mx-auto grid min-h-screen w-full max-w-[430px] gap-4 px-5 py-4 sm:max-w-2xl lg:max-w-3xl">
        <header className="grid gap-4">
          <div className="flex items-center justify-between gap-3">
            <Button asChild className="h-10 w-10 rounded-full p-0" variant="ghost">
              <Link href={DEFAULT_COMMUNITY_FEED_HREF} aria-label="Voltar ao feed">
                <ArrowLeft className="h-5 w-5" aria-hidden="true" />
              </Link>
            </Button>
            <div className="text-center">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-primary">
                {isPsychologist ? "Contribuições profissionais" : "Histórico da comunidade"}
              </p>
              <h1 className="text-2xl font-black text-foreground">Meus Posts</h1>
            </div>
            <Button asChild className="h-10 w-10 rounded-full p-0" variant="ghost">
              <Link href={DEFAULT_COMMUNITY_FEED_HREF} aria-label="Buscar no feed">
                <Search className="h-5 w-5" aria-hidden="true" />
              </Link>
            </Button>
          </div>

          <FilterTabs disabled={postsQuery.isFetching} onChange={handleFilterChange} value={type} />
        </header>

        {postsQuery.isLoading || postsQuery.isPending ? (
          <div className="grid min-h-[45vh] place-items-center rounded-[22px] border border-border bg-surface shadow-[var(--lectum-shadow-soft)]">
            <LoadingState label="Carregando seus posts reais" />
          </div>
        ) : null}

        {errorMessage ? (
          <InlineAlert title="Não foi possível carregar" variant="error">
            {errorMessage}
          </InlineAlert>
        ) : null}

        {shareFeedback ? (
          <InlineAlert title="Link preparado" variant="success">
            Link do post copiado ou enviado para compartilhamento.
          </InlineAlert>
        ) : null}

        {!postsQuery.isLoading && !postsQuery.isPending && !errorMessage && items.length === 0 ? (
          <EmptyState
            action={
              <Button asChild>
                <Link href={DEFAULT_COMMUNITY_FEED_HREF}>
                  <FileText className="h-4 w-4" aria-hidden="true" />
                  Explorar feed
                </Link>
              </Button>
            }
            description="Quando você publicar posts ou respostas reais nas comunidades, eles aparecerão aqui."
            icon={Bookmark}
            title="Nenhuma publicação sua por enquanto"
          />
        ) : null}

        {items.length > 0 ? (
          <div className="grid gap-4">
            {items.map((item) =>
              item.type === "reply" ? (
                <ReplyItemCard item={item} key={item.id} onShare={sharePost} />
              ) : (
                <CommunityPostCard
                  key={item.id}
                  onShare={sharePost}
                  post={item.post}
                  statusBadge={<StatusBadge status={item.status} />}
                />
              ),
            )}
          </div>
        ) : null}

        {postsQuery.isFetching && !postsQuery.isLoading ? (
          <LoadingState label="Atualizando posts" />
        ) : null}

        <Pagination
          currentPage={page}
          disabled={postsQuery.isFetching}
          onPageChange={setPage}
          pages={postsQuery.data?.pages ?? 0}
        />
      </section>
    </PrivateTemplate>
  );
};
