"use client";

import { CornerUpLeft, FileText, type LucideIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type {
  DirectoryPsychologistParticipationSummary,
  DirectoryPsychologistProfilePost,
  DirectoryPsychologistTopMentorCommunity,
} from "@/api/generator/types/directory";
import type { PostListPost } from "@/api/generator/types/posts";
import { CommunityPostCard } from "@/components/community/community-post-card";
import { MentorBadge } from "@/components/community/mentor-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { InlineAlert } from "@/components/ui/inline-alert";
import { LoadingState } from "@/components/ui/loading-state";
import { cn } from "@/lib/utils";
import { isPublicMediaUrl, resolvePublicMediaUrl } from "@/utils/media";

import { formatPublicationMetric, getInitials, resolveErrorMessage } from "../modules/support";

import {
  InfiniteProfileListLoader,
  ProfileSectionCard,
  ProfileTabHeaderCard,
  PublicationCountChip,
  ViewAllChipButton,
} from "./shared";

export const ProfileCommunityPostCard = ({
  canInteract,
  onOpenSocialVideoPreview,
  onShare,
  post,
}: {
  canInteract: boolean;
  onOpenSocialVideoPreview?: (post: PostListPost, replyId?: string | null) => void;
  onShare: (post: PostListPost) => void;
  post: DirectoryPsychologistProfilePost;
}) => (
  <CommunityPostCard
    desktopPlainLinks
    interactiveActions={canInteract}
    onOpenSocialVideoPreview={onOpenSocialVideoPreview}
    onShare={onShare}
    openPostOnCardClick
    post={post}
    profilePublicationMode
  />
);

export const PublicationCommunityAvatar = ({
  community,
}: {
  community: DirectoryPsychologistTopMentorCommunity;
}) => {
  const avatarSrc = resolvePublicMediaUrl(community.avatar_url);
  const avatarIsPublicMedia = isPublicMediaUrl(community.avatar_url);

  return (
    <span
      className="relative grid h-[72px] w-[72px] place-items-center overflow-hidden rounded-full border-[3px] border-media-foreground text-[18px] font-extrabold ring-1 ring-border"
      data-top-mentor-avatar="true"
      style={{
        background:
          community.visual_soft_color ||
          community.visual_gradient_color ||
          "linear-gradient(135deg, var(--lectum-primary-soft) 0%, var(--lectum-surface-muted) 100%)",
        color:
          community.visual_text_color ||
          community.visual_primary_dark_color ||
          "var(--lectum-primary-hover)",
      }}
    >
      {avatarSrc ? (
        <Image
          alt={`Comunidade ${community.name}`}
          className="object-cover"
          fill
          sizes="72px"
          src={avatarSrc}
          unoptimized={avatarIsPublicMedia}
        />
      ) : (
        getInitials(community.name)
      )}
    </span>
  );
};

export const PublicationTopMentorCommunity = ({
  community,
}: {
  community: DirectoryPsychologistTopMentorCommunity;
}) => (
  <Link
    className="group flex w-[132px] min-w-[132px] snap-start flex-col items-center rounded-[18px] px-1 py-1.5 text-center no-underline transition hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 sm:w-[140px] sm:min-w-[140px]"
    data-top-mentor-community="true"
    href={`/comunidades/${community.slug}`}
  >
    <span className="relative flex w-full justify-center pb-4">
      <PublicationCommunityAvatar community={community} />
      <span className="absolute -bottom-0.5 left-1/2 flex min-w-[124px] -translate-x-1/2 justify-center">
        <MentorBadge
          badge={community.badge}
          className="min-w-[124px] justify-center whitespace-nowrap px-2.5 py-1 text-[8.5px]"
        />
      </span>
    </span>
    <span
      className="mt-1.5 line-clamp-2 w-full max-w-[124px] text-center text-[12.5px] font-extrabold leading-[1.18] tracking-[-0.02em] text-muted transition group-hover:text-foreground sm:max-w-[132px]"
      data-top-mentor-name="true"
    >
      {community.name}
    </span>
  </Link>
);

export const PublicationMetric = ({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
}) => (
  <span className="inline-flex min-w-0 items-center gap-2 text-[13px] font-bold leading-none text-muted">
    <Icon className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
    <span className="whitespace-nowrap">
      <strong className="font-extrabold text-foreground">{formatPublicationMetric(value)}</strong>{" "}
      {label}
    </span>
  </span>
);

export const PublicationsActivitySummary = ({
  summary,
}: {
  summary: DirectoryPsychologistParticipationSummary;
}) => {
  const topCommunities = summary.top_mentor_communities.slice(0, 3);
  const hasTopCommunities = topCommunities.length > 0;
  const hasMetrics = summary.posts_count > 0 || summary.replies_count > 0;

  if (!hasTopCommunities && !hasMetrics) return null;

  return (
    <section
      className="overflow-hidden rounded-[24px] border border-border bg-surface/95 px-3 py-4 sm:px-5"
      data-publications-summary="true"
    >
      {hasTopCommunities ? (
        <div className="flex snap-x gap-2.5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:justify-center sm:gap-4">
          {topCommunities.map((community) => (
            <PublicationTopMentorCommunity community={community} key={community.id} />
          ))}
        </div>
      ) : null}

      {hasMetrics ? (
        <div
          className={cn(
            "flex flex-wrap items-center justify-center gap-x-5 gap-y-2.5",
            hasTopCommunities && "mt-3.5 border-border border-t pt-3.5",
          )}
        >
          <PublicationMetric icon={FileText} label="Posts" value={summary.posts_count} />
          <span className="hidden h-5 w-px bg-surface-muted sm:block" aria-hidden="true" />
          <PublicationMetric icon={CornerUpLeft} label="Respostas" value={summary.replies_count} />
        </div>
      ) : null}
    </section>
  );
};

export const PostsPreviewSection = ({
  canInteract,
  highlightedPublication,
  isError,
  isLoading,
  onOpenSocialVideoPreview,
  onShare,
  onViewAll,
  posts,
  total,
}: {
  canInteract: boolean;
  highlightedPublication?: DirectoryPsychologistProfilePost | null;
  isError: boolean;
  isLoading: boolean;
  onOpenSocialVideoPreview?: (post: PostListPost, replyId?: string | null) => void;
  onShare: (post: PostListPost) => void;
  onViewAll: () => void;
  posts: DirectoryPsychologistProfilePost[];
  total: number;
}) => {
  const featuredPost = highlightedPublication ?? posts[0];

  return (
    <ProfileSectionCard
      action={
        total > 0 ? <ViewAllChipButton onClick={onViewAll}>Ver todas</ViewAllChipButton> : null
      }
      title="Publicações"
      titleAccessory={<PublicationCountChip total={total} />}
    >
      {isError ? (
        <p className="mt-3 rounded-[12px] border border-danger-border bg-danger-soft px-3 py-2 text-[11px] leading-[1.4] text-danger">
          Não foi possível carregar a prévia de publicações.
        </p>
      ) : null}

      {isLoading ? <LoadingState label="Carregando publicações" /> : null}

      {!isLoading && !isError && featuredPost ? (
        <div className="mt-3">
          <ProfileCommunityPostCard
            canInteract={canInteract}
            onOpenSocialVideoPreview={onOpenSocialVideoPreview}
            onShare={onShare}
            post={featuredPost}
          />
        </div>
      ) : null}

      {!isLoading && !isError && !featuredPost ? (
        <p className="mt-3 text-[13px] leading-[1.6] text-muted">
          Este profissional ainda não fez nenhuma publicação.
        </p>
      ) : null}
    </ProfileSectionCard>
  );
};

export const PostsTab = ({
  canInteract,
  error,
  hasNextPage,
  isError,
  isFetching,
  isFetchingNextPage,
  isLoading,
  onBackToOverview,
  onLoadMore,
  onOpenSocialVideoPreview,
  onShare,
  posts,
  summary,
  total,
}: {
  canInteract: boolean;
  error: unknown;
  hasNextPage: boolean;
  isError: boolean;
  isFetching: boolean;
  isFetchingNextPage: boolean;
  isLoading: boolean;
  onBackToOverview: () => void;
  onLoadMore: () => void;
  onOpenSocialVideoPreview?: (post: PostListPost, replyId?: string | null) => void;
  onShare: (post: PostListPost) => void;
  posts: DirectoryPsychologistProfilePost[];
  summary: DirectoryPsychologistParticipationSummary;
  total: number;
}) => {
  return (
    <div className="grid gap-3.5 bg-surface-muted px-3 pb-1 pt-3.5 dark:bg-background sm:px-4 sm:pt-4">
      <ProfileTabHeaderCard
        count={total}
        countLabelPlural="publicações"
        countLabelSingular="publicação"
        onBack={onBackToOverview}
        title="Publicações"
      />

      <PublicationsActivitySummary summary={summary} />

      {isError ? (
        <InlineAlert title="Não foi possível carregar publicações" variant="error">
          {resolveErrorMessage(error, "Não foi possível carregar as publicações deste perfil.")}
        </InlineAlert>
      ) : null}

      {isLoading ? (
        <div className="box-border grid min-h-[30vh] place-items-center rounded-[22px] border border-border bg-surface">
          <LoadingState label="Carregando publicações" />
        </div>
      ) : null}

      {!isLoading && !isError && posts.length === 0 ? (
        <EmptyState
          description="Este profissional ainda não fez nenhuma publicação."
          icon={FileText}
          title="Nenhuma publicação pública"
        />
      ) : null}

      {!isLoading && !isError && posts.length > 0 ? (
        <div className="grid gap-3.5">
          {posts.map((post) => (
            <ProfileCommunityPostCard
              canInteract={canInteract}
              key={`${post.contribution_type}-${post.id}-${post.highlighted_professional_reply?.id ?? "post"}`}
              onOpenSocialVideoPreview={onOpenSocialVideoPreview}
              onShare={onShare}
              post={post}
            />
          ))}
        </div>
      ) : null}

      {isFetching && !isFetchingNextPage && !isLoading ? (
        <LoadingState label="Atualizando publicações" />
      ) : null}

      <InfiniteProfileListLoader
        hasNextPage={hasNextPage}
        isLoading={isFetchingNextPage}
        label="Carregando mais publicações"
        onLoadMore={onLoadMore}
      />
    </div>
  );
};
