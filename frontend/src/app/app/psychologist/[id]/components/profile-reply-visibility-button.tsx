"use client";

import type { DirectoryPsychologistProfilePost } from "@/api/generator/types/directory";
import { ReplyOwnerActionMenu } from "@/components/community/reply-owner-action-menu";
import { canManageReplyProfileVisibility } from "@/components/community/reply-profile-visibility-action";
import { useAppSelector } from "@/hooks/redux";

export const ProfileReplyVisibilityButton = ({
  post,
}: {
  post: DirectoryPsychologistProfilePost;
}) => {
  const currentUser = useAppSelector((state) => state.user);
  const reply = post.highlighted_professional_reply;
  if (
    post.contribution_type !== "reply" ||
    !reply ||
    !canManageReplyProfileVisibility({
      allowProfileVisibility: true,
      author: reply.author,
      currentUser,
    })
  )
    return null;
  return (
    <ReplyOwnerActionMenu
      allowProfileVisibility
      post={post}
      reply={{ ...reply, replies_received_count: reply.replies_count ?? 0 }}
    />
  );
};
