"use client";

import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Bookmark,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  FileText,
  MessageSquareText,
  Share2,
  ThumbsUp,
  UsersRound,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useCommunityPosts } from "@/api/callers/community";
import type { CommunityPost } from "@/api/generator/types/community";
import { EmptyState } from "@/components/ui/empty-state";
import { InlineAlert } from "@/components/ui/inline-alert";
import { LoadingState } from "@/components/ui/loading-state";
import { Button } from "@/registry/new-york-v4/ui/button";
import { PrivateTemplate } from "@/templates/private";
import { isPublicMediaUrl, resolvePublicMediaUrl } from "@/utils/media";

const PAGE_LIMIT = 10;

type ApiErrorData = {
  error?: string;
  message?: string;
  status?: number;
};

type ApiError = Error & {
  data?: ApiErrorData;
};

const resolveFeedError = (error: unknown) => {
  const apiError = error as ApiError;
  const rawMessage =
    apiError?.data?.error ||
    apiError?.data?.message ||
    (error instanceof Error ? error.message : "");
  const normalized = rawMessage.toLowerCase();

  if (apiError?.data?.status === 404 || normalized.includes("não encontr")) {
    return "Esta comunidade não foi encontrada ou não está disponível.";
  }

  if (normalized.includes("token") || normalized.includes("sess")) {
    return "Sua sessão precisa estar ativa para visualizar o feed da comunidade.";
  }

  if (normalized.includes("network") || normalized.includes("conex")) {
    return "Não foi possível conectar à API agora. Tente novamente em alguns instantes.";
  }

  return rawMessage || "Não foi possível carregar o feed desta comunidade agora.";
};

const formatDateTime = (value: string) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Data indisponível";

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

const getInitials = (name: string) => {
  const parts = name.split(/\s+/).filter(Boolean);

  if (parts.length === 0) return "L";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};

const authorRoleLabel = (role?: string | null) => {
  if (role === "psicologo") return "Psicólogo(a)";
  if (role === "paciente") return "Paciente";

  return "Membro";
};

const AuthorAvatar = ({ post }: { post: CommunityPost }) => {
  const avatarSrc = resolvePublicMediaUrl(post.author.avatar);
  const avatarIsPublicMedia = isPublicMediaUrl(post.author.avatar);

  return (
    <span className="relative grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-full bg-primary-soft text-sm font-black text-primary ring-2 ring-background">
      {avatarSrc ? (
        <Image
          alt={post.author.name}
          className="object-cover"
          fill
          sizes="44px"
          src={avatarSrc}
          unoptimized={avatarIsPublicMedia}
        />
      ) : (
        getInitials(post.author.name)
      )}
    </span>
  );
};

const CountPill = ({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof ThumbsUp;
  label: string;
  value: number;
}) => {
  return (
    <span className="inline-flex items-center gap-1.5 text-sm font-bold text-muted" title={label}>
      <Icon className="h-4 w-4" aria-hidden="true" />
      {value.toLocaleString("pt-BR")}
    </span>
  );
};

