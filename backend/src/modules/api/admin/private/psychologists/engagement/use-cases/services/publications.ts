import type { Resolve } from "@/helpers/return";
import { error, msg } from "@/helpers/translate";
import type {
  AdminPsychologistPublicationItem,
  AdminPsychologistPublicationsDTO,
  AdminPsychologistPublicationsQuery,
  IAdminPsychologistPublicationsDTO,
} from "../../DTOs/IAdminPsychologistEngagementDTO";
import {
  type AdminPsychologistEngagementPost,
  type AdminPsychologistEngagementReply,
  AdminPsychologistEngagementRepository,
} from "../../repositories/AdminPsychologistEngagementRepository";

import {
  type AdminPsychologistPublicationsSort,
  metric,
  PSYCHOLOGIST_PUBLICATIONS_SORTS,
  resolvePeriod,
} from "./business-content";
import { notFound } from "./community-coverage";
import {
  excerpt,
  groupCountMap,
  mediaFromPost,
  mediaFromReply,
  normalizeString,
  sum,
  toCountMap,
} from "./visibility-series";

export const normalizePublicationQuery = (query: AdminPsychologistPublicationsQuery = {}) => ({
  community: query.community?.trim() || "all",
  from: query.from,
  limit: Math.min(Math.max(Number(query.limit || 5), 1), 20),
  page: Math.max(Number(query.page || 1), 1),
  period: query.period,
  q: query.q?.trim() || "",
  sort: query.sort && PSYCHOLOGIST_PUBLICATIONS_SORTS.has(query.sort) ? query.sort : "engagement",
  to: query.to,
  type: query.type === "post" || query.type === "reply" ? query.type : "all",
});

export const publicationEngagementScore = (item: AdminPsychologistPublicationItem) =>
  (item.metrics.views.value ?? 0) +
  (item.metrics.upvotes.value ?? 0) +
  (item.metrics.downvotes.value ?? 0) +
  (item.metrics.comments.value ?? 0) +
  (item.metrics.saves.value ?? 0) +
  (item.metrics.shares.value ?? 0) +
  (item.metrics.whatsapp_clicks.value ?? 0);

export const comparePublicationsByRecent = (
  left: AdminPsychologistPublicationItem,
  right: AdminPsychologistPublicationItem,
) => right.created_at.getTime() - left.created_at.getTime() || left.id.localeCompare(right.id);

export const sortPublications = (
  items: AdminPsychologistPublicationItem[],
  sort: AdminPsychologistPublicationsSort,
) =>
  [...items].sort((left, right) => {
    if (sort === "oldest") {
      return (
        left.created_at.getTime() - right.created_at.getTime() || left.id.localeCompare(right.id)
      );
    }

    if (sort === "recent") return comparePublicationsByRecent(left, right);

    return (
      publicationEngagementScore(right) - publicationEngagementScore(left) ||
      comparePublicationsByRecent(left, right)
    );
  });

export const filterPublication = (
  item: AdminPsychologistPublicationItem,
  query: ReturnType<typeof normalizePublicationQuery>,
) => {
  if (query.type !== "all" && item.type !== query.type) return false;
  if (
    query.community !== "all" &&
    item.community.id !== query.community &&
    item.community.slug !== query.community
  ) {
    return false;
  }
  if (!query.q) return true;

  const needle = normalizeString(query.q);
  return normalizeString(`${item.title} ${item.excerpt} ${item.community.name}`).includes(needle);
};

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
        value: maps.commentsReceivedByPost.get(post.id) ?? post.replies_count,
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
        value: maps.postSavesByPost.get(post.id) ?? post.saves_count,
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

