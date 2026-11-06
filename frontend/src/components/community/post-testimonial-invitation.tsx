"use client";

import type { ReactNode } from "react";
import type { PostDetail, PostProfessionalReply } from "@/api/generator/types/posts";
import { TestimonialInvitation } from "@/components/reviews/testimonials-sheet";
import { useAppSelector } from "@/hooks/redux";
import { canInvitePostAuthorToTestify } from "./testimonial-invitation-policy";

export const PostTestimonialInvitation = ({
  postAuthorId,
  reply,
  placement = "actions",
}: {
  placement?: "actions" | "media";
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
  return (
    <TestimonialInvitation
      psychologistId={reply.author.id}
      appearance="inline"
      className={placement === "media" ? "hidden md:inline-flex md:justify-self-end" : "md:hidden"}
    />
  );
};

export const renderReplyTestimonialSlot = (
  post: Pick<PostDetail, "author">,
  reply: PostProfessionalReply | null | undefined,
  existing: ReactNode,
  placement: "actions" | "media" = "actions",
) => (
  <>
    {existing}
    {reply ? (
      <PostTestimonialInvitation
        postAuthorId={post.author.id}
        reply={reply}
        placement={placement}
      />
    ) : null}
  </>
);
