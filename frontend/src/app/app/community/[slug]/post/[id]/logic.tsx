"use client";

import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Award,
  BadgeCheck,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  FileText,
  Loader2,
  MessageCircle,
  MoreVertical,
  Play,
  Reply,
  Send,
  Share2,
  UserX,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { type RefObject, useMemo, useRef, useState } from "react";
import {
  useCreatePostReply,
  usePostDetail,
  usePostReplies,
  useSavePost,
  useVotePost,
} from "@/api/callers/posts";
import type { PostDetail, PostReply } from "@/api/generator/types/posts";
import { components } from "@/components/controllers";
import { EmptyState } from "@/components/ui/empty-state";
import { InlineAlert } from "@/components/ui/inline-alert";
import { LoadingState } from "@/components/ui/loading-state";
import { cn } from "@/lib/utils";
import { Button } from "@/registry/new-york-v4/ui/button";
import { PrivateTemplate } from "@/templates/private";
import { DEFAULT_COMMUNITY_FEED_HREF } from "@/utils/community";
import { isPublicMediaUrl, resolvePublicMediaUrl } from "@/utils/media";
import { type ReplyComposerForm, toCreatePostReplyPayload, useReplyComposerForm } from "./use-form";

const REPLIES_LIMIT = 8;

type ApiErrorData = {
  error?: string;
  message?: string;
  status?: number;
};

type ApiError = Error & {
  data?: ApiErrorData;
};

type ReplyTarget = {
  id: string;
  name: string;
} | null;

const resolvePostError = (error: unknown) => {
  const apiError = error as ApiError;
  const rawMessage =
    apiError?.data?.error ||
    apiError?.data?.message ||
    (error instanceof Error ? error.message : "");
  const normalized = rawMessage.toLowerCase();

  if (apiError?.data?.status === 404 || normalized.includes("não encontr")) {
    return "Este post não foi encontrado ou não está mais disponível.";
  }

  if (normalized.includes("sess") || normalized.includes("token")) {
    return "Sua sessão precisa estar ativa para visualizar a discussão.";
  }

  if (normalized.includes("network") || normalized.includes("conex")) {
    return "Não foi possível conectar à API agora. Tente novamente em alguns instantes.";
  }

  return rawMessage || "Não foi possível carregar este post agora.";
};