export const mapReplyPublication = (
  reply: AdminPsychologistEngagementReply,
  maps: {
    replyChildrenByReply: Map<string, number>;
    replySavesByReply: Map<string, number>;
    replySharesByReply: Map<string, number>;
    replyViewsByReply: Map<string, number>;
    replyWhatsappClicksByReply: Map<string, number>;
  },
): AdminPsychologistPublicationItem => ({
  community: {
    avatar_url: reply.post.community.avatar_url,
    color: reply.post.community.visual_primary_color,
    id: reply.post.community.id,
    name: reply.post.community.name,
    slug: reply.post.community.slug,
  },
  created_at: reply.createdAt,
  excerpt: excerpt(reply.content),
  id: reply.id,
  media: mediaFromReply(reply),
  metrics: {
    comments: metric({
      id: "comments",
      label: "Comentários",
      source: "post_reply.parent_reply_id",
      value: maps.replyChildrenByReply.get(reply.id) ?? 0,
    }),
    downvotes: metric({
      id: "downvotes",
      label: "Downvotes",
      source: "post_reply.downvotes_count/post_vote",
      value: reply.downvotes_count,
    }),
    reports: metric({
      id: "reports",
      label: "Denúncias",
      source: "post_report.reply_id",
      value: reply.reports.length,
    }),
    saves: metric({
      id: "saves",
      label: "Salvamentos",
      source: "post_reply_save",
      value: maps.replySavesByReply.get(reply.id) ?? 0,
    }),
    shares: metric({
      id: "shares",
      label: "Compartilhamentos",
      source: "post_share.reply_id",
      value: maps.replySharesByReply.get(reply.id) ?? 0,
    }),
    upvotes: metric({
      id: "upvotes",
      label: "Upvotes",
      source: "post_reply.upvotes_count/post_vote",
      value: reply.upvotes_count,
    }),
    views: metric({
      id: "views",
      label: "Visualizações",
      source: "page_view_event.target_type=reply/post_reply",
      value: maps.replyViewsByReply.get(reply.id) ?? 0,
    }),
    whatsapp_clicks: metric({
      id: "whatsapp_clicks",
      label: "Cliques WhatsApp",
      source: "important_action_event.action_type=whatsapp_click+target_type=reply/post_reply",
      value: maps.replyWhatsappClicksByReply.get(reply.id) ?? 0,
    }),
  },
  public_url: `/comunidades/${reply.post.community.slug}/publicacao/${reply.post.id}/resposta/${reply.id}`,
  source: "post_reply",
  title: reply.title || `Resposta em: ${reply.post.title}`,
  type: "reply",
});

