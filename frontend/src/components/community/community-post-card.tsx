"use client";

import { BadgeCheck, FileText, UserX } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import type { PostListPost, PostProfessionalReply } from "@/api/generator/types/posts";
import { CommunityActionBar } from "@/components/community/community-action-bar";
import { MentorBadge } from "@/components/community/mentor-badge";
import { PsychologistWhatsAppRedirectButton } from "@/components/psychologists/psychologist-whatsapp-redirect-button";
import { VerticalVideoPlayer } from "@/components/ui/vertical-video-player";
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
  href,
  name,
  size = "md",
}: {
  anonymous?: boolean;
  avatar: string | null;
  href?: string;
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

  const avatarNode = (
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

  if (!href) return avatarNode;

  return (
    <Link
      aria-label={`Abrir perfil de ${name}`}
      className="shrink-0 cursor-pointer rounded-full no-underline transition hover:brightness-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 active:scale-[0.98]"
      href={href}
    >
      {avatarNode}
    </Link>
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
      <VerticalVideoPlayer
        className="mx-auto w-full max-w-[390px] rounded-[22px]"
        src={resolvedUrl}
        title={alt}
      />
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

  const profileHref = `/app/psychologist/${reply.author.id}`;

  return (
    <div className="rounded-[18px] border border-[#D8ECFF] bg-[#F4FAFF] p-4 dark:border-primary/20 dark:bg-primary/5">
      <p className="mb-3 text-[11px] font-black uppercase tracking-[0.08em] text-primary">
        Resposta profissional em destaque
      </p>
      <div className="mb-2 flex items-center gap-2">
        <AuthorAvatar
          avatar={reply.author.avatar}
          href={profileHref}
          name={reply.author.name}
          size="lg"
        />
        <div className="grid min-w-0 gap-1">
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            <span className="inline-flex min-w-0 items-center gap-[5px]">
              <Link
                className="truncate text-sm font-black text-foreground no-underline transition hover:text-foreground hover:no-underline"
                href={profileHref}
              >
                {reply.author.name}
              </Link>
              {reply.author.verified ? (
                <BadgeCheck className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
              ) : null}
            </span>
            <MentorBadge badge={reply.author.featured_badge} href={profileHref} />
          </div>
          <Link
            className="w-fit text-[11px] font-semibold text-muted no-underline transition hover:text-muted hover:no-underline"
            href={profileHref}
          >
            {reply.author.type_label} • {formatRelativeTime(reply.created_at)} •{" "}
            {reply.upvotes_count.toLocaleString("pt-BR")} upvotes
          </Link>
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
  const psychologistProfileHref = isPsychologistPost
    ? `/app/psychologist/${post.author.id}`
    : undefined;

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
          href={psychologistProfileHref}
          name={post.author.name}
        />
        <div className="grid min-w-0 flex-1 gap-1">
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            <div className="flex min-w-0 items-center gap-[5px]">
              {psychologistProfileHref ? (
                <Link
                  className="truncate text-sm font-black text-foreground no-underline transition hover:text-foreground hover:no-underline"
                  href={psychologistProfileHref}
                >
                  {post.author.name}
                </Link>
              ) : (
                <h2 className="truncate text-sm font-black text-foreground">{post.author.name}</h2>
              )}
              {post.author.verified ? (
                <BadgeCheck className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
              ) : null}
            </div>
            <MentorBadge
              badge={post.author.featured_badge ?? post.featured_badge}
              href={psychologistProfileHref}
            />
          </div>
          {psychologistProfileHref ? (
            <Link
              className="w-fit text-[11px] font-semibold text-muted no-underline transition hover:text-muted hover:no-underline"
              href={psychologistProfileHref}
            >
              {post.author.type_label} <span aria-hidden="true">&bull;</span>{" "}
              {formatRelativeTime(post.created_at)}
            </Link>
          ) : (
            <p className="text-[11px] font-semibold text-muted">
              {formatRelativeTime(post.created_at)}
            </p>
          )}
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

      <CommunityActionBar
        className="mt-4 border-border border-t pt-3"
        comments={{
          count: post.replies_count,
          href: postDetailHref(post),
          label: "Comentários",
        }}
        currentVote={post.current_user_vote}
        endSlot={footerExtra}
        save={{
          active: post.saved,
          count: post.saves_count,
          label: "Salvar",
        }}
        share={{
          label: `Compartilhar ${post.title}`,
          onClick: () => onShare(post),
        }}
        upvotesCount={post.upvotes_count}
      />
    </article>
  );
};
