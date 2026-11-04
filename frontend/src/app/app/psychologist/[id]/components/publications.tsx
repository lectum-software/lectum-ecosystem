"use client";

import { FileText } from "lucide-react";
import type {
  DirectoryPsychologistParticipationSummary,
  DirectoryPsychologistProfilePost,
} from "@/api/generator/types/directory";
import type { PostListPost } from "@/api/generator/types/posts";
import { CommunityPostCard } from "@/components/community/community-post-card";
import { ContentVideoScope } from "@/components/community/content-video-host";
import { EmptyState } from "@/components/ui/empty-state";
import { InlineAlert } from "@/components/ui/inline-alert";
import { LoadingState } from "@/components/ui/loading-state";
import { ProfileReplyVisibilityButton } from "./profile-reply-visibility-button";
import { PublicationsActivitySummary } from "./publications-activity-summary";

export { PublicationsActivitySummary } from "./publications-activity-summary";

import { resolveErrorMessage } from "../modules/support";

import {
  InfiniteProfileListLoader,
  ProfileSectionCard,
  PublicationCountChip,
  ViewAllChipButton,
} from "./shared";

export const ProfileCommunityPostCard = ({
  canInteract,
  readOnly = false,
  onShare,
  post,
}: {
  canInteract: boolean;
  readOnly?: boolean;
  onShare: (post: PostListPost) => void;
  post: DirectoryPsychologistProfilePost;
}) => (
  <CommunityPostCard
    desktopPlainLinks
    interactiveActions={canInteract}
    onShare={onShare}
    openPostOnCardClick={!readOnly && post.contribution_type !== "reply"}
    showWhatsappCta={!readOnly}
    showOwnerActions={!readOnly}
    post={post}
    authorHeaderExtra={
      !readOnly && post.contribution_type === "reply" ? (
        <ProfileReplyVisibilityButton post={post} />
      ) : undefined
    }
    profilePublicationMode
  />
);

export const PostsPreviewSection = ({
  canInteract,
  highlightedPublication,
  isError,
  isLoading,
  onShare,
  onViewAll,
  posts,
  total,
}: {
  canInteract: boolean;
  highlightedPublication?: DirectoryPsychologistProfilePost | null;
  isError: boolean;
  isLoading: boolean;
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
        <ContentVideoScope
          mode="profile"
          entries={[featuredPost, ...posts.filter((post) => post !== featuredPost)].map((post) => ({
            postId: post.id,
            replyId:
              post.contribution_type === "reply" ? post.highlighted_professional_reply?.id : null,
          }))}
        >
          <div className="mt-3">
            <ProfileCommunityPostCard
              canInteract={canInteract}
              onShare={onShare}
              post={featuredPost}
            />
          </div>
        </ContentVideoScope>
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
  readOnly = false,
  error,
  hasNextPage,
  isError,
  isFetching,
  isFetchingNextPage,
  isLoading,
  onLoadMore,
  onShare,
  posts,
  summary,
}: {
  canInteract: boolean;
  readOnly?: boolean;
  error: unknown;
  hasNextPage: boolean;
  isError: boolean;
  isFetching: boolean;
  isFetchingNextPage: boolean;
  isLoading: boolean;
  onLoadMore: () => void;
  onShare: (post: PostListPost) => void;
  posts: DirectoryPsychologistProfilePost[];
  summary: DirectoryPsychologistParticipationSummary;
}) => {
  return (
    <div className="grid gap-3.5 bg-background px-3 pb-1 pt-3.5 dark:bg-background sm:px-4 sm:pt-4">
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
        <ContentVideoScope
          mode="profile"
          entries={posts.map((post) => ({
            postId: post.id,
            replyId:
              post.contribution_type === "reply" ? post.highlighted_professional_reply?.id : null,
          }))}
          hasNextPage={hasNextPage}
          onLoadMore={onLoadMore}
        >
          <div className="grid gap-3.5">
            {posts.map((post) => (
              <ProfileCommunityPostCard
                canInteract={canInteract}
                readOnly={readOnly}
                key={`${post.contribution_type}-${post.id}-${post.highlighted_professional_reply?.id ?? "post"}`}
                onShare={onShare}
                post={post}
              />
            ))}
          </div>
        </ContentVideoScope>
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