export const showAdminPsychologistPublications = async (
  data: IAdminPsychologistPublicationsDTO,
): Promise<Resolve> => {
  const query = normalizePublicationQuery(data.q ?? {});
  const repository = new AdminPsychologistEngagementRepository();
  const profile = await repository.findPsychologist(data.p.id);
  if (!profile) return notFound();

  const period = resolvePeriod(
    { from: query.from, period: query.period, to: query.to },
    profile.user.createdAt,
  );
  if (!period.success) return { status: 400, ...error(period.code, {}) };

  const userId = profile.user.id;
  const [posts, replies] = await Promise.all([
    repository.listAuthoredPosts(userId, period.current.start, period.current.end),
    repository.listAuthoredReplies(userId, period.current.start, period.current.end),
  ]);
  const postIds = posts.map((post) => post.id);
  const replyIds = replies.map((reply) => reply.id);
  const [
    postSaves,
    replySaves,
    commentsReceived,
    postShares,
    replyShares,
    postViews,
    replyViews,
    postWhatsappClicks,
    replyWhatsappClicks,
    replyChildren,
  ] = await Promise.all([
    repository.listPostSaves(postIds),
    repository.listReplySaves(replyIds),
    repository.listCommentsReceived(postIds, userId),
    repository.countPostShares(postIds),
    repository.countReplyShares(replyIds),
    repository.countPostViews(postIds),
    repository.countReplyViews(replyIds),
    repository.countPostWhatsappClicks(postIds),
    repository.countReplyWhatsappClicks(replyIds),
    repository.countReplyChildren(replyIds),
  ]);

  const commentsReceivedByPost = toCountMap(commentsReceived, "post_id");
  const postSavesByPost = toCountMap(postSaves, "post_id");
  const replySavesByReply = toCountMap(replySaves, "reply_id");
  const postSharesByPost = groupCountMap(postShares, (item) => item.post_id);
  const replySharesByReply = groupCountMap(replyShares, (item) => item.reply_id);
  const postViewsByPost = groupCountMap(postViews, (item) => item.target_id);
  const replyViewsByReply = groupCountMap(replyViews, (item) => item.target_id);
  const postWhatsappClicksByPost = groupCountMap(postWhatsappClicks, (item) => item.target_id);
  const replyWhatsappClicksByReply = groupCountMap(replyWhatsappClicks, (item) => item.target_id);
  const replyChildrenByReply = groupCountMap(replyChildren, (item) => item.parent_reply_id);

  const allItems = [
    ...posts.map((post) =>
      mapPostPublication(post, {
        commentsReceivedByPost,
        postSavesByPost,
        postSharesByPost,
        postViewsByPost,
        postWhatsappClicksByPost,
      }),
    ),
    ...replies.map((reply) =>
      mapReplyPublication(reply, {
        replyChildrenByReply,
        replySavesByReply,
        replySharesByReply,
        replyViewsByReply,
        replyWhatsappClicksByReply,
      }),
    ),
  ];

  const filtered = sortPublications(
    allItems.filter((item) => filterPublication(item, query)),
    query.sort,
  );
  const count = filtered.length;
  const pages = Math.max(1, Math.ceil(count / query.limit));
  const page = Math.min(query.page, pages);
  const dataSlice = filtered.slice((page - 1) * query.limit, page * query.limit);
  const communities = new Map<string, { id: string; label: string; slug: string }>();
  for (const item of allItems) {
    communities.set(item.community.id, {
      id: item.community.id,
      label: item.community.name,
      slug: item.community.slug,
    });
  }

  const cards = [
    metric({
      id: "posts",
      label: "Posts",
      source: "community_post.author_id",
      value: posts.length,
    }),
    metric({
      id: "replies",
      label: "Respostas",
      source: "post_reply.author_id",
      value: replies.length,
    }),
    metric({
      id: "upvotes",
      label: "Upvotes",
      source: "community_post/post_reply upvotes_count + post_vote",
      value: sum(allItems.map((item) => item.metrics.upvotes.value ?? 0)),
    }),
    metric({
      id: "downvotes",
      label: "Downvotes",
      source: "community_post/post_reply downvotes_count + post_vote",
      value: sum(allItems.map((item) => item.metrics.downvotes.value ?? 0)),
    }),
    metric({
      id: "comments",
      label: "Comentários",
      source: "post_reply",
      value: sum(allItems.map((item) => item.metrics.comments.value ?? 0)),
    }),
    metric({
      id: "views",
      label: "Visualizações",
      source: "page_view_event.target_type=post/community_post",
      value: sum(allItems.map((item) => item.metrics.views.value ?? 0)),
    }),
    metric({
      id: "saves",
      label: "Salvamentos",
      source: "post_save+post_reply_save",
      value: sum(allItems.map((item) => item.metrics.saves.value ?? 0)),
    }),
    metric({
      id: "shares",
      label: "Compartilhamentos",
      source: "post_share",
      value: sum(allItems.map((item) => item.metrics.shares.value ?? 0)),
    }),
    metric({
      id: "whatsapp_clicks",
      label: "Cliques WhatsApp",
      source: "important_action_event.action_type=whatsapp_click",
      value: sum(allItems.map((item) => item.metrics.whatsapp_clicks.value ?? 0)),
    }),
    metric({
      id: "reports",
      label: "Denúncias",
      source: "post_report",
      value: sum(allItems.map((item) => item.metrics.reports.value ?? 0)),
    }),
  ];
  const unavailable: AdminPsychologistPublicationsDTO["unavailable"] = [];

  const response: AdminPsychologistPublicationsDTO = {
    active_filters_count: [
      query.q,
      query.community !== "all" ? query.community : "",
      query.type !== "all" ? query.type : "",
      (query.period && query.period !== "all") || (query.from && query.to) ? "period" : "",
      query.sort !== "engagement" ? "sort" : "",
    ].filter(Boolean).length,
    count,
    data: dataSlice,
    filters: {
      communities: [...communities.values()].sort((left, right) =>
        left.label.localeCompare(right.label, "pt-BR"),
      ),
      types: [
        { id: "all", label: "Todos" },
        { id: "post", label: "Posts" },
        { id: "reply", label: "Respostas" },
      ],
    },
    page,
    pages,
    per_page: query.limit,
    period: period.period,
    source:
      "community_post+post_reply+post_vote+post_save+post_reply_save+post_share+page_view_event+important_action_event+post_report",
    totals: { cards },
    unavailable,
  };

  return {
    status: 200,
    ...msg("show", {}),
    data: response,
  };
};
