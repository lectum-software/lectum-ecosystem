import type { PostListPost, PostProfessionalReply } from "@/api/generator/types/posts";
import { postDetailHref } from "./community-post-card-support";
import { CommunityWhatsAppCta, toCommunityWhatsAppIdentity } from "./community-whatsapp-cta";

export function PostCardContact({
  post,
  primaryReply,
  attached,
  compact,
  focusedReplyId,
}: {
  post: PostListPost;
  primaryReply?: PostProfessionalReply | null;
  attached: boolean;
  compact: boolean;
  focusedReplyId?: string;
}) {
  return (
    <CommunityWhatsAppCta
      attached={attached}
      size={compact ? "xs" : "sm"}
      psychologist={toCommunityWhatsAppIdentity(primaryReply?.author ?? post.author)}
      stopPropagation
      trackingContext={{
        pageKind: "community_post",
        path: postDetailHref(post, focusedReplyId),
        targetId: primaryReply?.id ?? post.id,
        targetType: primaryReply ? "post_reply" : "community_post",
      }}
    />
  );
}
