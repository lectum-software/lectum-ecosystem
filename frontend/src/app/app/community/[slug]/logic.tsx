"use client";

import type { LucideIcon } from "lucide-react";
import {
  ArrowDown,
  ArrowUp,
  Award,
  BadgeCheck,
  Bookmark,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Compass,
  FileText,
  MessageCircle,
  Play,
  Search,
  Share2,
  SlidersHorizontal,
  UserX,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { useCommunityFeedPosts } from "@/api/callers/community";
import type { CommunityFeedScope, CommunityPost } from "@/api/generator/types/community";
import { EmptyState } from "@/components/ui/empty-state";
import { InlineAlert } from "@/components/ui/inline-alert";
import { LoadingState } from "@/components/ui/loading-state";
import { cn } from "@/lib/utils";
import { Button } from "@/registry/new-york-v4/ui/button";
import { Input } from "@/registry/new-york-v4/ui/input";
import { PrivateTemplate } from "@/templates/private";
import {
  COMMUNITY_CREATE_POST_HREF,
  COMMUNITY_EXPLORE_HREF,
  COMMUNITY_FEED_CHIPS,
  COMMUNITY_FEED_SLUG,
  getCommunityFeedChip,
} from "@/utils/community";
import { isPublicMediaUrl, resolvePublicMediaUrl } from "@/utils/media";

const PAGE_LIMIT = 12;

const FEED_SCOPE_OPTIONS: Array<{ label: string; value: CommunityFeedScope }> = [
  { label: "Todas as comunidades", value: "all" },
  { label: "Comunidades que sigo", value: "following" },
];

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
    return "Este recorte do feed não foi encontrado ou não está disponível.";
  }

  if (normalized.includes("token") || normalized.includes("sess")) {
    return "Sua sessão precisa estar ativa para visualizar o feed da comunidade.";
  }

  if (normalized.includes("network") || normalized.includes("conex")) {
    return "Não foi possível conectar à API agora. Tente novamente em alguns instantes.";
  }

  return rawMessage || "Não foi possível carregar o feed da comunidade agora.";
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

const communityDetailHref = (communitySlug: string) => `/app/community/${communitySlug}`;

