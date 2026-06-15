"use client";

import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  BadgeCheck,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  FileText,
  Flag,
  Loader2,
  MessageCircle,
  MoreVertical,
  Paperclip,
  Play,
  Reply,
  Send,
  Share2,
  UserX,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  type ChangeEvent,
  type MouseEvent,
  type RefObject,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  useCreatePostReply,
  usePostDetail,
  usePostReplies,
  useReportPost,
  useSavePost,
  useSaveReply,
  useUploadPostReplyMedia,
  useVotePost,
} from "@/api/callers/posts";
import type { PostDetail, PostReply } from "@/api/generator/types/posts";
import { CommunityFollowToggle } from "@/components/community/community-follow-toggle";
import { PostActionButton, PostActionLink } from "@/components/community/post-action-button";
import { VoteActionButton } from "@/components/community/vote-action-button";
import { components } from "@/components/controllers";
import { PsychologistWhatsAppRedirectButton } from "@/components/psychologists/psychologist-whatsapp-redirect-button";
import { EmptyState } from "@/components/ui/empty-state";
import { InlineAlert } from "@/components/ui/inline-alert";
import { LoadingState } from "@/components/ui/loading-state";
import { WhatsAppIcon } from "@/components/ui/whatsapp-icon";
import { useAppSelector } from "@/hooks/redux";
import { cn } from "@/lib/utils";
import { Button } from "@/registry/new-york-v4/ui/button";
import { PrivateTemplate } from "@/templates/private";
import { DEFAULT_COMMUNITY_FEED_HREF } from "@/utils/community";
import { isPublicMediaUrl, resolvePublicMediaUrl } from "@/utils/media";
import {
  type PostReportForm,
  type ReplyComposerForm,
  toCreatePostReplyPayload,
  toPostReportPayload,
  usePostReportForm,
  useReplyComposerForm,
} from "./use-form";

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

type ReplyMediaPermission = {
  canAttach: boolean;
  reason: string;
};

const replyMediaPermissionLabel =
  "Mídia disponível apenas para psicólogos verificados com Plano Profissional ativo.";

const useReplyMediaPermission = (): ReplyMediaPermission => {
  const user = useAppSelector((state) => state.user);
  const activeProfessionalPlan = user?.psychologist_profile?.subscriptions?.some(
    (subscription) =>
      subscription.status === "ativa" &&
      subscription.plan?.active !== false &&
      subscription.plan?.slug !== "gratuito",
  );
  const canAttach = Boolean(
    user?.role === "psicologo" &&
      user.psychologist_profile?.cfp_verified_at &&
      activeProfessionalPlan,
  );

  if (canAttach) {
    return {
      canAttach,
      reason: "",
    };
  }

  if (user?.role === "psicologo") {
    return {
      canAttach,
      reason: "Para anexar mídia, confirme o registro CFP e mantenha o Plano Profissional ativo.",
    };
  }

  return {
    canAttach,
    reason: replyMediaPermissionLabel,
  };
};

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
    return "text-[#D4A017]";
  }

  if (badge.includes("#2")) {
    return "text-[#8A8F98]";
  }

  if (badge.includes("#3")) {
    return "text-[#B87333]";
  }

  return "text-[#D4A017]";
};

const mentorBadgeLabel = (badge: string) => {
  return badge.replace(/\bMENTOR\b/i, "Mentor");
};

const MentorBadge = ({ badge }: { badge?: string | null }) => {
  if (!badge) return null;

  return (
    <span
      className={cn(
        "shrink-0 text-[11px] font-medium leading-none tracking-normal opacity-75",
        mentorBadgeClassName(badge),
      )}
    >
      {mentorBadgeLabel(badge)}
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
  size?: "sm" | "md" | "reply";
}) => {
  const sizeClass = size === "sm" ? "h-8 w-8" : size === "reply" ? "h-9 w-9" : "h-10 w-10";
  const imageSize = size === "sm" ? "32px" : size === "reply" ? "36px" : "40px";

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
          sizes={imageSize}
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
  const videoAspect = size === "md" ? "aspect-[9/16]" : "aspect-[4/5]";
  const compactMediaClass = size === "md" ? "mx-auto w-full max-w-[280px] sm:max-w-[320px]" : "";
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
          compactMediaClass,
        )}
      >
        <video className={cn(videoAspect, "w-full object-cover")} controls playsInline src={src}>
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
        compactMediaClass,
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

