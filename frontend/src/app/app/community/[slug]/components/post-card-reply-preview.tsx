"use client";

import Link from "next/link";
import { type MouseEvent as ReactMouseEvent, type ReactNode, useState } from "react";
import type { CommunityPost } from "@/api/generator/types/community";
import {
  CommunityMediaBlock,
  type CommunityMediaOverlayAction,
} from "@/components/community/community-media-frame";
import {
  CommunityWhatsAppCta,
  toCommunityWhatsAppIdentity,
} from "@/components/community/community-whatsapp-cta";
import { InlineExpandableText } from "@/components/community/inline-expandable-text";
import { MentorAuthorMeta } from "@/components/community/mentor-author-meta";
import {
  formatCommunityPostTime as formatPostTimeLabel,
  getCommunityAuthorDisplayName,
} from "@/utils/community-display";
import { rememberCommunityFeedScrollPosition } from "../hooks/use-community-feed-scroll-restoration";
import { communityPostDetailHref } from "../modules/feed-support";
import { AuthorAvatar, AuthorIdentityLine } from "./feed-controls";

export const ProfessionalReplyMedia = ({
  enableFeedAutoplay = false,
  footer,
  overlayAction,
  reply,
}: {
  enableFeedAutoplay?: boolean;
  footer?: ReactNode;
  overlayAction?: CommunityMediaOverlayAction;
  reply: NonNullable<CommunityPost["highlighted_professional_reply"]>;
}) => {
  if (!reply.media_url) return null;

  return (
    <CommunityMediaBlock
      alt="Mídia da resposta profissional"
      analyticsTarget={
        reply.media_type === "video" ? { targetId: reply.id, targetType: "reply" } : undefined
      }
      enableFeedAutoplay={enableFeedAutoplay}
      footer={footer}
      mediaType={reply.media_type}
      mediaUrl={reply.media_url}
      overlayAction={overlayAction}
      roundedClassName="rounded-[18px]"
      thumbnailUrl={reply.thumbnail_url}
      variant="reply"
    />
  );
};

export const ProfessionalReplyPreview = ({
  enableFeedAutoplay = false,
  overlayAction,
  post,
}: {
  enableFeedAutoplay?: boolean;
  overlayAction?: CommunityMediaOverlayAction;
  post: CommunityPost;
}) => {
  const reply = post.highlighted_professional_reply;
  const [replyExpanded, setReplyExpanded] = useState(false);
  const postHref = communityPostDetailHref(post);
  const isPatientAuthoredPost = post.author.role === "paciente";

  if (!reply || !isPatientAuthoredPost) return null;

  const profileHref = `/psicologos/${reply.author.id}`;
  const handleProfileNavigationClick = (event: ReactMouseEvent<HTMLAnchorElement>) => {
    event.stopPropagation();

    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }

    rememberCommunityFeedScrollPosition(post.id);
  };
  const replyWhatsappCta = reply.author.whatsapp_url ? (
    <CommunityWhatsAppCta
      attached={Boolean(reply.media_url)}
      psychologist={toCommunityWhatsAppIdentity(reply.author)}
      stopPropagation
      trackingContext={{
        pageKind: "community_post",
        path: postHref,
        targetId: reply.id,
        targetType: "post_reply",
      }}
    />
  ) : null;

  return (
    <div className="relative min-w-0 cursor-pointer" data-feed-professional-reply>
      <Link
        aria-label={`Abrir post ${post.title}`}
        className="absolute inset-0 z-0 cursor-pointer rounded-2xl"
        href={postHref}
      />
      <div className="pointer-events-none relative z-10 min-w-0">
        <div className="flex min-w-0 items-start gap-3">
          <AuthorAvatar
            author={reply.author}
            href={profileHref}
            onClick={handleProfileNavigationClick}
          />
          <div className="grid min-w-0 flex-1 gap-0.5">
            <AuthorIdentityLine
              href={profileHref}
              name={getCommunityAuthorDisplayName(reply.author)}
              onClick={handleProfileNavigationClick}
              verified={reply.author.verified}
            />
            <Link
              className="pointer-events-auto min-w-0 cursor-pointer text-[11px] font-semibold leading-tight text-muted"
              href={profileHref}
              onClick={handleProfileNavigationClick}
            >
              <MentorAuthorMeta
                authorId={reply.author.role === "psicologo" ? reply.author.id : undefined}
                community={post.community}
                badge={reply.author.featured_badge ?? post.featured_badge}
                typeLabel={reply.author.type_label}
                date={formatPostTimeLabel(reply.created_at, reply.edited_at)}
              >
                {reply.author.type_label} <span aria-hidden="true">•</span>{" "}
                <time dateTime={reply.created_at}>
                  {formatPostTimeLabel(reply.created_at, reply.edited_at)}
                </time>
              </MentorAuthorMeta>
            </Link>
          </div>
        </div>
        {reply.content ? (
          <div className="mt-2 pl-12">
            <InlineExpandableText
              className="text-sm leading-6 text-muted dark:text-muted"
              expanded={replyExpanded}
              onToggle={(event) => {
                event.stopPropagation();
                setReplyExpanded((current) => !current);
              }}
              text={reply.content}
            />
          </div>
        ) : null}
        {reply.media_url ? (
          <div className="pointer-events-auto mt-3">
            <ProfessionalReplyMedia
              enableFeedAutoplay={enableFeedAutoplay}
              footer={replyWhatsappCta}
              overlayAction={overlayAction}
              reply={reply}
            />
          </div>
        ) : replyWhatsappCta ? (
          <div className="pointer-events-auto mt-3">{replyWhatsappCta}</div>
        ) : null}
      </div>
    </div>
  );
};
