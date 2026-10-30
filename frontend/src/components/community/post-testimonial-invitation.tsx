"use client";

import type { ReactNode } from "react";
import type { PostDetail, PostProfessionalReply } from "@/api/generator/types/posts";
import { TestimonialInvitation } from "@/components/reviews/testimonials-sheet";
import { useAppSelector } from "@/hooks/redux";
import { canInvitePostAuthorToTestify } from "./testimonial-invitation-policy";

export const PostTestimonialInvitation = ({
  postAuthorId,
  reply,
}: {
  postAuthorId?: string | null;
  reply: Pick<PostProfessionalReply, "parent_reply_id" | "media_url" | "media_type" | "author">;
}) => {
  const user = useAppSelector((state) => state.user);
  if (
    !canInvitePostAuthorToTestify({
      currentUserId: user?.id,
      currentUserRole: user?.role,
      postAuthorId,
      reply,
    })
  )
    return null;
  return <TestimonialInvitation psychologistId={reply.author.id} appearance="inline" />;
};

export const renderPostTestimonialSlot = (
  post: Pick<PostDetail, "author">,
  reply: PostProfessionalReply | null | undefined,
  existing: ReactNode,
) => (
  <>
    {existing}
    {reply ? <PostTestimonialInvitation postAuthorId={post.author.id} reply={reply} /> : null}
  </>
);
