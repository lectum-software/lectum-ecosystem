"use client";

import type { LucideIcon } from "lucide-react";
import {
  ArrowLeft,
  Award,
  BadgeCheck,
  Bookmark,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  FileText,
  MessageCircle,
  Play,
  Search,
  Share2,
  SlidersHorizontal,
  Sparkles,
  ThumbsUp,
  UsersRound,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useDeferredValue, useMemo, useState } from "react";
import { useCommunityPosts } from "@/api/callers/community";
import type { CommunityPost } from "@/api/generator/types/community";
import { EmptyState } from "@/components/ui/empty-state";
import { InlineAlert } from "@/components/ui/inline-alert";
import { LoadingState } from "@/components/ui/loading-state";
import { cn } from "@/lib/utils";
import { Button } from "@/registry/new-york-v4/ui/button";
import { Input } from "@/registry/new-york-v4/ui/input";
import { PrivateTemplate } from "@/templates/private";
import { COMMUNITY_FEED_CHIPS, findCommunityFeedChip } from "@/utils/community";
import { isPublicMediaUrl, resolvePublicMediaUrl } from "@/utils/media";

const PAGE_LIMIT = 12;

type ApiErrorData = {
  error?: string;
  message?: string;
  status?: number;
};

type ApiError = Error & {
  data?: ApiErrorData;
};

type CountActionProps = {
  icon: LucideIcon;
  label: string;
  value?: number;
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

const getInitials = (name: string) => {
  const parts = name.split(/\s+/).filter(Boolean);

  if (parts.length === 0) return "L";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};

const AuthorAvatar = ({ post }: { post: CommunityPost }) => {
  const avatarSrc = resolvePublicMediaUrl(post.author.avatar);
  const avatarIsPublicMedia = isPublicMediaUrl(post.author.avatar);

  return (
    <span className="relative grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full bg-primary-soft text-xs font-black text-primary ring-2 ring-white dark:ring-background">
      {avatarSrc ? (
        <Image
          alt={post.author.name}
          className="object-cover"
          fill
          sizes="36px"
          src={avatarSrc}
          unoptimized={avatarIsPublicMedia}
        />
      ) : (
        getInitials(post.author.name)
      )}
    </span>
  );
};

const CountAction = ({ icon: Icon, label, value }: CountActionProps) => (
  <button
    aria-label={label}
    className="inline-flex h-9 items-center gap-1.5 rounded-full px-2 text-xs font-bold text-[#475569] transition hover:bg-primary-soft hover:text-primary dark:text-muted"
    type="button"
  >
    <Icon className="h-4 w-4" aria-hidden="true" />
    {typeof value === "number" ? value.toLocaleString("pt-BR") : null}
  </button>
);

const CommunityChips = ({
  activeSlug,
  onNavigate,
}: {
  activeSlug: string;
  onNavigate: () => void;
}) => (
  <nav aria-label="Comunidades" className="-mx-5 overflow-x-auto px-5 [scrollbar-width:none]">
    <div className="flex min-w-max gap-2 pb-1">
      {COMMUNITY_FEED_CHIPS.map((item) => {
        const isActive = item.slug === activeSlug;

        return (
          <Link
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "rounded-full border px-4 py-2 text-sm font-black shadow-sm transition",
              isActive
                ? "border-primary bg-primary text-white shadow-primary/20"
                : "border-border bg-surface text-muted hover:border-primary/40 hover:bg-primary-soft hover:text-primary",
            )}
            href={`/app/community/${item.slug}`}
            key={item.slug}
            onClick={onNavigate}
          >
            {item.label}
          </Link>
        );
      })}
    </div>
  </nav>
);

const PostMedia = ({ post }: { post: CommunityPost }) => {
  if (!post.media_url) return null;

  const mediaUrl = resolvePublicMediaUrl(post.media_url);
  if (!mediaUrl) return null;

  if (post.media_type === "video") {
    return (
      <div className="relative overflow-hidden rounded-[22px] border border-border bg-black shadow-inner">
        <video className="aspect-[4/5] w-full object-cover" controls playsInline src={mediaUrl}>
          <track kind="captions" label="Português" srcLang="pt-BR" />
        </video>
        <span className="pointer-events-none absolute inset-0 grid place-items-center text-white/70">
          <span className="grid h-16 w-16 place-items-center rounded-full bg-black/30 backdrop-blur">
            <Play className="ml-1 h-7 w-7 fill-white" aria-hidden="true" />
          </span>
        </span>
      </div>
    );
  }

  return (
    <div className="relative aspect-[4/5] overflow-hidden rounded-[22px] border border-border bg-surface-muted">
      <Image
        alt={post.title}
        className="object-cover"
        fill
        sizes="(max-width: 430px) calc(100vw - 64px), 520px"
        src={mediaUrl}
        unoptimized={isPublicMediaUrl(post.media_url)}
      />
    </div>
  );
};

