"use client";

import {
  ArrowLeft,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  FileText,
  Loader2,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useSavedPosts, useUnsavePostFromList } from "@/api/callers/posts";
import type { PostListPost } from "@/api/generator/types/posts";
import { CommunityPostCard } from "@/components/community/community-post-card";
import { EmptyState } from "@/components/ui/empty-state";
import { InlineAlert } from "@/components/ui/inline-alert";
import { LoadingState } from "@/components/ui/loading-state";
import { Button } from "@/registry/new-york-v4/ui/button";
import { PrivateTemplate } from "@/templates/private";
import { DEFAULT_COMMUNITY_FEED_HREF } from "@/utils/community";

const PAGE_LIMIT = 10;

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
    return "Sua sessão precisa estar ativa para visualizar posts salvos.";
  }

  if (normalized.includes("network") || normalized.includes("conex")) {
    return "Não foi possível conectar à API agora. Tente novamente em alguns instantes.";
  }

  return rawMessage || "Não foi possível carregar seus posts salvos agora.";
};

const formatSavedAt = (value: string | null) => {
  if (!value) return "Salvo";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Salvo";

  return `Salvo em ${new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
  }).format(date)}`;
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
      aria-label="Paginação dos salvos"
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

export const SavedPostsLogic = () => {
  const [page, setPage] = useState(1);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);
  const [removedFeedback, setRemovedFeedback] = useState<string | null>(null);
  const query = useMemo(() => ({ page, limit: PAGE_LIMIT }), [page]);
  const postsQuery = useSavedPosts(query);
  const unsaveMutation = useUnsavePostFromList({
    onSuccess: () => {
      setRemovedFeedback("Post removido dos salvos.");
      window.setTimeout(() => setRemovedFeedback(null), 2400);
    },
  });
  const items = postsQuery.data?.data ?? [];
  const errorMessage = postsQuery.isError ? resolvePostsError(postsQuery.error) : null;

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

  return (
    <PrivateTemplate
      contentClassName="bg-background px-0 py-0"
      navigationTheme="solidWhite"
      showHeader
    >
      <section className="mx-auto grid min-h-screen w-full max-w-[430px] gap-4 px-5 py-4 sm:max-w-2xl lg:max-w-3xl">
        <header className="flex items-center justify-between gap-3">
          <Button asChild className="h-10 w-10 rounded-full p-0" variant="ghost">
            <Link href={DEFAULT_COMMUNITY_FEED_HREF} aria-label="Voltar ao feed">
              <ArrowLeft className="h-5 w-5" aria-hidden="true" />
            </Link>
          </Button>
          <div className="text-center">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-primary">
              Biblioteca da comunidade
            </p>
            <h1 className="text-2xl font-black text-foreground">Salvos</h1>
          </div>
          <Button asChild className="h-10 w-10 rounded-full p-0" variant="ghost">
            <Link href="/app/posts/mine" aria-label="Abrir meus posts">
              <FileText className="h-5 w-5" aria-hidden="true" />
            </Link>
          </Button>
        </header>

        {postsQuery.isLoading || postsQuery.isPending ? (
          <div className="grid min-h-[45vh] place-items-center rounded-[22px] border border-border bg-surface shadow-[var(--lectum-shadow-soft)]">
            <LoadingState label="Carregando posts salvos reais" />
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

        {removedFeedback ? (
          <InlineAlert title="Salvos atualizados" variant="success">
            {removedFeedback}
          </InlineAlert>
        ) : null}

        {unsaveMutation.isError ? (
          <InlineAlert title="Não foi possível remover" variant="error">
            O post continua salvo. Tente novamente em alguns instantes.
          </InlineAlert>
        ) : null}

        {!postsQuery.isLoading && !postsQuery.isPending && !errorMessage && items.length === 0 ? (
          <EmptyState
            action={
              <Button asChild>
                <Link href={DEFAULT_COMMUNITY_FEED_HREF}>
                  <Bookmark className="h-4 w-4" aria-hidden="true" />
                  Explorar posts
                </Link>
              </Button>
            }
            description="Quando você salvar posts reais nas comunidades, eles aparecerão aqui."
            icon={Bookmark}
            title="Nenhum post salvo"
          />
        ) : null}

        {items.length > 0 ? (
          <div className="grid gap-4">
            {items.map((item) => (
              <CommunityPostCard
                footerExtra={
                  <button
                    aria-label={`Remover ${item.post.title} dos salvos`}
                    className="grid h-9 w-9 place-items-center rounded-full text-danger transition hover:bg-danger/10 disabled:opacity-60"
                    disabled={unsaveMutation.isPending}
                    onClick={() => unsaveMutation.mutate(item.post.id)}
                    type="button"
                  >
                    {unsaveMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    ) : (
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    )}
                  </button>
                }
                headerExtra={
                  <span className="ml-auto shrink-0 rounded-full bg-primary-soft px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.08em] text-primary">
                    {formatSavedAt(item.saved_at)}
                  </span>
                }
                key={item.id}
                onShare={sharePost}
                post={item.post}
              />
            ))}
          </div>
        ) : null}

        {postsQuery.isFetching && !postsQuery.isLoading ? (
          <LoadingState label="Atualizando salvos" />
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