const PostCard = ({
  post,
  onShare,
}: {
  post: CommunityPost;
  onShare: (post: CommunityPost) => void;
}) => {
  return (
    <article className="grid gap-4 rounded-[var(--lectum-card-radius)] border border-border bg-surface p-4 shadow-[var(--lectum-shadow-soft)]">
      <div className="flex items-center justify-between gap-3 text-xs font-semibold text-muted">
        <span className="inline-flex min-w-0 items-center gap-1.5">
          <FileText className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="truncate">
            Postado em <strong className="text-foreground">{post.community.name}</strong>
          </span>
        </span>
        <span className="shrink-0 rounded-full border border-border px-3 py-1 text-primary">
          Publicado
        </span>
      </div>

      <div className="flex items-start gap-3">
        <AuthorAvatar post={post} />
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-black text-foreground">{post.author.name}</h2>
          <p className="text-xs font-medium text-muted">
            {authorRoleLabel(post.author.role)} • {formatDateTime(post.created_at)}
          </p>
        </div>
      </div>

      <div className="grid gap-2">
        <h3 className="text-xl font-black leading-tight tracking-tight text-foreground">
          {post.title}
        </h3>
        <p className="whitespace-pre-line text-sm leading-6 text-muted">{post.content}</p>
      </div>

      {post.tags.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {post.tags.map((tag) => (
            <span
              className="rounded-full border border-primary/20 bg-primary-soft px-3 py-1 text-xs font-bold text-primary"
              key={tag}
            >
              {tag}
            </span>
          ))}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border pt-4">
        <div className="flex flex-wrap items-center gap-4">
          <CountPill icon={ThumbsUp} label="Upvotes" value={post.upvotes_count} />
          <CountPill icon={ArrowDown} label="Downvotes agregados" value={post.downvotes_count} />
          <CountPill icon={MessageSquareText} label="Respostas" value={post.replies_count} />
          <CountPill icon={Bookmark} label="Salvamentos" value={post.saves_count} />
        </div>
        <div className="flex items-center gap-2">
          <button
            aria-label={`Compartilhar ${post.title}`}
            className="grid h-10 w-10 place-items-center rounded-full border border-border text-muted transition hover:border-primary/40 hover:bg-primary-soft hover:text-primary"
            onClick={() => onShare(post)}
            type="button"
          >
            <Share2 className="h-4 w-4" aria-hidden="true" />
          </button>
          <Button asChild className="h-10 rounded-full px-4">
            <Link href={`/app/community/${post.community.slug}/post/${post.id}`}>
              Abrir post
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
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
      aria-label="Paginação do feed"
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

export const CommunityFeedLogic = () => {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const slug = params.slug;
  const [page, setPage] = useState(1);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);
  const query = useMemo(() => ({ page, limit: PAGE_LIMIT }), [page]);
  const feed = useCommunityPosts(slug, query);
  const posts = feed.data?.data ?? [];
  const community = feed.data?.community;
  const errorMessage = feed.isError ? resolveFeedError(feed.error) : null;

  const goBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }

    router.push("/app/community");
  };

  const sharePost = async (post: CommunityPost) => {
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
    <PrivateTemplate>
      <section className="mx-auto grid w-full max-w-[430px] gap-5 sm:max-w-2xl lg:max-w-3xl">
        <header className="sticky top-0 z-20 -mx-5 border-b border-border bg-background/95 px-5 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/85">
          <div className="mx-auto flex max-w-[430px] items-center gap-3 sm:max-w-2xl lg:max-w-3xl">
            <button
              aria-label="Voltar para comunidades"
              className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-muted transition hover:bg-primary-soft hover:text-primary"
              onClick={goBack}
              type="button"
            >
              <ArrowLeft className="h-5 w-5" aria-hidden="true" />
            </button>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-bold uppercase tracking-[0.08em] text-primary">
                Feed da comunidade
              </p>
              <h1 className="truncate text-lg font-black text-foreground">
                {community?.name || "Comunidade"}
              </h1>
            </div>
            <Button asChild className="hidden rounded-full sm:inline-flex" variant="outline">
              <Link href="/app/community">Explorar</Link>
            </Button>
          </div>
        </header>

        {feed.isLoading || feed.isPending ? (
          <div className="grid min-h-[45vh] place-items-center rounded-[var(--lectum-card-radius)] border border-border bg-surface shadow-[var(--lectum-shadow-soft)]">
            <LoadingState label="Carregando feed da comunidade" />
          </div>
        ) : null}

        {errorMessage ? (
          <InlineAlert title="Feed indisponível" variant="error">
            {errorMessage}
          </InlineAlert>
        ) : null}

        {!feed.isLoading && !feed.isPending && !errorMessage && community ? (
          <section className="grid gap-4 rounded-[var(--lectum-card-radius)] border border-border bg-surface p-5 shadow-[var(--lectum-shadow-soft)]">
            <div className="flex items-start gap-3">
              <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-primary-soft text-primary">
                <UsersRound className="h-7 w-7" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="text-2xl font-black text-foreground">{community.name}</h2>
                {community.description ? (
                  <p className="mt-2 text-sm leading-6 text-muted">{community.description}</p>
                ) : (
                  <p className="mt-2 text-sm leading-6 text-muted">
                    Comunidade persistida no backend sem descrição cadastrada.
                  </p>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-2 text-xs font-bold">
              {community.category ? (
                <Link
                  className="rounded-full border border-primary/20 bg-primary-soft px-3 py-1 text-primary"
                  href={`/app/community?category=${encodeURIComponent(community.category)}`}
                >
                  {community.category}
                </Link>
              ) : null}
              <span className="rounded-full border border-border px-3 py-1 text-muted">
                {community.members_count.toLocaleString("pt-BR")} membros
              </span>
              <span className="rounded-full border border-border px-3 py-1 text-muted">
                {feed.data?.count ?? 0} posts publicados
              </span>
            </div>
          </section>
        ) : null}

        {shareFeedback ? (
          <InlineAlert title="Link preparado" variant="success">
            Compartilhamento do post preparado com a rota canônica do conteúdo.
          </InlineAlert>
        ) : null}

        {!feed.isLoading && !feed.isPending && !errorMessage && posts.length === 0 ? (
          <EmptyState
            action={
              <Button asChild variant="outline">
                <Link href="/app/community">Explorar outras comunidades</Link>
              </Button>
            }
            description="Esta comunidade ainda não possui posts publicados. A tela permanece vazia sem usar arrays locais ou dados simulados."
            icon={CalendarDays}
            title="Nenhum post publicado"
          />
        ) : null}

        {posts.length > 0 ? (
          <div className="grid gap-4">
            {posts.map((post) => (
              <PostCard key={post.id} onShare={sharePost} post={post} />
            ))}
          </div>
        ) : null}

        {feed.isFetching && !feed.isLoading ? <LoadingState label="Atualizando feed" /> : null}

        <Pagination
          currentPage={page}
          disabled={feed.isFetching}
          onPageChange={setPage}
          pages={feed.data?.pages ?? 0}
        />
      </section>
    </PrivateTemplate>
  );
};
