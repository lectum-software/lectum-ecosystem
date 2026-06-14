"use client";

import {
  ArrowDown,
  ArrowUp,
  BadgeCheck,
  Bookmark,
  FileText,
  type LucideIcon,
  MessageCircle,
  Play,
  Share2,
  UserX,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import type { PostListPost, PostProfessionalReply } from "@/api/generator/types/posts";
import { PsychologistWhatsAppRedirectButton } from "@/components/psychologists/psychologist-whatsapp-redirect-button";
import { WhatsAppIcon } from "@/components/ui/whatsapp-icon";
import { cn } from "@/lib/utils";
import { isPublicMediaUrl, resolvePublicMediaUrl } from "@/utils/media";

type CommunityPostCardProps = {
  footerExtra?: ReactNode;
  headerExtra?: ReactNode;
  onShare: (post: PostListPost) => void;
  post: PostListPost;
  showCommunityHeader?: boolean;
  statusBadge?: ReactNode;
};

type CountActionProps = {
  active?: boolean;
  icon: LucideIcon;
  label: string;
  value?: number;
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

const postDetailHref = (post: PostListPost) =>
  `/app/community/${post.community.slug}/post/${post.id}`;

const AuthorAvatar = ({
  anonymous,
  avatar,
  name,
  size = "md",
}: {
  anonymous?: boolean;
  avatar: string | null;
  name: string;
  size?: "md" | "lg";
}) => {
  const sizeClass = size === "lg" ? "h-10 w-10" : "h-9 w-9";
  const imageSize = size === "lg" ? "40px" : "36px";

  if (anonymous) {
    return (
      <span
        className={cn(
          "grid shrink-0 place-items-center rounded-full bg-surface-muted text-muted ring-2 ring-border",
          sizeClass,
        )}
      >
        <UserX className="h-5 w-5" aria-hidden="true" />
      </span>
    );
  }

  const avatarSrc = resolvePublicMediaUrl(avatar);

  return (
    <span
      className={cn(
        "relative grid shrink-0 place-items-center overflow-hidden rounded-full bg-primary-soft text-xs font-black text-primary ring-2 ring-background",
        sizeClass,
      )}
    >
      {avatarSrc ? (
        <Image
          alt={name}
          className="object-cover"
          fill
          sizes={imageSize}
          src={avatarSrc}
          unoptimized={isPublicMediaUrl(avatar)}
        />
      ) : (
        getInitials(name)
      )}
    </span>
  );
};

const CountAction = ({ active, icon: Icon, label, value }: CountActionProps) => (
  <span
    title={label}
    className={cn(
      "inline-flex h-8 items-center justify-center gap-1.5 rounded-full px-2.5 text-[12px] font-semibold leading-none tracking-[-0.01em] text-muted",
      active && "bg-primary-soft text-primary",
    )}
  >
    <Icon
      className={cn("h-4 w-4 shrink-0", active && label.includes("Salvar") && "fill-current")}
      strokeWidth={2}
    />
    {typeof value === "number" ? value.toLocaleString("pt-BR") : null}
  </span>
);

const MentorBadge = ({ badge }: { badge?: string | null }) => {
  if (!badge) return null;

  const colorClassName = badge.includes("#2")
    ? "text-[#8A8F98]"
    : badge.includes("#3")
      ? "text-[#B87333]"
      : "text-[#D4A017]";
  const label = badge.replace(/\bMENTOR\b/i, "Mentor");

  return (
    <span
      className={cn(
        "shrink-0 text-[11px] font-medium leading-none tracking-normal opacity-75",
        colorClassName,
      )}
    >
      {label}
    </span>
  );
};

const MediaBlock = ({
  alt,
  mediaType,
  mediaUrl,
}: {
  alt: string;
  mediaType: string | null;
  mediaUrl: string | null;
}) => {
  if (!mediaUrl) return null;

  const resolvedUrl = resolvePublicMediaUrl(mediaUrl);
  if (!resolvedUrl) return null;

  if (mediaType === "video") {
    return (
      <div className="relative overflow-hidden rounded-[22px] border border-border bg-black shadow-inner">
        <video className="aspect-[4/5] w-full object-cover" controls playsInline src={resolvedUrl}>
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
    <div className="relative aspect-[4/5] overflow-hidden rounded-[22px] border border-border bg-surface-muted">
      <Image
        alt={alt}
        className="object-cover"
        fill
        sizes="(max-width: 430px) calc(100vw - 64px), 520px"
        src={resolvedUrl}
        unoptimized={isPublicMediaUrl(mediaUrl)}
      />
    </div>
  );
};

const ProfessionalReplyPreview = ({ reply }: { reply: PostProfessionalReply | null }) => {
  if (!reply) return null;

  return (
    <div className="rounded-[18px] border border-success/20 bg-success-soft p-4">
      <p className="mb-3 text-[11px] font-black uppercase tracking-[0.08em] text-success">
        Resposta profissional em destaque
      </p>
      <div className="mb-2 flex items-center gap-2">
        <AuthorAvatar avatar={reply.author.avatar} name={reply.author.name} size="lg" />
        <div className="grid min-w-0 gap-1">
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            <span className="inline-flex min-w-0 items-center gap-[5px]">
              <span className="truncate text-sm font-black text-foreground">
                {reply.author.name}
              </span>
              {reply.author.verified ? (
                <BadgeCheck className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
              ) : null}
            </span>
            <MentorBadge badge={reply.author.featured_badge} />
          </div>
          <p className="text-[11px] font-semibold text-muted">
            {reply.author.type_label} • {formatRelativeTime(reply.created_at)} •{" "}
            {reply.upvotes_count.toLocaleString("pt-BR")} upvotes
          </p>
        </div>
      </div>
      {reply.title ? (
        <h4 className="mb-1 text-sm font-black text-foreground">{reply.title}</h4>
      ) : null}
      <p className="text-sm leading-6 text-muted">{reply.content}</p>
      <div className="mt-3">
        <MediaBlock
          alt={reply.title ?? "Mídia da resposta profissional"}
          mediaType={reply.media_type}
          mediaUrl={reply.media_url}
        />
      </div>
      {reply.author.whatsapp_url ? (
        <PsychologistWhatsAppRedirectButton
          className="mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-border bg-surface text-sm font-bold text-foreground transition hover:bg-surface-muted"
          psychologist={{
            avatar: reply.author.avatar,
            crp: reply.author.crp,
            id: reply.author.id,
            name: reply.author.name,
            typeLabel: reply.author.type_label,
            whatsappUrl: reply.author.whatsapp_url,
          }}
        >
          <WhatsAppIcon className="h-5 w-5 text-success" aria-hidden="true" />
          Chamar no WhatsApp
        </PsychologistWhatsAppRedirectButton>
      ) : null}
    </div>
  );
};

export const CommunityPostCard = ({
  footerExtra,
  headerExtra,
  onShare,
  post,
  showCommunityHeader = true,
  statusBadge,
}: CommunityPostCardProps) => {
  const isPsychologistPost = post.author.role === "psicologo";
  const isAnonymousPatient = !isPsychologistPost && post.anonymous;

  return (
    <article className="w-full overflow-hidden rounded-[22px] border border-border bg-surface p-4 shadow-[var(--lectum-shadow-soft)]">
      {showCommunityHeader ? (
        <div className="mb-4 flex min-w-0 items-center gap-1.5 text-[11px] font-semibold text-muted">
          <FileText className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span className="shrink-0">Postado em</span>
          <Link
            className="block min-w-0 overflow-hidden text-ellipsis whitespace-nowrap font-black text-foreground underline-offset-4 hover:text-primary hover:underline"
            href={`/app/community/${post.community.slug}`}
          >
            {post.community.name}
          </Link>
          {statusBadge}
          {headerExtra}
        </div>
      ) : (
        <div className="mb-3 flex justify-end">{statusBadge}</div>
      )}

      <div className="mb-3 flex items-start gap-3">
        <AuthorAvatar
          anonymous={isAnonymousPatient}
          avatar={post.author.avatar}
          name={post.author.name}
        />
        <div className="grid min-w-0 flex-1 gap-1">
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            <div className="flex min-w-0 items-center gap-[5px]">
              <h2 className="truncate text-sm font-black text-foreground">{post.author.name}</h2>
              {post.author.verified ? (
                <BadgeCheck className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
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

      <div className="grid gap-2">
        <Link
          className="text-[1.32rem] font-black leading-[1.18] tracking-[-0.02em] text-foreground underline-offset-4 transition hover:text-primary hover:underline"
          href={postDetailHref(post)}
        >
          {post.title}
        </Link>
        <p className="whitespace-pre-line text-sm leading-6 text-muted">{post.content}</p>
      </div>

      <div className="mt-4 grid gap-4">
        <MediaBlock alt={post.title} mediaType={post.media_type} mediaUrl={post.media_url} />
        <ProfessionalReplyPreview reply={post.highlighted_professional_reply} />
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-border border-t pt-3">
        <div className="flex min-w-0 items-center gap-2">
          <div className="inline-flex items-center gap-0.5 rounded-full bg-[#F4F6F8] p-0.5 ring-1 ring-[#E7ECF2] dark:bg-surface-muted dark:ring-border">
            <CountAction icon={ArrowUp} label="Upvotes" value={post.upvotes_count} />
            <span className="h-4 w-px bg-[#DDE4EC] dark:bg-border" aria-hidden="true" />
            <CountAction icon={ArrowDown} label="Downvotes" value={post.downvotes_count} />
          </div>
          <CountAction icon={MessageCircle} label="Comentários" value={post.replies_count} />
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <CountAction
            active={post.saved}
            icon={Bookmark}
            label="Salvar"
            value={post.saves_count}
          />
          <button
            aria-label={`Compartilhar ${post.title}`}
            className="grid h-8 w-8 place-items-center rounded-full text-muted transition hover:bg-primary-soft hover:text-primary active:scale-[0.97]"
            onClick={() => onShare(post)}
            type="button"
          >
            <Share2 className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
          </button>
          {footerExtra}
        </div>
      </div>
    </article>
  );
};
