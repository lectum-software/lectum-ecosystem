"use client";

import { BadgeCheck } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import type { PostProfessionalReply } from "@/api/generator/types/posts";
import { useContentAttentionTracking } from "@/components/analytics/content-attention-tracker";
import { CommunityMediaBlock } from "@/components/community/community-media-frame";
import {
  CommunityWhatsAppCta,
  toCommunityWhatsAppIdentity,
} from "@/components/community/community-whatsapp-cta";
import { InlineExpandableText } from "@/components/community/inline-expandable-text";
import { MentorBadge } from "@/components/community/mentor-badge";
import { VerifiedBadgeIcon } from "@/components/ui/verified-badge";
import { cn } from "@/lib/utils";
import {
  formatCommunityPostTime as formatPostTimeLabel,
  getCommunityAuthorDisplayName,
} from "@/utils/community-display";

import { AuthorAvatar } from "./community-post-card-author";

export const ProfessionalReplyPreview = ({
  postHref,
  presentation = "default",
  profilePublicationMode,
  reply,
  showWhatsappCta = true,
}: {
  postHref?: string;
  presentation?: "default" | "feed";
  profilePublicationMode?: boolean;
  reply: PostProfessionalReply | null;
  showWhatsappCta?: boolean;
}) => {
  const [contentExpanded, setContentExpanded] = useState(false);
  const replyAttentionTarget =
    reply?.author.role === "psicologo"
      ? ({
          targetId: reply.id,
          targetType: "reply",
        } as const)
      : null;
  const setReplyAttentionElement = useContentAttentionTracking(replyAttentionTarget);

  if (!reply) return null;

  const isFeedPresentation = presentation === "feed";
  const profileHref = `/psicologos/${reply.author.id}`;
  const authorDisplayName = getCommunityAuthorDisplayName(reply.author);
  const whatsappCta =
    showWhatsappCta && reply.author.whatsapp_url ? (
      <CommunityWhatsAppCta
        attached={Boolean(reply.media_url)}
        className={cn(!reply.media_url && !isFeedPresentation && "mt-3")}
        psychologist={toCommunityWhatsAppIdentity(reply.author)}
        trackingContext={{
          pageKind: "community_post",
          path: postHref,
          targetId: reply.id,
          targetType: "post_reply",
        }}
      />
    ) : null;

  if (isFeedPresentation) {
    return (
      <div
        className="relative grid min-w-0 cursor-pointer grid-cols-[18px_minmax(0,1fr)] gap-2 rounded-2xl border border-border bg-surface-muted p-3 dark:border-primary/20 dark:bg-primary/5"
        ref={setReplyAttentionElement}
      >
        {postHref ? (
          <Link
            aria-label="Abrir post pela resposta profissional em destaque"
            className="absolute inset-0 z-0 cursor-pointer rounded-2xl"
            href={postHref}
          />
        ) : null}
        <div className="pointer-events-none flex justify-center pt-1" aria-hidden="true">
          <span className="h-full min-h-24 w-px rounded-full bg-surface-muted dark:bg-primary/25" />
        </div>
        <div className="relative z-10 min-w-0">
          <div className="flex min-w-0 items-start gap-2.5">
            <AuthorAvatar
              avatar={reply.author.avatar}
              href={profileHref}
              name={authorDisplayName}
              size="lg"
            />
            <div className="grid min-w-0 flex-1 gap-0.5">
              <div className="flex min-w-0 items-center gap-x-2 gap-y-1">
                <span className="inline-flex min-w-0 items-center gap-[5px]">
                  <Link
                    className="min-w-0 truncate text-sm font-black text-foreground no-underline transition hover:text-foreground hover:no-underline"
                    href={profileHref}
                  >
                    {authorDisplayName}
                  </Link>
                  {reply.author.verified ? (
                    <BadgeCheck
                      className="h-4 w-4 shrink-0 fill-primary text-primary-foreground"
                      aria-hidden="true"
                    />
                  ) : null}
                </span>
                <MentorBadge badge={reply.author.featured_badge} href={profileHref} />
              </div>
              <Link
                className="min-w-0 cursor-pointer truncate text-[11px] font-semibold text-muted no-underline transition hover:text-muted hover:no-underline"
                href={profileHref}
              >
                {reply.author.type_label} <span aria-hidden="true">&bull;</span>{" "}
                {formatPostTimeLabel(reply.created_at, reply.edited_at)}
              </Link>
            </div>
          </div>
          <div className="mt-2">
            <InlineExpandableText
              className="text-sm leading-6 text-muted dark:text-muted"
              expanded={contentExpanded}
              onToggle={(event) => {
                event.preventDefault();
                event.stopPropagation();
                setContentExpanded((current) => !current);
              }}
              text={reply.content}
            />
          </div>
          {reply.media_url ? (
            <CommunityMediaBlock
              alt="Mídia da resposta profissional"
              analyticsTarget={
                reply.media_type === "video"
                  ? { targetId: reply.id, targetType: "reply" }
                  : undefined
              }
              className="mt-3"
              footer={whatsappCta}
              mediaType={reply.media_type}
              mediaUrl={reply.media_url}
              roundedClassName="rounded-[18px]"
              variant="reply"
            />
          ) : whatsappCta ? (
            <div className="mt-3">{whatsappCta}</div>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div
      className="rounded-[18px] border border-border bg-surface-muted p-4 dark:border-primary/20 dark:bg-primary/5"
      ref={setReplyAttentionElement}
    >
      {!profilePublicationMode ? (
        <p className="mb-3 text-[11px] font-black uppercase tracking-[0.08em] text-primary">
          Resposta profissional em destaque
        </p>
      ) : null}
      <div className="mb-2 flex items-center gap-2">
        <AuthorAvatar
          avatar={reply.author.avatar}
          href={profileHref}
          name={authorDisplayName}
          size="lg"
        />
        <div className="grid min-w-0 gap-1">
          <div
            className={cn(
              "flex min-w-0 items-center gap-x-2 gap-y-1",
              profilePublicationMode ? "flex-nowrap overflow-hidden" : "flex-wrap",
            )}
          >
            <span className="inline-flex min-w-0 items-center gap-[5px]">
              <Link
                className="min-w-0 truncate text-sm font-black text-foreground no-underline transition hover:text-foreground hover:no-underline"
                href={profileHref}
              >
                {authorDisplayName}
              </Link>
              {reply.author.verified ? (
                profilePublicationMode ? (
                  <VerifiedBadgeIcon className="h-4 w-4 shrink-0" aria-label="Perfil verificado" />
                ) : (
                  <BadgeCheck
                    className="h-4 w-4 shrink-0 fill-primary text-primary-foreground"
                    aria-hidden="true"
                  />
                )
              ) : null}
            </span>
            <MentorBadge
              badge={reply.author.featured_badge}
              className={profilePublicationMode ? "max-w-[124px]" : undefined}
              href={profileHref}
            />
          </div>
          <Link
            className="w-fit text-[11px] font-semibold text-muted no-underline transition hover:text-muted hover:no-underline"
            href={profileHref}
          >
            {reply.author.type_label} • {formatPostTimeLabel(reply.created_at, reply.edited_at)}
          </Link>
        </div>
      </div>
      {reply.title && !profilePublicationMode ? (
        <h4 className="mb-1 text-sm font-black text-foreground">{reply.title}</h4>
      ) : null}
      {profilePublicationMode ? (
        <InlineExpandableText
          className="text-sm leading-6 text-muted"
          expanded={contentExpanded}
          onToggle={(event) => {
            event.preventDefault();
            event.stopPropagation();
            setContentExpanded((current) => !current);
          }}
          text={reply.content}
        />
      ) : (
        <p className="text-sm leading-6 text-muted">{reply.content}</p>
      )}
      {reply.media_url ? (
        <CommunityMediaBlock
          alt={reply.title ?? "Mídia da resposta profissional"}
          analyticsTarget={
            reply.media_type === "video" ? { targetId: reply.id, targetType: "reply" } : undefined
          }
          className="mt-3"
          footer={whatsappCta}
          mediaType={reply.media_type}
          mediaUrl={reply.media_url}
          roundedClassName="rounded-[18px]"
          variant="reply"
        />
      ) : (
        whatsappCta
      )}
    </div>
  );
};