const PostHeader = ({
  onReport,
  post,
  slug,
}: {
  onReport: () => void;
  post: PostDetail;
  slug: string;
}) => {
  const isPsychologistPost = post.author.role === "psicologo";
  const isAnonymousPatient = !isPsychologistPost && post.anonymous;
  const [menuOpen, setMenuOpen] = useState(false);

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
        <div className="relative">
          <button
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            aria-label="Mais opções"
            className="grid h-10 w-10 place-items-center rounded-full text-[#64748B] transition hover:bg-surface-muted"
            onClick={() => setMenuOpen((current) => !current)}
            type="button"
          >
            <MoreVertical className="h-5 w-5" aria-hidden="true" />
          </button>

          {menuOpen ? (
            <div
              className="absolute top-11 right-0 z-20 w-52 overflow-hidden rounded-2xl border border-[#E5EAF0] bg-white p-1.5 text-sm shadow-[0_18px_40px_rgba(15,23,42,0.12)] dark:border-border dark:bg-surface"
              role="menu"
            >
              <button
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left font-semibold text-[#475569] transition hover:bg-[#F8FAFC] hover:text-[#182033] dark:text-muted dark:hover:bg-surface-muted dark:hover:text-foreground"
                onClick={() => {
                  setMenuOpen(false);
                  onReport();
                }}
                role="menuitem"
                type="button"
              >
                <Flag className="h-4 w-4" aria-hidden="true" />
                Denunciar post
              </button>
            </div>
          ) : null}
        </div>
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
        <CommunityFollowToggle
          className="ml-1"
          initialFollowing={Boolean(post.community.following)}
          slug={post.community.slug}
        />
      </div>

      <div className="flex items-start gap-3">
        <AuthorAvatar anonymous={isAnonymousPatient} author={post.author} />
        <div className="grid min-w-0 flex-1 gap-1">
          <div className="flex min-w-0 items-center gap-x-2">
            <div className="flex min-w-0 items-center gap-[5px]">
              <h2 className="truncate text-sm font-black text-foreground">{post.author.name}</h2>
              {post.author.verified ? (
                <BadgeCheck
                  className="h-4 w-4 shrink-0 fill-[#2da7ff] text-white"
                  aria-hidden="true"
                />
              ) : null}
            </div>
            <MentorBadge badge={post.author.featured_badge ?? post.featured_badge} />
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
  <div className="flex flex-wrap items-center justify-between gap-2 border-[#EDF1F5] border-t px-4 py-3 dark:border-border">
    <div className="flex min-w-0 items-center gap-2">
      <div className="inline-flex items-center gap-0.5 rounded-full bg-[#F4F6F8] p-0.5 ring-1 ring-[#E7ECF2] dark:bg-surface-muted dark:ring-border">
        <VoteActionButton
          count={post.upvotes_count}
          currentVote={currentVote}
          disabled={disabled}
          icon={ArrowUp}
          label="Dar upvote"
          onVote={onVote}
          size="sm"
          value={1}
        />
        <span className="h-4 w-px bg-[#DDE4EC] dark:bg-border" aria-hidden="true" />
        <VoteActionButton
          currentVote={currentVote}
          disabled={disabled}
          icon={ArrowDown}
          label="Dar downvote"
          onVote={onVote}
          showPositiveDelta={false}
          size="sm"
          value={-1}
        />
      </div>
      <PostActionLink
        count={post.replies_count}
        href="#discussao"
        icon={MessageCircle}
        label={"Ir para coment\u00e1rios"}
        size="sm"
      />
    </div>
    <div className="flex shrink-0 items-center gap-1">
      <PostActionButton
        active={post.saved}
        count={post.saves_count}
        disabled={disabled}
        icon={Bookmark}
        iconClassName={post.saved ? "fill-current" : undefined}
        label={post.saved ? "Remover dos salvos" : "Salvar post"}
        onClick={onToggleSave}
        size="sm"
      />
      <PostActionButton
        className="w-8 px-0"
        icon={Share2}
        label={`Compartilhar ${post.title}`}
        onClick={onShare}
        size="sm"
      />
    </div>
  </div>
);

const ReplyVoteBar = ({
  currentVote,
  disabled,
  onReply,
  onShare,
  onToggleSave,
  onVote,
  reply,
  savePending,
}: {
  currentVote: 1 | -1 | null;
  disabled?: boolean;
  onReply: () => void;
  onShare: () => void;
  onToggleSave: (event: MouseEvent<HTMLButtonElement>) => void;
  onVote: (value: 1 | -1) => void;
  reply: PostReply;
  savePending?: boolean;
}) => (
  <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
    <div className="flex min-w-0 items-center gap-2">
      <div className="inline-flex items-center gap-0.5 rounded-full bg-[#F4F6F8] p-0.5 ring-1 ring-[#E7ECF2] dark:bg-surface-muted dark:ring-border">
        <VoteActionButton
          count={reply.upvotes_count}
          currentVote={currentVote}
          disabled={disabled}
          icon={ArrowUp}
          label="Dar upvote na resposta"
          onVote={onVote}
          size="sm"
          value={1}
        />
        <span className="h-4 w-px bg-[#DDE4EC] dark:bg-border" aria-hidden="true" />
        <VoteActionButton
          currentVote={currentVote}
          disabled={disabled}
          icon={ArrowDown}
          label="Dar downvote na resposta"
          onVote={onVote}
          showPositiveDelta={false}
          size="sm"
          value={-1}
        />
      </div>
      <button
        className="inline-flex h-8 items-center justify-center gap-1.5 rounded-full px-2.5 text-[12px] font-semibold leading-none tracking-[-0.01em] text-muted transition hover:bg-surface-muted hover:text-foreground active:scale-[0.97]"
        onClick={onReply}
        type="button"
      >
        <Reply className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden="true" />
        Responder
      </button>
    </div>
    <div className="flex shrink-0 items-center gap-1">
      <PostActionButton
        active={reply.saved}
        className="h-8 w-8 px-0"
        disabled={savePending}
        icon={Bookmark}
        iconClassName={reply.saved ? "fill-current" : undefined}
        label={reply.saved ? "Remover resposta dos salvos" : "Salvar resposta"}
        onClick={onToggleSave}
        size="sm"
      />
      <PostActionButton
        className="h-8 w-8 px-0"
        icon={Share2}
        label="Compartilhar resposta"
        onClick={onShare}
        size="sm"
      />
    </div>
  </div>
);

const ReplyCard = ({
  depth = 0,
  onReply,
  onShare,
  onVote,
  postId,
  reply,
  votePending,
}: {
  depth?: number;
  onReply: (reply: PostReply) => void;
  onShare: (reply: PostReply) => void;
  onVote: (replyId: string, value: 1 | -1) => void;
  postId: string;
  reply: PostReply;
  votePending?: boolean;
}) => {
  const isProfessional = reply.author.role === "psicologo";
  const saveReplyMutation = useSaveReply(postId, reply.id);

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
          <AuthorAvatar author={reply.author} size={isProfessional ? "reply" : "sm"} />
          <div className="grid min-w-0 gap-1">
            <div className="flex min-w-0 items-center gap-x-2">
              <div className="flex min-w-0 items-center gap-[5px]">
                {isProfessional ? (
                  <Link
                    className="truncate text-sm font-black underline-offset-4 transition hover:text-primary hover:underline"
                    href={`/app/psychologist/${reply.author.id}`}
                  >
                    {reply.author.name}
                  </Link>
                ) : (
                  <h3 className="truncate text-sm font-black">{reply.author.name}</h3>
                )}
                {reply.author.verified ? (
                  <BadgeCheck
                    className="h-4 w-4 shrink-0 fill-[#2da7ff] text-white"
                    aria-hidden="true"
                  />
                ) : null}
              </div>
              <MentorBadge badge={reply.author.featured_badge} />
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

      <p className="whitespace-pre-line text-sm leading-6 text-[#475569] dark:text-muted">
        {reply.content}
      </p>
      <MediaBlock
        alt="Mídia da resposta"
        mediaType={reply.media_type}
        mediaUrl={reply.media_url}
        size="md"
      />

      {isProfessional && reply.author.verified && reply.author.whatsapp_url ? (
        <PsychologistWhatsAppRedirectButton
          className="mt-1 inline-flex h-11 w-full items-center justify-center gap-2 rounded-[14px] border-2 border-success bg-transparent text-success shadow-none transition hover:bg-success hover:text-white"
          psychologist={{
            avatar: reply.author.avatar,
            crp: reply.author.crp,
            id: reply.author.id,
            name: reply.author.name,
            typeLabel: reply.author.type_label,
            whatsappUrl: reply.author.whatsapp_url,
          }}
        >
          <WhatsAppIcon className="h-5 w-5" aria-hidden="true" />
          Chamar no WhatsApp
        </PsychologistWhatsAppRedirectButton>
      ) : null}

      <ReplyVoteBar
        currentVote={reply.current_user_vote}
        disabled={votePending}
        onReply={() => onReply(reply)}
        onShare={() => onShare(reply)}
        onToggleSave={() => saveReplyMutation.mutate(reply.saved)}
        onVote={(value) => onVote(reply.id, value)}
        reply={reply}
        savePending={saveReplyMutation.isPending}
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
              postId={postId}
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
  mediaPermission,
  onCancelTarget,
  onSubmit,
  replyTarget,
}: {
  apiError?: string | null;
  disabled?: boolean;
  formRef: RefObject<HTMLFormElement | null>;
  mediaPermission: ReplyMediaPermission;
  onCancelTarget: () => void;
  onSubmit: (values: ReplyComposerForm, mediaFile?: File | null) => Promise<void> | void;
  replyTarget: ReplyTarget;
}) => {
  const form = useReplyComposerForm(replyTarget?.name);
  const { formProps, hook } = form;
  const [composerActive, setComposerActive] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const visibleError = useMemo(() => {
    if (apiError) return apiError;
    if (!hook.formState.isSubmitted) return null;

    return Object.values(hook.formState.errors)[0]?.message?.toString() ?? null;
  }, [apiError, hook.formState.errors, hook.formState.isSubmitted]);
  const content = hook.watch("content");
  const ready = String(content ?? "").trim().length >= 3;
  const expanded = composerActive || ready || Boolean(replyTarget) || Boolean(selectedMedia);
  const FieldComponent = components[formProps.fields[0].field];

  const handleMediaChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file || !mediaPermission.canAttach) return;

    setSelectedMedia(file);
    setComposerActive(true);
  };

  return (
    <form
      className="fixed inset-x-0 bottom-0 z-40 grid gap-2 border-[#DDE6F0] border-t bg-white/95 p-3 pb-[calc(env(safe-area-inset-bottom)+12px)] shadow-[0_-16px_44px_rgba(15,23,42,0.14)] backdrop-blur-md dark:border-border dark:bg-surface/95 sm:static sm:rounded-[22px] sm:border sm:bg-white sm:p-3 sm:pb-3 sm:shadow-[0_10px_24px_rgba(15,23,42,0.05)] sm:backdrop-blur-0 dark:sm:bg-surface"
      noValidate
      onFocus={() => setComposerActive(true)}
      onSubmit={hook.handleSubmit(async (values) => {
        try {
          await onSubmit(values, selectedMedia);
          hook.reset({ content: "" });
          setSelectedMedia(null);
          setComposerActive(false);
        } catch {
          // O estado de erro é tratado pela mutation para manter o campo preenchido.
        }
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

      <div className="flex items-end gap-2">
        <div className="min-w-0 flex-1">
          <FieldComponent control={hook.control} {...formProps.fields[0]} />
        </div>
        {ready ? (
          <Button
            aria-label="Enviar resposta"
            className="mb-4 h-11 w-11 shrink-0 rounded-full bg-[#308CE8] p-0 text-white shadow-[0_10px_20px_rgba(48,140,232,0.24)] hover:bg-[#2579CF] disabled:bg-[#DDEEFF] disabled:text-[#7FAFDF] disabled:opacity-100 disabled:shadow-none"
            disabled={disabled || !ready}
            type="submit"
          >
            {disabled ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Send className="h-4 w-4" aria-hidden="true" />
            )}
          </Button>
        ) : null}
      </div>

      {expanded ? (
        <div className="flex flex-wrap items-center justify-between gap-2 px-0.5 text-xs text-muted">
          <input
            accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime"
            className="hidden"
            onChange={handleMediaChange}
            ref={fileInputRef}
            type="file"
          />
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
            <button
              className={cn(
                "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 font-bold transition",
                mediaPermission.canAttach
                  ? "border-[#D6E3F2] bg-white text-[#475569] hover:border-[#B8D7F5] hover:text-[#308CE8] dark:bg-surface"
                  : "cursor-not-allowed border-[#E5EAF0] bg-[#F8FAFC] text-[#94A3B8]",
              )}
              disabled={!mediaPermission.canAttach || disabled}
              onClick={() => fileInputRef.current?.click()}
              title={mediaPermission.canAttach ? "Anexar mídia" : mediaPermission.reason}
              type="button"
            >
              <Paperclip className="h-3.5 w-3.5" aria-hidden="true" />
              Anexar mídia
            </button>

            {!mediaPermission.canAttach ? (
              <span className="max-w-[280px] leading-4 text-[#64748B]">
                {mediaPermission.reason || replyMediaPermissionLabel}
              </span>
            ) : null}

            {selectedMedia ? (
              <span className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-primary-soft px-2.5 py-1 font-bold text-primary">
                <span className="truncate">{selectedMedia.name}</span>
                <button
                  aria-label="Remover mídia anexada"
                  className="grid h-5 w-5 place-items-center rounded-full hover:bg-white/70"
                  onClick={() => setSelectedMedia(null)}
                  type="button"
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </span>
            ) : null}
          </div>
        </div>
      ) : null}

      {visibleError ? (
        <InlineAlert title="Não foi possível responder" variant="error">
          {visibleError}
        </InlineAlert>
      ) : null}
    </form>
  );
};

const PostReportModal = ({
  apiError,
  disabled,
  onClose,
  onSubmit,
  open,
  postTitle,
}: {
  apiError?: string | null;
  disabled?: boolean;
  onClose: () => void;
  onSubmit: (values: PostReportForm) => Promise<void> | void;
  open: boolean;
  postTitle: string;
}) => {
  const form = usePostReportForm();
  const { Form: ReportForm, formProps, hook } = form;
  const resetReportForm = hook.reset;

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, open]);

  useEffect(() => {
    if (!open) return;
    resetReportForm({ description: "", reason: "spam" });
  }, [open, resetReportForm]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[120] grid place-items-center bg-[#0F172A]/55 px-4 py-6 backdrop-blur-md"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="post-report-title"
    >
      <div className="w-full max-w-[430px] rounded-[28px] border border-white/70 bg-white p-5 shadow-[0_24px_70px_rgba(15,23,42,0.22)] dark:border-border dark:bg-surface">
        <div className="flex items-start justify-between gap-4">
          <div className="grid gap-1">
            <p className="text-xs font-black tracking-[0.12em] text-[#64748B] uppercase">
              Moderação Lectum
            </p>
            <h2
              className="text-xl font-black tracking-[-0.03em] text-[#182033]"
              id="post-report-title"
            >
              Denunciar post
            </h2>
            <p className="line-clamp-2 text-sm leading-5 text-[#64748B]">{postTitle}</p>
          </div>
          <button
            aria-label="Fechar denúncia"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#F8FAFC] text-[#64748B] transition hover:bg-[#EDF4FF] hover:text-[#182033]"
            onClick={onClose}
            type="button"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <ReportForm
          className="mt-5 grid gap-3"
          fields={formProps.fields}
          hook={hook}
          onSubmit={hook.handleSubmit(async (values) => {
            try {
              await onSubmit(values);
            } catch {
              // A mutation exibe a mensagem no modal sem fechar o fluxo.
            }
          })}
        >
          {apiError ? (
            <InlineAlert title="Não foi possível enviar" variant="error">
              {apiError}
            </InlineAlert>
          ) : null}

          <div className="flex justify-end gap-2 pt-1">
            <Button
              className="h-10 rounded-full px-4"
              onClick={onClose}
              type="button"
              variant="outline"
            >
              Cancelar
            </Button>
            <Button
              className="h-10 rounded-full bg-[#308CE8] px-5 font-black hover:bg-[#2579CF]"
              disabled={disabled}
              type="submit"
            >
              {disabled ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
              Enviar denúncia
            </Button>
          </div>
        </ReportForm>
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
  postId,
  replies,
  votePending,
}: {
  errorMessage?: string | null;
  loading?: boolean;
  onReply: (reply: PostReply) => void;
  onShare: (reply: PostReply) => void;
  onVote: (replyId: string, value: 1 | -1) => void;
  postId: string;
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
            postId={postId}
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
  const [reportError, setReportError] = useState<string | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);
  const composerRef = useRef<HTMLFormElement | null>(null);
  const mediaPermission = useReplyMediaPermission();
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
  const uploadReplyMediaMutation = useUploadPostReplyMedia({
    onError: (error) => setReplyError(resolveReplyError(error)),
  });
  const reportMutation = useReportPost({
    onSuccess: () => {
      setReportError(null);
      setReportOpen(false);
    },
    onError: (error) => setReportError(resolveReplyError(error)),
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
              <PostHeader
                onReport={() => {
                  setReportError(null);
                  setReportOpen(true);
                }}
                post={post}
                slug={slug || post.community.slug}
              />
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

            <div className="grid gap-4 px-5 pt-4 pb-36 sm:px-0 sm:pb-6">
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
                disabled={createReplyMutation.isPending || uploadReplyMediaMutation.isPending}
                formRef={composerRef}
                mediaPermission={mediaPermission}
                onCancelTarget={() => setReplyTarget(null)}
                onSubmit={async (values, mediaFile) => {
                  setReplyError(null);
                  const media = mediaFile
                    ? await uploadReplyMediaMutation.mutateAsync({
                        file: mediaFile,
                        id: post.id,
                      })
                    : null;

                  await createReplyMutation.mutateAsync({
                    id: post.id,
                    body: toCreatePostReplyPayload(
                      values,
                      replyTarget?.id,
                      media
                        ? {
                            mediaType: media.media_type,
                            mediaUrl: media.media_url,
                          }
                        : null,
                    ),
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
                postId={post.id}
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

            <PostReportModal
              apiError={reportError}
              disabled={reportMutation.isPending}
              onClose={() => setReportOpen(false)}
              onSubmit={async (values) => {
                if (!post) return;

                setReportError(null);
                await reportMutation.mutateAsync({
                  body: toPostReportPayload(values),
                  id: post.id,
                });
              }}
              open={reportOpen}
              postTitle={post.title}
            />
          </>
        ) : null}
      </section>
    </PrivateTemplate>
  );
};