const resolveReplyError = (error: unknown) => {
  const apiError = error as ApiError;
  const rawMessage =
    apiError?.data?.error ||
    apiError?.data?.message ||
    (error instanceof Error ? error.message : "");

  return rawMessage || "Não foi possível publicar sua resposta agora.";
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

const mentorBadgeClassName = (badge: string) => {
  if (badge.includes("#1")) {
    return "text-[#1F2937]";
  }

  return "text-[#0F172A]";
};

const mentorBadgeBackground = (badge: string) => {
  if (badge.includes("#1")) {
    return "linear-gradient(90deg, #CE953A 0%, #EFEF7B 71%, #9C7924 99%)";
  }

  if (badge.includes("#2")) {
    return "linear-gradient(90deg, #CBD5E1 0%, #F1F5F9 50%, #94A3B8 100%)";
  }

  if (badge.includes("#3")) {
    return "linear-gradient(90deg, #A8703A 0%, #E6BE8A 45%, #CD7F32 55%, #8B4513 100%)";
  }

  return "linear-gradient(90deg, #CE953A 0%, #EFEF7B 71%, #9C7924 99%)";
};

const MentorBadge = ({ badge }: { badge?: string | null }) => {
  if (!badge) return null;

  return (
    <span
      className={cn(
        "inline-flex w-fit items-center gap-1 rounded-[8px] px-2 py-1 text-[9px] font-black tracking-[0.02em] ring-1 ring-white/60",
        mentorBadgeClassName(badge),
      )}
      style={{ background: mentorBadgeBackground(badge) }}
    >
      <Award className="h-3 w-3" aria-hidden="true" />
      {badge}
    </span>
  );
};

const AuthorAvatar = ({
  anonymous,
  author,
  size = "md",
}: {
  anonymous?: boolean;
  author: PostDetail["author"] | PostReply["author"];
  size?: "sm" | "md";
}) => {
  const sizeClass = size === "sm" ? "h-8 w-8" : "h-10 w-10";

  if (anonymous) {
    return (
      <span
        className={cn(
          "grid shrink-0 place-items-center rounded-full bg-[#F1F5F9] text-[#94A3B8] ring-2 ring-[#E2E8F0] dark:bg-surface-muted dark:text-muted dark:ring-border",
          sizeClass,
        )}
      >
        <UserX className={size === "sm" ? "h-4 w-4" : "h-5 w-5"} aria-hidden="true" />
      </span>
    );
  }

  const avatarSrc = resolvePublicMediaUrl(author.avatar);
  const avatarIsPublicMedia = isPublicMediaUrl(author.avatar);

  return (
    <span
      className={cn(
        "relative grid shrink-0 place-items-center overflow-hidden rounded-full bg-primary-soft text-xs font-black text-primary ring-2 ring-white dark:ring-background",
        sizeClass,
      )}
    >
      {avatarSrc ? (
        <Image
          alt={author.name}
          className="object-cover"
          fill
          sizes={size === "sm" ? "32px" : "40px"}
          src={avatarSrc}
          unoptimized={avatarIsPublicMedia}
        />
      ) : (
        getInitials(author.name)
      )}
    </span>
  );
};

const MediaBlock = ({
  alt,
  mediaType,
  mediaUrl,
  size = "lg",
}: {
  alt: string;
  mediaType: string | null;
  mediaUrl: string | null;
  size?: "lg" | "md";
}) => {
  if (!mediaUrl) return null;

  const src = resolvePublicMediaUrl(mediaUrl);
  if (!src) return null;

  const radius = size === "lg" ? "rounded-[22px]" : "rounded-[18px]";
  const imageSizes =
    size === "lg"
      ? "(max-width: 430px) calc(100vw - 40px), 640px"
      : "(max-width: 430px) calc(100vw - 64px), 540px";

  if (mediaType === "video") {
    return (
      <div
        className={cn(
          "relative mt-3 overflow-hidden border border-border bg-black shadow-inner",
          radius,
        )}
      >
        <video className="aspect-[4/5] w-full object-cover" controls playsInline src={src}>
          <track kind="captions" label="Português" srcLang="pt-BR" />
        </video>
        <span className="pointer-events-none absolute inset-0 grid place-items-center text-white/70">
          <span className="grid h-14 w-14 place-items-center rounded-full bg-black/30 backdrop-blur">
            <Play className="ml-1 h-6 w-6 fill-white" aria-hidden="true" />
          </span>
        </span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative mt-3 aspect-[4/5] overflow-hidden border border-border bg-surface-muted",
        radius,
      )}
    >
      <Image
        alt={alt}
        className="object-cover"
        fill
        sizes={imageSizes}
        src={src}
        unoptimized={isPublicMediaUrl(mediaUrl)}
      />
    </div>
  );
};

const PostHeader = ({ post, slug }: { post: PostDetail; slug: string }) => {
  const isPsychologistPost = post.author.role === "psicologo";
  const isAnonymousPatient = !isPsychologistPost && post.anonymous;

  return (
    <header className="grid gap-4 border-[#EDF1F5] border-b px-5 pt-4 pb-3 dark:border-border">
      <div className="flex items-center justify-between gap-3">
        <Button asChild className="h-10 w-10 rounded-full p-0" variant="ghost">
          <Link href={slug ? `/app/community/${slug}` : DEFAULT_COMMUNITY_FEED_HREF}>
            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
            <span className="sr-only">Voltar</span>
          </Link>
        </Button>
        <h1 className="text-base font-black text-[#182033] dark:text-foreground">Post</h1>
        <button
          aria-label="Mais opções"
          className="grid h-10 w-10 place-items-center rounded-full text-[#64748B] transition hover:bg-surface-muted"
          type="button"
        >
          <MoreVertical className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      <div className="flex min-w-0 items-center gap-1.5 text-[11px] font-semibold text-muted">
        <FileText className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span className="shrink-0">Postado em</span>
        <Link
          className="block min-w-0 overflow-hidden text-ellipsis whitespace-nowrap font-black text-foreground underline-offset-4 hover:text-primary hover:underline"
          href={`/app/community/${post.community.slug}`}
        >
          {post.community.name}
        </Link>
        <button
          className="ml-1 shrink-0 rounded-full border border-[#8FC7EA] px-3 py-1 text-[11px] font-black text-primary transition hover:bg-primary-soft"
          type="button"
        >
          Seguir
        </button>
      </div>

      <div className="flex items-start gap-3">
        <AuthorAvatar anonymous={isAnonymousPatient} author={post.author} />
        <div className="grid min-w-0 flex-1 gap-1">
          <MentorBadge badge={post.author.featured_badge ?? post.featured_badge} />
          <div className="flex min-w-0 items-center gap-1.5">
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
    </header>
  );
};

