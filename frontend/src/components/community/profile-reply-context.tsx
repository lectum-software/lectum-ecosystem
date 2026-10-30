"use client";

import Link from "next/link";
import type { CommunityAuthor } from "@/api/generator/types/community";
import type { PostListPost, PostProfessionalReply } from "@/api/generator/types/posts";
import { getCommunityAuthorDisplayName } from "@/utils/community-display";
import { postDetailHref } from "./community-post-card-support";
import { InlineExpandableText } from "./inline-expandable-text";
import { ProfileReplyQuestion } from "./profile-reply-question";

type ProfileReplyContextProps = {
  post: PostListPost;
  reply: PostProfessionalReply & { parent_author?: CommunityAuthor | null };
};

export const ProfileReplyContext = ({ post, reply }: ProfileReplyContextProps) => {
  if (!reply.parent_reply_id) {
    return <ProfileReplyQuestion content={post.content} title={post.title} />;
  }

  const parentName = reply.parent_author
    ? getCommunityAuthorDisplayName(reply.parent_author)
    : null;

  return (
    <Link
      className="mb-4 grid min-w-0 gap-2 rounded-md no-underline [overflow-wrap:anywhere] hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
      data-profile-reply-parent-context
      href={postDetailHref(post, reply.parent_reply_id)}
      onClick={(event) => event.stopPropagation()}
    >
      <h3 className="text-sm font-semibold leading-6 text-foreground">
        {parentName ? `Comentário de ${parentName}` : "Comentário"}
      </h3>
      {reply.parent_content?.trim() ? (
        <InlineExpandableText
          className="text-sm leading-6 text-muted"
          expanded={false}
          text={reply.parent_content}
        />
      ) : null}
    </Link>
  );
};
