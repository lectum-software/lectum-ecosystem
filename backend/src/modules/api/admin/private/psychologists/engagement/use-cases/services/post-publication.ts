import type { AdminPsychologistPublicationItem } from "../../DTOs/IAdminPsychologistEngagementDTO";
import type { AdminPsychologistEngagementPost } from "../../repositories/AdminPsychologistEngagementRepository";
import { metric } from "./business-content";
import { valueFromMap } from "./statistics-utils";
import { excerpt, mediaFromPost } from "./visibility-series";

export const mapPostPublication = (
  post: AdminPsychologistEngagementPost,
  maps: {
    commentsReceivedByPost: Map<string, number>;
    postSavesByPost: Map<string, number>;
    postSharesByPost: Map<string, number>;
    postViewsByPost: Map<string, number>;
    postWhatsappClicksByPost: Map<string, number>;
  },
): AdminPsychologistPublicationItem => {
  const views = maps.postViewsByPost.get(post.id) ?? 0;
  return {
    community: {
      avatar_url: post.community.avatar_url,
      color: post.community.visual_primary_color,
      id: post.community.id,
      name: post.community.name,
      slug: post.community.slug,
    },
    created_at: post.createdAt,
    excerpt: excerpt(post.content),
    id: post.id,
    media: mediaFromPost(post),
    metrics: {
      comments: metric({
        id: "comments",
        label: "Comentários",
        source: "post_reply.post_id",
        value: valueFromMap(maps.commentsReceivedByPost, post.id),
      }),
      downvotes: metric({
        id: "downvotes",
        label: "Downvotes",
        source: "community_post.downvotes_count/post_vote",
        value: post.downvotes_count,
      }),
      reports: metric({
        id: "reports",
        label: "Denúncias",
        source: "post_report.post_id",
        value: post.reports.length,
      }),
      saves: metric({
        id: "saves",
        label: "Salvamentos",
        source: "post_save",
        value: valueFromMap(maps.postSavesByPost, post.id),
      }),
      shares: metric({
        id: "shares",
        label: "Compartilhamentos",
        source: "post_share",
        value: maps.postSharesByPost.get(post.id) ?? 0,
      }),
      upvotes: metric({
        id: "upvotes",
        label: "Upvotes",
        source: "community_post.upvotes_count/post_vote",
        value: post.upvotes_count,
      }),
      views: metric({
        id: "views",
        label: "Visualizações",
        source: "page_view_event.target_type=post/community_post",
        value: views,
      }),
      whatsapp_clicks: metric({
        id: "whatsapp_clicks",
        label: "Cliques WhatsApp",
        source: "important_action_event.action_type=whatsapp_click+target_type=post/community_post",
        value: maps.postWhatsappClicksByPost.get(post.id) ?? 0,
      }),
    },
    public_url: `/comunidades/${post.community.slug}/publicacao/${post.id}`,
    source: "community_post",
    title: post.title,
    type: "post",
  };
};