const PsychologistResponse = ({ post }: { post: CommunityPost }) => {
  if (post.author.role !== "psicologo") return null;

  return (
    <div className="ml-4 border-[#E5E7EB] border-l-2 pl-4 dark:border-border">
      <div className="mb-2 flex items-center gap-2">
        <AuthorAvatar post={post} />
        <div className="min-w-0">
          <p className="flex items-center gap-1 truncate text-sm font-black text-foreground">
            {post.author.name}
            {post.author.verified ? (
              <BadgeCheck
                className="h-4 w-4 shrink-0 fill-[#2da7ff] text-white"
                aria-hidden="true"
              />
            ) : null}
          </p>
          <p className="text-[11px] font-semibold text-muted">
            {post.author.type_label} • {formatRelativeTime(post.created_at)}
          </p>
        </div>
      </div>
      <p className="text-sm leading-6 text-[#475569] dark:text-muted">{post.content}</p>
    </div>
  );
};

const PostCard = ({
  post,
  onShare,
}: {
  post: CommunityPost;
  onShare: (post: CommunityPost) => void;
}) => {
  const isPsychologist = post.author.role === "psicologo";

  return (
    <article className="overflow-hidden rounded-[22px] border border-[#E6EAF0] bg-white p-4 shadow-[0_12px_30px_rgba(15,23,42,0.06)] dark:border-border dark:bg-surface">
      <div className="mb-4 flex items-center justify-between gap-3 text-[11px] font-semibold text-muted">
        <span className="inline-flex min-w-0 items-center gap-1.5">
          <FileText className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span className="truncate">
            Postado em <strong className="text-foreground">{post.community.name}</strong>
          </span>
        </span>
        <button
          className="shrink-0 rounded-full border border-[#8FC7EA] px-3 py-1 text-[11px] font-black text-primary transition hover:bg-primary-soft"
          type="button"
        >
          Seguir
        </button>
      </div>

      <div className="mb-3 flex items-start gap-3">
        <AuthorAvatar post={post} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <h2 className="truncate text-sm font-black text-foreground">{post.author.name}</h2>
            {post.author.verified ? (
              <BadgeCheck
                className="h-4 w-4 shrink-0 fill-[#2da7ff] text-white"
                aria-hidden="true"
              />
            ) : null}
            {post.featured_badge ? (
              <span className="inline-flex items-center gap-1 rounded-[6px] bg-[#F7C948] px-1.5 py-0.5 text-[9px] font-black text-[#573A00]">
                <Award className="h-3 w-3" aria-hidden="true" />
                {post.featured_badge}
              </span>
            ) : null}
          </div>
          <p className="text-[11px] font-semibold text-muted">
            {post.author.type_label} • {formatRelativeTime(post.created_at)}
          </p>
        </div>
      </div>

      <div className="grid gap-2">
        <h3 className="text-[1.32rem] font-black leading-[1.18] tracking-[-0.02em] text-[#182033] dark:text-foreground">
          {post.title}
        </h3>
        {!isPsychologist ? (
          <p className="whitespace-pre-line text-sm leading-6 text-[#64748B] dark:text-muted">
            {post.content}
          </p>
        ) : null}
      </div>

      <div className="mt-4 grid gap-4">
        <PsychologistResponse post={post} />
        <PostMedia post={post} />

        {post.author.whatsapp_url ? (
          <Button
            asChild
            className="h-12 rounded-[14px] border-2 border-[#23C266] bg-transparent text-[#23C266] shadow-none hover:bg-[#23C266] hover:text-white"
          >
            <a href={post.author.whatsapp_url} rel="noreferrer" target="_blank">
              <MessageCircle className="h-5 w-5" aria-hidden="true" />
              Chamar no WhatsApp
            </a>
          </Button>
        ) : null}
      </div>

      <div className="mt-4 flex items-center justify-between border-[#EDF1F5] border-t pt-3 dark:border-border">
        <div className="flex items-center gap-1">
          <CountAction icon={ThumbsUp} label="Curtir post" value={post.upvotes_count} />
          <CountAction icon={MessageCircle} label="Comentar" value={post.replies_count} />
        </div>
        <div className="flex items-center gap-1">
          <CountAction icon={Bookmark} label="Salvar" />
          <button
            aria-label={`Compartilhar ${post.title}`}
            className="grid h-9 w-9 place-items-center rounded-full text-[#475569] transition hover:bg-primary-soft hover:text-primary dark:text-muted"
            onClick={() => onShare(post)}
            type="button"
          >
            <Share2 className="h-4 w-4" aria-hidden="true" />
          </button>
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

export const CommunityFeedLogic = () => {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const slug = params.slug;
  const activeChip = findCommunityFeedChip(slug);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search.trim());
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);
  const query = useMemo(
    () => ({ page, limit: PAGE_LIMIT, ...(deferredSearch ? { search: deferredSearch } : {}) }),
    [deferredSearch, page],
  );
  const feed = useCommunityPosts(slug, query);
  const posts = feed.data?.data ?? [];
  const community = feed.data?.community;
  const errorMessage = feed.isError ? resolveFeedError(feed.error) : null;
  const headerTitle = community?.name || activeChip.name;

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
    <PrivateTemplate contentClassName="bg-[#F5F7FA] dark:bg-background" showHeader>
      <section className="mx-auto grid w-full max-w-[430px] gap-4 sm:max-w-2xl lg:max-w-3xl">
        <header className="sticky top-0 z-20 -mx-5 border-[#E5EAF0] border-b bg-[#F5F7FA]/95 px-5 pb-3 pt-2 backdrop-blur supports-[backdrop-filter]:bg-[#F5F7FA]/88 dark:border-border dark:bg-background/90">
          <div className="mx-auto grid max-w-[430px] gap-3 sm:max-w-2xl lg:max-w-3xl">
            <div className="flex items-center gap-3">
              <button
                aria-label="Voltar para comunidades"
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-[#334155] shadow-sm transition hover:bg-primary-soft hover:text-primary dark:bg-surface dark:text-muted"
                onClick={goBack}
                type="button"
              >
                <ArrowLeft className="h-5 w-5" aria-hidden="true" />
              </button>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[11px] font-black uppercase tracking-[0.08em] text-primary">
                  Feed da comunidade
                </p>
                <h1 className="truncate text-xl font-black text-[#182033] dark:text-foreground">
                  {headerTitle}
                </h1>
              </div>
              <SlidersHorizontal className="h-5 w-5 text-muted" aria-hidden="true" />
            </div>

            <div className="relative">
              <Search
                className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle"
                aria-hidden="true"
              />
              <Input
                aria-label="Buscar no feed"
                className="h-12 rounded-full border-[#DFE5EC] bg-white pl-11 text-sm shadow-sm dark:bg-surface"
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder="Buscar no feed"
                type="search"
                value={search}
              />
            </div>

            <CommunityChips activeSlug={activeChip.slug} onNavigate={() => setPage(1)} />
          </div>
        </header>

        <div className="flex items-center justify-between rounded-[20px] bg-white px-4 py-3 text-xs font-bold text-muted shadow-[0_10px_24px_rgba(15,23,42,0.05)] dark:bg-surface">
          <span className="inline-flex items-center gap-2">
            <UsersRound className="h-4 w-4 text-primary" aria-hidden="true" />
            {community?.members_count.toLocaleString("pt-BR") ?? "0"} membros
          </span>
          <span className="inline-flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />
            {feed.data?.count ?? 0} posts publicados
          </span>
        </div>

        {feed.isLoading || feed.isPending ? (
          <div className="grid min-h-[45vh] place-items-center rounded-[22px] border border-border bg-surface shadow-[var(--lectum-shadow-soft)]">
            <LoadingState label="Carregando feed da comunidade" />
          </div>
        ) : null}

        {errorMessage ? (
          <InlineAlert title="Feed indisponível" variant="error">
            {errorMessage}
          </InlineAlert>
        ) : null}

        {shareFeedback ? (
          <InlineAlert title="Link preparado" variant="success">
            Link do post copiado ou enviado para compartilhamento.
          </InlineAlert>
        ) : null}

        {!feed.isLoading && !feed.isPending && !errorMessage && posts.length === 0 ? (
          <EmptyState
            action={
              <Button asChild variant="outline">
                <Link href="/app/community">Explorar outras comunidades</Link>
              </Button>
            }
            description="Esta comunidade ainda não possui posts publicados. O feed usa apenas dados persistidos no backend, sem arrays locais ou mocks."
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