const PostBody = ({ post }: { post: PostDetail }) => (
  <div className="grid gap-3 px-5 py-4">
    <h2 className="text-[1.45rem] font-black leading-[1.16] tracking-[-0.03em] text-[#182033] dark:text-foreground">
      {post.title}
    </h2>
    <p className="whitespace-pre-line text-sm leading-6 text-[#475569] dark:text-muted">
      {post.content}
    </p>
    <MediaBlock alt={post.title} mediaType={post.media_type} mediaUrl={post.media_url} />
  </div>
);

const PostVoteBar = ({
  currentVote,
  disabled,
  onShare,
  onToggleSave,
  onVote,
  post,
}: {
  currentVote: 1 | -1 | null;
  disabled?: boolean;
  onShare: () => void;
  onToggleSave: () => void;
  onVote: (value: 1 | -1) => void;
  post: PostDetail;
}) => (
  <div className="flex items-center justify-between border-[#EDF1F5] border-t px-4 py-3 dark:border-border">
    <div className="flex items-center gap-1">
      <button
        aria-pressed={currentVote === 1}
        className={cn(
          "inline-flex h-9 items-center gap-1.5 rounded-full px-2.5 text-xs font-bold text-[#475569] transition hover:bg-primary-soft hover:text-primary disabled:opacity-60",
          currentVote === 1 && "bg-primary-soft text-primary",
        )}
        disabled={disabled}
        onClick={() => onVote(1)}
        type="button"
      >
        <ArrowUp className="h-4 w-4" aria-hidden="true" />
        {post.upvotes_count.toLocaleString("pt-BR")}
      </button>
      <button
        aria-label="Dar downvote"
        aria-pressed={currentVote === -1}
        className={cn(
          "grid h-9 w-9 place-items-center rounded-full text-[#475569] transition hover:bg-surface-muted hover:text-[#182033] disabled:opacity-60",
          currentVote === -1 && "bg-surface-muted text-[#182033]",
        )}
        disabled={disabled}
        onClick={() => onVote(-1)}
        type="button"
      >
        <ArrowDown className="h-4 w-4" aria-hidden="true" />
      </button>
      <a
        className="inline-flex h-9 items-center gap-1.5 rounded-full px-2 text-xs font-bold text-[#475569] transition hover:bg-primary-soft hover:text-primary"
        href="#discussao"
      >
        <MessageCircle className="h-4 w-4" aria-hidden="true" />
        {post.replies_count.toLocaleString("pt-BR")}
      </a>
    </div>
    <div className="flex items-center gap-1">
      <button
        aria-label={post.saved ? "Remover dos salvos" : "Salvar post"}
        aria-pressed={post.saved}
        className={cn(
          "inline-flex h-9 items-center gap-1.5 rounded-full px-2 text-xs font-bold text-[#475569] transition hover:bg-primary-soft hover:text-primary disabled:opacity-60",
          post.saved && "bg-primary-soft text-primary",
        )}
        disabled={disabled}
        onClick={onToggleSave}
        type="button"
      >
        <Bookmark className={cn("h-4 w-4", post.saved && "fill-current")} aria-hidden="true" />
        {post.saves_count.toLocaleString("pt-BR")}
      </button>
      <button
        aria-label={`Compartilhar ${post.title}`}
        className="grid h-9 w-9 place-items-center rounded-full text-[#475569] transition hover:bg-primary-soft hover:text-primary"
        onClick={onShare}
        type="button"
      >
        <Share2 className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  </div>
);