const AuthorAvatar = ({
  anonymous,
  author,
}: {
  anonymous?: boolean;
  author: CommunityPost["author"];
}) => {
  if (anonymous) {
    return (
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#F1F5F9] text-[#94A3B8] ring-2 ring-[#E2E8F0] dark:bg-surface-muted dark:text-muted dark:ring-border">
        <UserX className="h-5 w-5" aria-hidden="true" />
      </span>
    );
  }

  const avatarSrc = resolvePublicMediaUrl(author.avatar);
  const avatarIsPublicMedia = isPublicMediaUrl(author.avatar);

  return (
    <span className="relative grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full bg-primary-soft text-xs font-black text-primary ring-2 ring-white dark:ring-background">
      {avatarSrc ? (
        <Image
          alt={author.name}
          className="object-cover"
          fill
          sizes="36px"
          src={avatarSrc}
          unoptimized={avatarIsPublicMedia}
        />
      ) : (
        getInitials(author.name)
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

const mentorBadgeClassName = (badge: string) => {
  if (badge.includes("#1")) {
    return "from-[#D9B76A] via-[#F1E1B5] to-[#9B6F2D] text-[#2E2110] ring-[#D9C089]";
  }

  if (badge.includes("#2")) {
    return "from-[#D7D2C3] via-[#F3EFE5] to-[#9A9384] text-[#2F3033] ring-[#D8D1C1]";
  }

  if (badge.includes("#3")) {
    return "from-[#B8764B] via-[#E0B18F] to-[#7A442A] text-[#2B160D] ring-[#C99672]";
  }

  return "from-[#D9B76A] via-[#F1E1B5] to-[#9B6F2D] text-[#2E2110] ring-[#D9C089]";
};

const MentorBadge = ({ badge }: { badge?: string | null }) => {
  if (!badge) return null;

  return (
    <span
      className={cn(
        "inline-flex w-fit items-center gap-1 rounded-[8px] bg-gradient-to-r px-2 py-1 text-[9px] font-black tracking-[0.02em] ring-1",
        mentorBadgeClassName(badge),
      )}
    >
      <Award className="h-3 w-3" aria-hidden="true" />
      {badge}
    </span>
  );
};

const FilterMenu = ({
  onScopeChange,
  open,
  scope,
  setOpen,
}: {
  onScopeChange: (value: CommunityFeedScope) => void;
  open: boolean;
  scope: CommunityFeedScope;
  setOpen: (value: boolean) => void;
}) => (
  <div className="relative shrink-0">
    <button
      aria-expanded={open}
      aria-label="Filtrar feed"
      className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-[#DFE5EC] bg-white text-[#64748B] shadow-sm transition hover:border-primary/50 hover:bg-primary-soft hover:text-primary dark:border-border dark:bg-surface dark:text-muted"
      onClick={() => setOpen(!open)}
      type="button"
    >
      <SlidersHorizontal className="h-5 w-5" aria-hidden="true" />
    </button>

    {open ? (
      <div className="absolute right-0 top-14 z-30 w-64 overflow-hidden rounded-[18px] border border-border bg-white p-1.5 shadow-[0_18px_45px_rgba(15,23,42,0.16)] dark:bg-surface">
        {FEED_SCOPE_OPTIONS.map((item) => {
          const selected = item.value === scope;

          return (
            <button
              aria-pressed={selected}
              className={cn(
                "flex w-full items-center justify-between rounded-[14px] px-3 py-2.5 text-left text-sm font-bold transition",
                selected
                  ? "bg-primary-soft text-primary"
                  : "text-[#475569] hover:bg-surface-muted dark:text-muted",
              )}
              key={item.value}
              onClick={() => {
                onScopeChange(item.value);
                setOpen(false);
              }}
              type="button"
            >
              {item.label}
              {selected ? <span className="h-2 w-2 rounded-full bg-primary" /> : null}
            </button>
          );
        })}
      </div>
    ) : null}
  </div>
);

const CommunityChips = ({
  activeSlug,
  onNavigate,
}: {
  activeSlug: string | null;
  onNavigate: () => void;
}) => (
  <nav aria-label="Comunidades" className="-mx-5 overflow-x-auto px-5 [scrollbar-width:none]">
    <div className="flex min-w-max gap-2 pb-1">
      <Link
        className="inline-flex items-center gap-1.5 rounded-full border border-border bg-white px-4 py-2 text-sm font-black text-[#475569] shadow-sm transition hover:border-primary/40 hover:bg-primary-soft hover:text-primary dark:bg-surface dark:text-muted"
        href={COMMUNITY_EXPLORE_HREF}
        onClick={onNavigate}
      >
        <Compass className="h-4 w-4" aria-hidden="true" />
        Explorar
      </Link>
      {COMMUNITY_FEED_CHIPS.map((item) => {
        const isActive = item.slug === activeSlug;

        return (
          <Link
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "rounded-full border px-3.5 py-2 text-[13px] font-semibold shadow-sm transition",
              isActive
                ? "border-primary bg-primary text-white shadow-primary/20"
                : "border-border bg-white text-[#475569] hover:border-primary/40 hover:bg-primary-soft hover:text-primary dark:bg-surface dark:text-muted",
            )}
            href={communityDetailHref(item.slug)}
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

const ProfessionalReplyPreview = ({ post }: { post: CommunityPost }) => {
  const reply = post.highlighted_professional_reply;
  if (!reply) return null;

  return (
    <div className="rounded-[18px] border border-[#D8EDE4] bg-[#F4FBF7] p-4 dark:border-border dark:bg-background/60">
      <p className="mb-3 text-[11px] font-black uppercase tracking-[0.08em] text-[#168A4A]">
        Resposta profissional em destaque
      </p>
      <div className="mb-2 flex items-center gap-2">
        <AuthorAvatar author={reply.author} />
        <div className="grid min-w-0 gap-1">
          <MentorBadge badge={reply.author.featured_badge} />
          <p className="flex items-center gap-1 truncate text-sm font-black text-foreground">
            {reply.author.name}
            {reply.author.verified ? (
              <BadgeCheck
                className="h-4 w-4 shrink-0 fill-[#2da7ff] text-white"
                aria-hidden="true"
              />
            ) : null}
          </p>
          <p className="text-[11px] font-semibold text-muted">
            {reply.author.type_label} • {formatRelativeTime(reply.created_at)} •{" "}
            {reply.upvotes_count.toLocaleString("pt-BR")} upvotes
          </p>
        </div>
      </div>
      <p className="text-sm leading-6 text-[#475569] dark:text-muted">{reply.content}</p>
      {reply.author.whatsapp_url ? (
        <Button
          asChild
          className="mt-3 h-11 w-full rounded-[14px] border-2 border-[#23C266] bg-transparent text-[#23C266] shadow-none hover:bg-[#23C266] hover:text-white"
        >
          <a href={reply.author.whatsapp_url} rel="noreferrer" target="_blank">
            <MessageCircle className="h-5 w-5" aria-hidden="true" />
            Chamar no WhatsApp
          </a>
        </Button>
      ) : null}
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
  const isPsychologistPost = post.author.role === "psicologo";
  const isAnonymousPatient = !isPsychologistPost && post.anonymous;

  return (
    <article className="overflow-hidden rounded-[22px] border border-[#E6EAF0] bg-white p-4 shadow-[0_12px_30px_rgba(15,23,42,0.06)] dark:border-border dark:bg-surface">
      <div className="mb-4 flex items-center justify-between gap-3 text-[11px] font-semibold text-muted">
        <span className="inline-flex min-w-0 items-center gap-1.5">
          <FileText className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span className="truncate">
            Postado em{" "}
            <Link
              className="font-black text-foreground underline-offset-4 hover:text-primary hover:underline"
              href={communityDetailHref(post.community.slug)}
            >
              {post.community.name}
            </Link>
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
        <AuthorAvatar anonymous={isAnonymousPatient} author={post.author} />
        <div className="grid min-w-0 flex-1 gap-1">
          <MentorBadge badge={post.author.featured_badge ?? post.featured_badge} />
          <div className="flex flex-wrap items-center gap-1.5">
            <h2 className="truncate text-sm font-black text-foreground">{post.author.name}</h2>
            {post.author.verified ? (
              <BadgeCheck
                className="h-4 w-4 shrink-0 fill-[#2da7ff] text-white"
                aria-hidden="true"
              />
            ) : null}
          </div>
          <p className="text-[11px] font-semibold text-muted">
            {isPsychologistPost
              ? `${post.author.type_label} • ${formatRelativeTime(post.created_at)}`
              : formatRelativeTime(post.created_at)}
          </p>
        </div>
      </div>

      <div className="grid gap-2">
        <h3 className="text-[1.32rem] font-black leading-[1.18] tracking-[-0.02em] text-[#182033] dark:text-foreground">
          {post.title}
        </h3>
        <p className="whitespace-pre-line text-sm leading-6 text-[#64748B] dark:text-muted">
          {post.content}
        </p>
      </div>

      <div className="mt-4 grid gap-4">
        <PostMedia post={post} />
        <ProfessionalReplyPreview post={post} />
      </div>

      <div className="mt-4 flex items-center justify-between border-[#EDF1F5] border-t pt-3 dark:border-border">
        <div className="flex items-center gap-1">
          <CountAction icon={ArrowUp} label="Dar upvote" value={post.upvotes_count} />
          <CountAction icon={ArrowDown} label="Dar downvote" value={post.downvotes_count} />
          <CountAction icon={MessageCircle} label="Comentar" value={post.replies_count} />
        </div>
        <div className="flex items-center gap-1">
          <CountAction icon={Bookmark} label="Salvar" value={post.saves_count} />
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
  const searchParams = useSearchParams();
  const routeSlug = typeof params.slug === "string" ? params.slug : COMMUNITY_FEED_SLUG;
  const communityFromQuery = getCommunityFeedChip(searchParams.get("community"));
  const communityFromLegacySlug =
    routeSlug !== COMMUNITY_FEED_SLUG ? getCommunityFeedChip(routeSlug) : null;
  const selectedCommunitySlug = communityFromQuery?.slug ?? communityFromLegacySlug?.slug ?? null;
  const [page, setPage] = useState(1);
  const [scope, setScope] = useState<CommunityFeedScope>("all");
  const [filterOpen, setFilterOpen] = useState(false);
  const [headerHidden, setHeaderHidden] = useState(false);
  const lastScrollY = useRef(0);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search.trim());
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);
  const query = useMemo(
    () => ({
      page,
      limit: PAGE_LIMIT,
      scope,
      ...(deferredSearch ? { search: deferredSearch } : {}),
      ...(selectedCommunitySlug ? { community: selectedCommunitySlug } : {}),
    }),
    [deferredSearch, page, scope, selectedCommunitySlug],
  );
  const feed = useCommunityFeedPosts(query);
  const posts = feed.data?.data ?? [];
  const errorMessage = feed.isError ? resolveFeedError(feed.error) : null;

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const isScrollingDown = currentScrollY > lastScrollY.current;

      if (currentScrollY < 48) {
        setHeaderHidden(false);
      } else if (Math.abs(currentScrollY - lastScrollY.current) > 8) {
        setHeaderHidden(isScrollingDown);
      }

      lastScrollY.current = currentScrollY;
    };

    lastScrollY.current = window.scrollY;
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

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
    <PrivateTemplate
      bottomNavigationCenterAction={{
        ariaLabel: "Criar publicação na comunidade",
        href: COMMUNITY_CREATE_POST_HREF,
        title: "Criar publicação",
      }}
      contentClassName="bg-[#F5F7FA] dark:bg-background"
      navigationTheme="solidWhite"
      showHeader
    >
      <section className="mx-auto grid w-full max-w-[430px] gap-4 sm:max-w-2xl lg:max-w-3xl">
        <header
          className={cn(
            "sticky top-0 z-20 -mx-5 border-[#E5EAF0] border-b bg-[#F5F7FA]/95 px-5 pb-3 pt-2 backdrop-blur transition-[transform,opacity] duration-300 ease-out supports-[backdrop-filter]:bg-[#F5F7FA]/88 dark:border-border dark:bg-background/90",
            headerHidden
              ? "pointer-events-none -translate-y-[calc(100%+8px)] opacity-0"
              : "translate-y-0 opacity-100",
          )}
        >
          <div className="mx-auto grid max-w-[430px] gap-3 sm:max-w-2xl lg:max-w-3xl">
            <div className="flex items-center gap-2">
              <div className="relative min-w-0 flex-1">
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

              <FilterMenu
                onScopeChange={(value) => {
                  setScope(value);
                  setPage(1);
                }}
                open={filterOpen}
                scope={scope}
                setOpen={setFilterOpen}
              />
            </div>

            <CommunityChips activeSlug={selectedCommunitySlug} onNavigate={() => setPage(1)} />
          </div>
        </header>

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
                <Link href={COMMUNITY_EXPLORE_HREF}>Explorar comunidades</Link>
              </Button>
            }
            description={
              scope === "following"
                ? "Ainda não há comunidades seguidas vinculadas ao seu usuário. Quando a participação em comunidades for ativada, este filtro exibirá esse recorte persistido."
                : "Nenhum destaque publicado para este recorte do feed. O feed usa apenas dados persistidos no backend."
            }
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