const ReplyVoteBar = ({
  currentVote,
  disabled,
  onReply,
  onShare,
  onVote,
  reply,
}: {
  currentVote: 1 | -1 | null;
  disabled?: boolean;
  onReply: () => void;
  onShare: () => void;
  onVote: (value: 1 | -1) => void;
  reply: PostReply;
}) => (
  <div className="mt-3 flex items-center justify-between gap-2">
    <div className="flex items-center gap-1">
      <button
        aria-pressed={currentVote === 1}
        className={cn(
          "inline-flex h-8 items-center gap-1 rounded-full px-2 text-xs font-bold text-[#64748B] transition hover:bg-primary-soft hover:text-primary disabled:opacity-60",
          currentVote === 1 && "bg-primary-soft text-primary",
        )}
        disabled={disabled}
        onClick={() => onVote(1)}
        type="button"
      >
        <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
        {reply.upvotes_count.toLocaleString("pt-BR")}
      </button>
      <button
        aria-label="Dar downvote na resposta"
        aria-pressed={currentVote === -1}
        className={cn(
          "grid h-8 w-8 place-items-center rounded-full text-[#64748B] transition hover:bg-surface-muted hover:text-[#182033] disabled:opacity-60",
          currentVote === -1 && "bg-surface-muted text-[#182033]",
        )}
        disabled={disabled}
        onClick={() => onVote(-1)}
        type="button"
      >
        <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
      <button
        className="inline-flex h-8 items-center gap-1 rounded-full px-2 text-xs font-bold text-[#64748B] transition hover:bg-primary-soft hover:text-primary"
        onClick={onReply}
        type="button"
      >
        <Reply className="h-3.5 w-3.5" aria-hidden="true" />
        Responder
      </button>
    </div>
    <div className="flex items-center gap-1">
      <button
        aria-label="Salvar resposta"
        className="grid h-8 w-8 place-items-center rounded-full text-[#64748B] transition hover:bg-primary-soft hover:text-primary"
        type="button"
      >
        <Bookmark className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
      <button
        aria-label="Compartilhar resposta"
        className="grid h-8 w-8 place-items-center rounded-full text-[#64748B] transition hover:bg-primary-soft hover:text-primary"
        onClick={onShare}
        type="button"
      >
        <Share2 className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </div>
  </div>
);

const ReplyCard = ({
  depth = 0,
  onReply,
  onShare,
  onVote,
  reply,
  votePending,
}: {
  depth?: number;
  onReply: (reply: PostReply) => void;
  onShare: (reply: PostReply) => void;
  onVote: (replyId: string, value: 1 | -1) => void;
  reply: PostReply;
  votePending?: boolean;
}) => {
  const isProfessional = reply.author.role === "psicologo";

  return (
    <article
      className={cn(
        "relative grid gap-2 rounded-[20px] bg-white p-4 text-[#182033] dark:bg-surface dark:text-foreground",
        depth === 0
          ? "border border-[#E5EAF0] shadow-[0_10px_24px_rgba(15,23,42,0.05)]"
          : "border border-[#EDF1F5] shadow-none",
      )}
      id={`reply-${reply.id}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-3">
          <AuthorAvatar author={reply.author} size="sm" />
          <div className="grid min-w-0 gap-1">
            <MentorBadge badge={reply.author.featured_badge} />
            <div className="flex min-w-0 items-center gap-1.5">
              <h3 className="truncate text-sm font-black">{reply.author.name}</h3>
              {reply.author.verified ? (
                <BadgeCheck
                  className="h-4 w-4 shrink-0 fill-[#2da7ff] text-white"
                  aria-hidden="true"
                />
              ) : null}
            </div>
            <p className="text-[11px] font-semibold text-muted">
              {reply.author.type_label} • {formatRelativeTime(reply.created_at)}
            </p>
          </div>
        </div>
        <button
          aria-label="Mais opções da resposta"
          className="grid h-8 w-8 place-items-center rounded-full text-[#64748B] transition hover:bg-surface-muted"
          type="button"
        >
          <MoreVertical className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      {reply.title ? <h4 className="text-base font-black leading-6">{reply.title}</h4> : null}
      <p className="whitespace-pre-line text-sm leading-6 text-[#475569] dark:text-muted">
        {reply.content}
      </p>
      <MediaBlock
        alt={reply.title ?? "Mídia da resposta"}
        mediaType={reply.media_type}
        mediaUrl={reply.media_url}
        size="md"
      />

      {isProfessional && reply.author.verified && reply.author.whatsapp_url ? (
        <Button
          asChild
          className="mt-1 h-11 w-full rounded-[14px] border-2 border-[#23C266] bg-transparent text-[#23C266] shadow-none hover:bg-[#23C266] hover:text-white"
        >
          <a href={reply.author.whatsapp_url} rel="noreferrer" target="_blank">
            <MessageCircle className="h-5 w-5" aria-hidden="true" />
            Chamar no WhatsApp
          </a>
        </Button>
      ) : null}

      <ReplyVoteBar
        currentVote={reply.current_user_vote}
        disabled={votePending}
        onReply={() => onReply(reply)}
        onShare={() => onShare(reply)}
        onVote={(value) => onVote(reply.id, value)}
        reply={reply}
      />

      {reply.replies.length > 0 ? (
        <div className="ml-4 grid gap-3 border-[#DCEBFF] border-l-2 pl-4">
          {reply.replies.map((child) => (
            <ReplyCard
              depth={1}
              key={child.id}
              onReply={onReply}
              onShare={onShare}
              onVote={onVote}
              reply={child}
              votePending={votePending}
            />
          ))}
          {reply.replies.length >= 3 ? (
            <button
              className="w-fit rounded-full px-2 py-1 text-[11px] font-black text-primary hover:bg-primary-soft"
              type="button"
            >
              Ver mais respostas
            </button>
          ) : null}
        </div>
      ) : null}
    </article>
  );
};

const ReplyComposer = ({
  apiError,
  disabled,
  formRef,
  onCancelTarget,
  onSubmit,
  replyTarget,
}: {
  apiError?: string | null;
  disabled?: boolean;
  formRef: RefObject<HTMLFormElement | null>;
  onCancelTarget: () => void;
  onSubmit: (values: ReplyComposerForm) => void;
  replyTarget: ReplyTarget;
}) => {
  const form = useReplyComposerForm(replyTarget?.name);
  const { formProps, hook } = form;
  const visibleError = useMemo(() => {
    if (apiError) return apiError;
    if (!hook.formState.isSubmitted) return null;

    return Object.values(hook.formState.errors)[0]?.message?.toString() ?? null;
  }, [apiError, hook.formState.errors, hook.formState.isSubmitted]);
  const content = hook.watch("content");
  const ready = String(content ?? "").trim().length >= 3;
  const FieldComponent = components[formProps.fields[0].field];

  return (
    <form
      className="grid gap-3 rounded-[22px] border border-[#E5EAF0] bg-white p-4 shadow-[0_10px_24px_rgba(15,23,42,0.05)] dark:border-border dark:bg-surface"
      noValidate
      onSubmit={hook.handleSubmit((values) => {
        onSubmit(values);
        hook.reset({ content: "" });
      })}
      ref={formRef}
    >
      {replyTarget ? (
        <div className="flex items-center justify-between gap-3 rounded-2xl bg-primary-soft px-3 py-2 text-xs font-bold text-primary">
          Respondendo {replyTarget.name}
          <button
            className="rounded-full px-2 py-1 hover:bg-white/70"
            onClick={onCancelTarget}
            type="button"
          >
            Cancelar
          </button>
        </div>
      ) : null}

      <FieldComponent control={hook.control} {...formProps.fields[0]} />

      {visibleError ? (
        <InlineAlert title="Não foi possível responder" variant="error">
          {visibleError}
        </InlineAlert>
      ) : null}

      <Button
        className="h-12 rounded-2xl bg-[#308CE8] text-sm font-black shadow-[0_12px_24px_rgba(48,140,232,0.22)] hover:bg-[#2579CF] disabled:bg-[#DDEEFF] disabled:text-[#7FAFDF] disabled:opacity-100 disabled:shadow-none"
        disabled={disabled || !ready}
        type="submit"
      >
        {disabled ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <Send className="h-4 w-4" aria-hidden="true" />
        )}
        Publicar resposta
      </Button>
    </form>
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
      aria-label="Paginação de respostas"
      className="flex items-center justify-between gap-3 rounded-[22px] border border-border bg-white p-3 shadow-[var(--lectum-shadow-soft)] dark:bg-surface"
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

const RepliesList = ({
  errorMessage,
  loading,
  onReply,
  onShare,
  onVote,
  replies,
  votePending,
}: {
  errorMessage?: string | null;
  loading?: boolean;
  onReply: (reply: PostReply) => void;
  onShare: (reply: PostReply) => void;
  onVote: (replyId: string, value: 1 | -1) => void;
  replies: PostReply[];
  votePending?: boolean;
}) => (
  <section className="grid gap-3" id="discussao">
    <div className="flex items-center gap-2 px-1">
      <span className="h-6 w-1 rounded-full bg-[#308CE8]" />
      <h2 className="text-sm font-black tracking-[0.08em] text-[#64748B] uppercase">Discussão</h2>
    </div>

    {loading ? (
      <div className="grid min-h-[220px] place-items-center rounded-[22px] border border-border bg-white shadow-[var(--lectum-shadow-soft)] dark:bg-surface">
        <LoadingState label="Carregando respostas" />
      </div>
    ) : null}

    {errorMessage ? (
      <InlineAlert title="Respostas indisponíveis" variant="error">
        {errorMessage}
      </InlineAlert>
    ) : null}

    {!loading && !errorMessage && replies.length === 0 ? (
      <EmptyState
        description="Ainda não há respostas neste post. Seja a primeira pessoa a participar da conversa."
        icon={MessageCircle}
        title="Sem respostas por enquanto"
      />
    ) : null}

    {replies.length > 0 ? (
      <div className="grid gap-4 border-[#DCEBFF] border-l-2 pl-3">
        {replies.map((reply) => (
          <ReplyCard
            key={reply.id}
            onReply={onReply}
            onShare={onShare}
            onVote={onVote}
            reply={reply}
            votePending={votePending}
          />
        ))}
      </div>
    ) : null}
  </section>
);

export const PostDetailLogic = () => {
  const params = useParams<{ slug: string; id: string }>();
  const slug = typeof params.slug === "string" ? params.slug : "";
  const postId = typeof params.id === "string" ? params.id : "";
  const [page, setPage] = useState(1);
  const [replyTarget, setReplyTarget] = useState<ReplyTarget>(null);
  const [replyError, setReplyError] = useState<string | null>(null);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);
  const composerRef = useRef<HTMLFormElement | null>(null);
  const postQuery = usePostDetail(postId);
  const repliesQuery = usePostReplies(
    postId,
    { page, limit: REPLIES_LIMIT },
    Boolean(postQuery.data),
  );
  const voteMutation = useVotePost(postId);
  const saveMutation = useSavePost(postId);
  const createReplyMutation = useCreatePostReply({
    onSuccess: () => {
      setReplyError(null);
      setReplyTarget(null);
    },
    onError: (error) => setReplyError(resolveReplyError(error)),
  });
  const post = postQuery.data?.post;
  const replies = repliesQuery.data?.data ?? [];
  const postError = postQuery.isError ? resolvePostError(postQuery.error) : null;
  const repliesError = repliesQuery.isError ? resolvePostError(repliesQuery.error) : null;

  const sharePost = async () => {
    if (!post || typeof window === "undefined") return;

    const url = `${window.location.origin}/app/community/${post.community.slug}/post/${post.id}`;

    try {
      if (navigator.share) {
        await navigator.share({ title: post.title, url });
      } else {
        await navigator.clipboard.writeText(url);
      }
      setShareFeedback("post");
      window.setTimeout(() => setShareFeedback(null), 2400);
    } catch {
      setShareFeedback(null);
    }
  };

  const shareReply = async (reply: PostReply) => {
    if (!post || typeof window === "undefined") return;

    const url = `${window.location.origin}/app/community/${post.community.slug}/post/${post.id}#reply-${reply.id}`;

    try {
      if (navigator.share) {
        await navigator.share({ title: post.title, text: reply.content, url });
      } else {
        await navigator.clipboard.writeText(url);
      }
      setShareFeedback(reply.id);
      window.setTimeout(() => setShareFeedback(null), 2400);
    } catch {
      setShareFeedback(null);
    }
  };

  const handleReplyTarget = (reply: PostReply) => {
    if (reply.parent_reply_id) return;

    setReplyTarget({ id: reply.id, name: reply.author.name });
    window.setTimeout(() => {
      composerRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 50);
  };

  return (
    <PrivateTemplate
      contentClassName="bg-[#F5F7FA] px-0 py-0 dark:bg-background"
      navigationTheme="solidWhite"
      showHeader
    >
      <section className="mx-auto min-h-screen w-full max-w-[430px] bg-[#F5F7FA] pb-6 text-[#182033] dark:bg-background dark:text-foreground sm:max-w-2xl lg:max-w-3xl">
        {postQuery.isLoading || postQuery.isPending ? (
          <div className="grid min-h-[70vh] place-items-center px-5">
            <LoadingState label="Carregando post" />
          </div>
        ) : null}

        {postError ? (
          <div className="px-5 pt-6">
            <EmptyState
              action={
                <Button asChild variant="outline">
                  <Link href={DEFAULT_COMMUNITY_FEED_HREF}>Voltar ao feed</Link>
                </Button>
              }
              description={postError}
              icon={MessageCircle}
              title="Post indisponível"
            />
          </div>
        ) : null}

        {post ? (
          <>
            <article className="overflow-hidden bg-white shadow-[0_10px_26px_rgba(15,23,42,0.04)] dark:bg-surface sm:mt-4 sm:rounded-[26px] sm:border sm:border-border">
              <PostHeader post={post} slug={slug || post.community.slug} />
              <PostBody post={post} />
              <PostVoteBar
                currentVote={post.current_user_vote}
                disabled={voteMutation.isPending || saveMutation.isPending}
                onShare={sharePost}
                onToggleSave={() => saveMutation.mutate(post.saved)}
                onVote={(value) => voteMutation.mutate({ value })}
                post={post}
              />
            </article>

            <div className="grid gap-4 px-5 pt-4 sm:px-0">
              {shareFeedback ? (
                <InlineAlert title="Link preparado" variant="success">
                  Link copiado ou enviado para compartilhamento.
                </InlineAlert>
              ) : null}

              {voteMutation.isError || saveMutation.isError ? (
                <InlineAlert title="Interação não atualizada" variant="error">
                  A ação foi desfeita localmente. Tente novamente em alguns instantes.
                </InlineAlert>
              ) : null}

              <ReplyComposer
                apiError={replyError}
                disabled={createReplyMutation.isPending}
                formRef={composerRef}
                onCancelTarget={() => setReplyTarget(null)}
                onSubmit={(values) => {
                  setReplyError(null);
                  createReplyMutation.mutate({
                    id: post.id,
                    body: toCreatePostReplyPayload(values, replyTarget?.id),
                  });
                }}
                replyTarget={replyTarget}
              />

              <RepliesList
                errorMessage={repliesError}
                loading={repliesQuery.isLoading || repliesQuery.isPending}
                onReply={handleReplyTarget}
                onShare={shareReply}
                onVote={(replyId, value) => voteMutation.mutate({ replyId, value })}
                replies={replies}
                votePending={voteMutation.isPending}
              />

              {repliesQuery.isFetching && !repliesQuery.isLoading ? (
                <LoadingState label="Atualizando respostas" />
              ) : null}

              <Pagination
                currentPage={page}
                disabled={repliesQuery.isFetching}
                onPageChange={setPage}
                pages={repliesQuery.data?.pages ?? 0}
              />
            </div>
          </>
        ) : null}
      </section>
    </PrivateTemplate>
  );
};
