import type { Prisma } from "@/external/generated/prisma/client";
import prisma, { type ORM } from "@/infra/database/prisma";
import { getCommunityMentorRankingSignals } from "@/utils/community-mentor-ranking";
import { activeProfessionalEntitlementWhere } from "@/utils/subscription-entitlement";
import type {
  IPostCreateReplyDTO,
  IPostMineDTO,
  IPostRepliesDTO,
  IPostReplyDeleteDTO,
  IPostReplySaveDTO,
  IPostReplyThreadDTO,
  IPostReportDTO,
  IPostSaveDTO,
  IPostSavedDTO,
  IPostShowDTO,
  IPostVoteDTO,
  PostAuthorDTO,
  PostCommunityDTO,
  PostDetailDTO,
  PostDetailResponse,
  PostListItemDTO,
  PostListPostDTO,
  PostListResponse,
  PostMutationResult,
  PostProfessionalReplyDTO,
  PostRepliesResponse,
  PostReplyDeleteResponse,
  PostReplyDTO,
  PostReportResponse,
  PostSaveResponse,
  PostVoteResponse,
} from "../DTOs/IPostDTO";
import type { IPostRepository } from "./interfaces/IPostRepository";

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 30;
const INLINE_REPLY_DESCENDANT_DEPTH = 4;

const CONTACT_MESSAGE =
  "Olá, encontrei sua resposta na comunidade Lectum e gostaria de conversar sobre atendimento.";

const communitySelect = {
  id: true,
  name: true,
  slug: true,
  description: true,
  category: true,
  members_count: true,
  createdAt: true,
} satisfies Prisma.communitySelect;

const professionalProfileSelect = {
  gender: true,
  crp: true,
  whatsapp: true,
  cfp_verified_at: true,
  subscriptions: {
    where: activeProfessionalEntitlementWhere(),
    select: {
      id: true,
    },
    take: 1,
  },
} satisfies Prisma.psychologist_profileSelect;

const authorSelect = {
  id: true,
  name: true,
  avatar: true,
  role: true,
  psychologist_profile: {
    select: professionalProfileSelect,
  },
} satisfies Prisma.userSelect;

const postSelect = {
  id: true,
  title: true,
  content: true,
  anonymous: true,
  status: true,
  upvotes_count: true,
  downvotes_count: true,
  replies_count: true,
  saves_count: true,
  createdAt: true,
  community: {
    select: communitySelect,
  },
  author: {
    select: authorSelect,
  },
} satisfies Prisma.community_postSelect;

const listPostSelect = {
  ...postSelect,
  replies: {
    where: {
      deleted: false,
      author: {
        role: "psicologo",
        psychologist_profile: {
          is: {
            deleted: false,
            cfp_verified_at: {
              not: null,
            },
          },
        },
      },
    },
    orderBy: [{ upvotes_count: "desc" }, { createdAt: "desc" }, { id: "desc" }],
    select: {
      id: true,
      title: true,
      content: true,
      media_url: true,
      media_type: true,
      upvotes_count: true,
      createdAt: true,
      author: {
        select: authorSelect,
      },
    },
  },
} satisfies Prisma.community_postSelect;

const replyBaseSelect = {
  id: true,
  title: true,
  content: true,
  media_url: true,
  media_type: true,
  upvotes_count: true,
  createdAt: true,
  parent_reply_id: true,
  author: {
    select: authorSelect,
  },
  _count: {
    select: {
      replies: true,
    },
  },
} satisfies Prisma.post_replySelect;

type PostResult = Prisma.community_postGetPayload<{ select: typeof postSelect }>;
type ListPostResult = Prisma.community_postGetPayload<{ select: typeof listPostSelect }>;
type AuthorResult = PostResult["author"];
type ProfessionalReplyResult = ListPostResult["replies"][number];
type ReplyBaseResult = Prisma.post_replyGetPayload<{ select: typeof replyBaseSelect }>;
type ReplyTreeResult = ReplyBaseResult & { replies: ReplyTreeResult[] };
type CurrentVote = 1 | -1 | null;
type MentorRankingSignals = Awaited<ReturnType<typeof getCommunityMentorRankingSignals>>;

const normalizePagination = (query: { page?: number; limit?: number }) => {
  const page = Math.max(1, Number(query.page || 1));
  const limit = Math.min(MAX_LIMIT, Math.max(1, Number(query.limit || DEFAULT_LIMIT)));

  return {
    page,
    limit,
    skip: (page - 1) * limit,
  };
};

const normalizeListType = (value?: string | null): "all" | "posts" | "replies" => {
  if (value === "posts" || value === "replies") return value;

  return "all";
};

const toPaginatedListResponse = (
  data: PostListItemDTO[],
  page: number,
  limit: number,
  count: number,
): PostListResponse => ({
  data,
  items: data,
  page,
  pages: Math.ceil(count / limit),
  count,
  total: count,
  limit,
});

const toCommunityResponse = (
  item: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    category: string | null;
    members_count: number;
    createdAt: Date;
  },
  following?: boolean,
): PostCommunityDTO => ({
  id: item.id,
  name: item.name,
  slug: item.slug,
  description: item.description,
  category: item.category,
  members_count: item.members_count,
  created_at: item.createdAt,
  ...(typeof following === "boolean" ? { following } : {}),
});

const buildWhatsappUrl = (value?: string | null) => {
  const digits = String(value ?? "").replace(/\D/g, "");
  if (digits.length < 8) return null;

  return `https://wa.me/${digits}?text=${encodeURIComponent(CONTACT_MESSAGE)}`;
};

const anonymousDisplayNameForPost = (postId: string) => {
  let hash = 0;

  for (const character of postId) {
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  }

  return `Membro Anônimo #${1000 + (hash % 9000)}`;
};

const isProfessionalVerified = (profile?: { cfp_verified_at: Date | null } | null) => {
  return Boolean(profile?.cfp_verified_at);
};

const hasPaidProfessionalEntitlement = (profile?: { subscriptions: { id: string }[] } | null) => {
  return Boolean(profile?.subscriptions.length);
};

const buildProfessionalWhatsappUrl = (
  profile?: {
    cfp_verified_at: Date | null;
    subscriptions: { id: string }[];
    whatsapp: string | null;
  } | null,
) => {
  if (!isProfessionalVerified(profile) || !hasPaidProfessionalEntitlement(profile)) return null;

  return buildWhatsappUrl(profile?.whatsapp);
};

const mentorBadgeForScore = (
  profile?: { cfp_verified_at: Date | null; subscriptions: { id: string }[] } | null,
  score = 0,
) => {
  if (!isProfessionalVerified(profile) || !hasPaidProfessionalEntitlement(profile)) return null;
  if (score >= 80) return "TOP #1 MENTOR";
  if (score >= 65) return "TOP #2 MENTOR";
  if (score >= 50) return "TOP #3 MENTOR";

  return null;
};

const authorTypeLabel = (role?: string | null, gender?: string | null, anonymous = false) => {
  if (role === "psicologo") {
    const normalizedGender = String(gender ?? "")
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .toLowerCase();

    if (normalizedGender.includes("feminino")) return "Psicóloga";
    if (normalizedGender.includes("masculino")) return "Psicólogo";

    return "Psicólogo(a)";
  }

  return anonymous ? "Membro Anônimo" : "Paciente";
};

const toAuthorResponse = (
  author: AuthorResult,
  mentorScore = 0,
  anonymous = false,
  anonymousDisplayName?: string,
): PostAuthorDTO => {
  const profile = author.psychologist_profile;
  const isPsychologist = author.role === "psicologo";
  const shouldMaskAuthor = !isPsychologist && anonymous;

  return {
    id: author.id,
    name: shouldMaskAuthor ? (anonymousDisplayName ?? "Membro Anônimo") : author.name,
    avatar: shouldMaskAuthor ? null : author.avatar,
    role: author.role,
    type_label: authorTypeLabel(author.role, profile?.gender, anonymous),
    crp: isPsychologist ? (profile?.crp ?? null) : null,
    verified: isPsychologist && isProfessionalVerified(profile),
    featured_badge: isPsychologist ? mentorBadgeForScore(profile, mentorScore) : null,
    whatsapp_url: isPsychologist ? buildProfessionalWhatsappUrl(profile) : null,
  };
};

const normalizeVoteValue = (value?: number | null): CurrentVote => {
  if (value === 1 || value === -1) return value;

  return null;
};

const toPostResponse = (
  item: PostResult,
  currentUserVote: CurrentVote,
  saved: boolean,
  communityFollowing?: boolean,
): PostDetailDTO => {
  const responseCommunity = toCommunityResponse(item.community, communityFollowing);
  const anonymous = item.author.role !== "psicologo" && item.anonymous;
  const author = toAuthorResponse(
    item.author,
    item.upvotes_count,
    anonymous,
    anonymous ? anonymousDisplayNameForPost(item.id) : undefined,
  );

  return {
    id: item.id,
    title: item.title,
    content: item.content,
    anonymous,
    status: item.status,
    upvotes_count: item.upvotes_count,
    downvotes_count: item.downvotes_count,
    replies_count: item.replies_count,
    saves_count: item.saves_count,
    created_at: item.createdAt,
    tags: responseCommunity.category ? [responseCommunity.category] : [],
    featured_badge: author.featured_badge,
    media_url: null,
    media_type: null,
    current_user_vote: currentUserVote,
    saved,
    community: responseCommunity,
    author,
  };
};

const toHighlightedProfessionalReply = (
  reply?: ProfessionalReplyResult,
  savedReplyIds?: Set<string>,
): PostProfessionalReplyDTO | null => {
  if (!reply) return null;

  const author = toAuthorResponse(reply.author, reply.upvotes_count);
  if (!author.verified) return null;

  return {
    id: reply.id,
    title: reply.title,
    content: reply.content,
    media_url: reply.media_url,
    media_type: reply.media_type,
    upvotes_count: reply.upvotes_count,
    created_at: reply.createdAt,
    saved: savedReplyIds?.has(reply.id) ?? false,
    author,
  };
};

const toListPostResponse = (
  item: ListPostResult,
  currentUserVote: CurrentVote,
  saved: boolean,
  savedReplyIds?: Set<string>,
): PostListPostDTO => ({
  ...toPostResponse(item, currentUserVote, saved),
  highlighted_professional_reply: toHighlightedProfessionalReply(item.replies[0], savedReplyIds),
});

const toReplyResponse = (
  item: ReplyBaseResult | ReplyTreeResult,
  currentVotes: Map<string, CurrentVote>,
  savedReplyIds?: Set<string>,
): PostReplyDTO => {
  const nestedReplies = "replies" in item ? item.replies : [];

  return {
    id: item.id,
    title: item.title,
    content: item.content,
    media_url: item.media_url,
    media_type: item.media_type,
    upvotes_count: item.upvotes_count,
    replies_count: item._count.replies,
    created_at: item.createdAt,
    parent_reply_id: item.parent_reply_id,
    current_user_vote: currentVotes.get(item.id) ?? null,
    saved: savedReplyIds?.has(item.id) ?? false,
    author: toAuthorResponse(item.author, item.upvotes_count),
    replies: nestedReplies.map((reply) => toReplyResponse(reply, currentVotes, savedReplyIds)),
  };
};

const collectReplyIds = (items: Array<ReplyBaseResult | ReplyTreeResult>) => {
  const ids = new Set<string>();

  const visit = (item: ReplyBaseResult | ReplyTreeResult) => {
    ids.add(item.id);

    if ("replies" in item) {
      for (const child of item.replies) {
        visit(child);
      }
    }
  };

  for (const item of items) visit(item);

  return [...ids];
};

const newestFirst = (a: Date, b: Date) => b.getTime() - a.getTime();

const rankingPositionForReply = (item: ReplyBaseResult, rankingSignals: MentorRankingSignals) =>
  rankingSignals.get(item.author.id)?.position ?? Number.POSITIVE_INFINITY;

const compareReplySiblingsByRelevance = (
  a: ReplyBaseResult,
  b: ReplyBaseResult,
  rankingSignals: MentorRankingSignals,
) => {
  const upvoteDiff = b.upvotes_count - a.upvotes_count;
  if (upvoteDiff !== 0) return upvoteDiff;

  const aRankingPosition = rankingPositionForReply(a, rankingSignals);
  const bRankingPosition = rankingPositionForReply(b, rankingSignals);
  const hasRankingTieBreaker =
    Number.isFinite(aRankingPosition) || Number.isFinite(bRankingPosition);

  if (hasRankingTieBreaker && aRankingPosition !== bRankingPosition) {
    return aRankingPosition - bRankingPosition;
  }

  const recencyDiff = newestFirst(a.createdAt, b.createdAt);
  if (recencyDiff !== 0) return recencyDiff;

  return b.id.localeCompare(a.id);
};

const sortNestedReplies = <T extends ReplyBaseResult>(
  items: T[],
  rankingSignals: MentorRankingSignals,
) => [...items].sort((a, b) => compareReplySiblingsByRelevance(a, b, rankingSignals));

const buildReplyThread = (
  rootId: string,
  replies: ReplyBaseResult[],
  rankingSignals: MentorRankingSignals,
): ReplyTreeResult | null => {
  const byParent = new Map<string | null, ReplyBaseResult[]>();

  for (const reply of replies) {
    const parentId = reply.parent_reply_id ?? null;
    const current = byParent.get(parentId) ?? [];
    current.push(reply);
    byParent.set(parentId, current);
  }

  const build = (reply: ReplyBaseResult): ReplyTreeResult => ({
    ...reply,
    replies: sortNestedReplies(byParent.get(reply.id) ?? [], rankingSignals).map(build),
  });

  const root = replies.find((reply) => reply.id === rootId);

  return root ? build(root) : null;
};

const buildReplyTrees = (
  roots: ReplyBaseResult[],
  replies: ReplyBaseResult[],
  rankingSignals: MentorRankingSignals,
): ReplyTreeResult[] => {
  const byParent = new Map<string | null, ReplyBaseResult[]>();

  for (const reply of replies) {
    const parentId = reply.parent_reply_id ?? null;
    const current = byParent.get(parentId) ?? [];
    current.push(reply);
    byParent.set(parentId, current);
  }

  const build = (reply: ReplyBaseResult): ReplyTreeResult => ({
    ...reply,
    replies: sortNestedReplies(byParent.get(reply.id) ?? [], rankingSignals).map(build),
  });

  return roots.map(build);
};

const loadReplyDescendants = async (
  postId: string,
  parentReplyIds: string[],
  maxDepth: number,
): Promise<ReplyBaseResult[]> => {
  const descendants: ReplyBaseResult[] = [];
  let currentParentIds = [...new Set(parentReplyIds)];

  for (let depth = 0; depth < maxDepth && currentParentIds.length > 0; depth += 1) {
    const levelItems = await prisma.post_reply.findMany({
      where: {
        post_id: postId,
        deleted: false,
        parent_reply_id: {
          in: currentParentIds,
        },
      },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      select: replyBaseSelect,
    });

    descendants.push(...levelItems);
    currentParentIds = levelItems.map((reply) => reply.id);
  }

  return descendants;
};

const isVerifiedProfessionalReply = (item: ReplyBaseResult) => {
  const profile = item.author.psychologist_profile;

  return item.author.role === "psicologo" && isProfessionalVerified(profile);
};

const compareProfessionalReplies = (
  a: ReplyBaseResult,
  b: ReplyBaseResult,
  rankingSignals: MentorRankingSignals,
) => compareReplySiblingsByRelevance(a, b, rankingSignals);

const sortRepliesForDisplay = async (communityId: string, items: ReplyBaseResult[]) => {
  const verifiedProfessionalIds = items
    .filter(isVerifiedProfessionalReply)
    .map((item) => item.author.id);
  const rankingSignals = await getCommunityMentorRankingSignals(
    communityId,
    verifiedProfessionalIds,
  );
  const professionalReply = [...items]
    .filter(isVerifiedProfessionalReply)
    .sort((a, b) => compareProfessionalReplies(a, b, rankingSignals))[0];
  const remainingReplies = items
    .filter((item) => item.id !== professionalReply?.id)
    .sort((a, b) => compareReplySiblingsByRelevance(a, b, rankingSignals));

  return professionalReply ? [professionalReply, ...remainingReplies] : remainingReplies;
};

const findPublishedPost = (id: string) => {
  return prisma.community_post.findFirst({
    where: {
      id,
      deleted: false,
      status: "publicado",
      community: {
        deleted: false,
      },
    },
    select: {
      id: true,
      community_id: true,
      upvotes_count: true,
      downvotes_count: true,
      replies_count: true,
      saves_count: true,
    },
  });
};

const findPublishedReply = (postId: string, replyId: string) => {
  return prisma.post_reply.findFirst({
    where: {
      id: replyId,
      post_id: postId,
      deleted: false,
      post: {
        deleted: false,
        status: "publicado",
        community: {
          deleted: false,
        },
      },
    },
    select: {
      id: true,
      post_id: true,
    },
  });
};

const normalizeReplyMediaType = (value?: string | null): "image" | "video" | null => {
  if (value === "image" || value === "video") return value;

  return null;
};

const isPublicReplyMediaUrl = (value?: string | null) => {
  if (!value) return false;

  try {
    return new URL(value).pathname.startsWith("/public/files/posts/media/");
  } catch (_err) {
    return value.startsWith("/public/files/posts/media/");
  }
};

export class PostRepository implements IPostRepository {
  readonly repository: ORM["community_post"];

  constructor() {
    this.repository = prisma.community_post;
  }

  async exists(id: string): Promise<boolean> {
    const post = await findPublishedPost(id);

    return Boolean(post);
  }

  async canAttachReplyMedia(userId: string): Promise<boolean> {
    const profile = await prisma.psychologist_profile.findFirst({
      where: {
        user_id: userId,
        deleted: false,
        cfp_verified_at: {
          not: null,
        },
        subscriptions: {
          some: activeProfessionalEntitlementWhere(),
        },
      },
      select: {
        id: true,
      },
    });

    return Boolean(profile);
  }

  async mine(data: IPostMineDTO): Promise<PostListResponse> {
    const pagination = normalizePagination(data.q);
    const type = normalizeListType(data.q.type);
    const shouldLoadPosts = type === "all" || type === "posts";
    const shouldLoadReplies = type === "all" || type === "replies";
    const take = type === "all" ? pagination.skip + pagination.limit : pagination.limit;
    const skip = type === "all" ? 0 : pagination.skip;

    const [posts, postsCount, replies, repliesCount] = await Promise.all([
      shouldLoadPosts
        ? prisma.community_post.findMany({
            where: {
              author_id: data.auth.id!,
              deleted: false,
              community: {
                deleted: false,
              },
            },
            take,
            skip,
            orderBy: [{ createdAt: "desc" }, { id: "desc" }],
            select: listPostSelect,
          })
        : Promise.resolve([]),
      shouldLoadPosts
        ? prisma.community_post.count({
            where: {
              author_id: data.auth.id!,
              deleted: false,
              community: {
                deleted: false,
              },
            },
          })
        : Promise.resolve(0),
      shouldLoadReplies
        ? prisma.post_reply.findMany({
            where: {
              author_id: data.auth.id!,
              deleted: false,
              post: {
                deleted: false,
                status: "publicado",
                community: {
                  deleted: false,
                },
              },
            },
            take,
            skip,
            orderBy: [{ createdAt: "desc" }, { id: "desc" }],
            select: {
              id: true,
              title: true,
              content: true,
              upvotes_count: true,
              createdAt: true,
              parent_reply_id: true,
              _count: {
                select: {
                  replies: {
                    where: {
                      deleted: false,
                    },
                  },
                },
              },
              replies: {
                where: {
                  deleted: false,
                  author: {
                    role: "psicologo",
                    psychologist_profile: {
                      is: {
                        deleted: false,
                        cfp_verified_at: {
                          not: null,
                        },
                      },
                    },
                  },
                },
                select: {
                  id: true,
                },
                take: 1,
              },
              parent_reply: {
                select: {
                  content: true,
                },
              },
              post: {
                select: listPostSelect,
              },
            },
          })
        : Promise.resolve([]),
      shouldLoadReplies
        ? prisma.post_reply.count({
            where: {
              author_id: data.auth.id!,
              deleted: false,
              post: {
                deleted: false,
                status: "publicado",
                community: {
                  deleted: false,
                },
              },
            },
          })
        : Promise.resolve(0),
    ]);

    const postItems = posts.map<PostListItemDTO>((post) => ({
      id: post.id,
      type: "post",
      created_at: post.createdAt,
      saved_at: null,
      status: post.status,
      saved: false,
      post: toListPostResponse(post, null, false),
      reply: null,
    }));
    const replyItems = replies.map<PostListItemDTO>((reply) => ({
      id: reply.id,
      type: "reply",
      created_at: reply.createdAt,
      saved_at: null,
      status: "publicado",
      saved: false,
      post: toListPostResponse(reply.post, null, false),
      reply: {
        id: reply.id,
        title: reply.title,
        content: reply.content,
        upvotes_count: reply.upvotes_count,
        replies_received_count: reply._count.replies,
        has_verified_professional_reply: reply.replies.length > 0,
        created_at: reply.createdAt,
        parent_reply_id: reply.parent_reply_id,
        parent_content: reply.parent_reply?.content ?? null,
      },
    }));
    const merged =
      type === "all"
        ? [...postItems, ...replyItems]
            .sort((a, b) => {
              const createdAtDiff =
                new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
              if (createdAtDiff !== 0) return createdAtDiff;

              return b.id.localeCompare(a.id);
            })
            .slice(pagination.skip, pagination.skip + pagination.limit)
        : [...postItems, ...replyItems];
    const count = postsCount + repliesCount;

    return toPaginatedListResponse(merged, pagination.page, pagination.limit, count);
  }

  async saved(data: IPostSavedDTO): Promise<PostListResponse> {
    const pagination = normalizePagination(data.q);
    const type = normalizeListType(data.q.type);
    const shouldLoadPosts = type === "all" || type === "posts";
    const shouldLoadReplies = type === "all" || type === "replies";
    const take = type === "all" ? pagination.skip + pagination.limit : pagination.limit;
    const skip = type === "all" ? 0 : pagination.skip;
    const postWhere: Prisma.post_saveWhereInput = {
      user_id: data.auth.id!,
      deleted: false,
      post: {
        deleted: false,
        status: "publicado",
        community: {
          deleted: false,
        },
      },
    };
    const replyWhere: Prisma.post_reply_saveWhereInput = {
      user_id: data.auth.id!,
      deleted: false,
      reply: {
        deleted: false,
        post: {
          deleted: false,
          status: "publicado",
          community: {
            deleted: false,
          },
        },
      },
    };
    const [postSaves, postCount, replySaves, replyCount] = await Promise.all([
      shouldLoadPosts
        ? prisma.post_save.findMany({
            where: postWhere,
            take,
            skip,
            orderBy: [{ createdAt: "desc" }, { id: "desc" }],
            select: {
              id: true,
              createdAt: true,
              post: {
                select: listPostSelect,
              },
            },
          })
        : Promise.resolve([]),
      shouldLoadPosts ? prisma.post_save.count({ where: postWhere }) : Promise.resolve(0),
      shouldLoadReplies
        ? prisma.post_reply_save.findMany({
            where: replyWhere,
            take,
            skip,
            orderBy: [{ createdAt: "desc" }, { id: "desc" }],
            select: {
              id: true,
              createdAt: true,
              reply: {
                select: {
                  id: true,
                  title: true,
                  content: true,
                  upvotes_count: true,
                  createdAt: true,
                  parent_reply_id: true,
                  _count: {
                    select: {
                      replies: {
                        where: {
                          deleted: false,
                        },
                      },
                    },
                  },
                  replies: {
                    where: {
                      deleted: false,
                      author: {
                        role: "psicologo",
                        psychologist_profile: {
                          is: {
                            deleted: false,
                            cfp_verified_at: {
                              not: null,
                            },
                          },
                        },
                      },
                    },
                    select: {
                      id: true,
                    },
                    take: 1,
                  },
                  parent_reply: {
                    select: {
                      content: true,
                    },
                  },
                  post: {
                    select: listPostSelect,
                  },
                },
              },
            },
          })
        : Promise.resolve([]),
      shouldLoadReplies ? prisma.post_reply_save.count({ where: replyWhere }) : Promise.resolve(0),
    ]);
    const postItems = postSaves.map<PostListItemDTO>((item) => ({
      id: item.id,
      type: "post",
      created_at: item.post.createdAt,
      saved_at: item.createdAt,
      status: item.post.status,
      saved: true,
      post: toListPostResponse(item.post, null, true),
      reply: null,
    }));
    const replyItems = replySaves.map<PostListItemDTO>((item) => ({
      id: item.id,
      type: "reply",
      created_at: item.reply.createdAt,
      saved_at: item.createdAt,
      status: "publicado",
      saved: true,
      post: toListPostResponse(item.reply.post, null, false),
      reply: {
        id: item.reply.id,
        title: item.reply.title,
        content: item.reply.content,
        upvotes_count: item.reply.upvotes_count,
        replies_received_count: item.reply._count.replies,
        has_verified_professional_reply: item.reply.replies.length > 0,
        created_at: item.reply.createdAt,
        parent_reply_id: item.reply.parent_reply_id,
        parent_content: item.reply.parent_reply?.content ?? null,
      },
    }));
    const responseItems =
      type === "all"
        ? [...postItems, ...replyItems]
            .sort((a, b) => {
              const savedAtDiff =
                new Date(b.saved_at ?? b.created_at).getTime() -
                new Date(a.saved_at ?? a.created_at).getTime();
              if (savedAtDiff !== 0) return savedAtDiff;

              return b.id.localeCompare(a.id);
            })
            .slice(pagination.skip, pagination.skip + pagination.limit)
        : [...postItems, ...replyItems];
    const count = postCount + replyCount;

    return toPaginatedListResponse(responseItems, pagination.page, pagination.limit, count);
  }

  async show(data: IPostShowDTO): Promise<PostDetailResponse | null> {
    const post = await this.repository.findFirst({
      where: {
        id: data.p.id,
        deleted: false,
        status: "publicado",
        community: {
          deleted: false,
        },
      },
      select: postSelect,
    });

    if (!post) return null;

    const userId = data.auth?.id;
    const [vote, save, membership] = await Promise.all([
      userId
        ? prisma.post_vote.findUnique({
            where: {
              user_id_post_id: {
                user_id: userId,
                post_id: post.id,
              },
            },
            select: {
              deleted: true,
              value: true,
            },
          })
        : Promise.resolve(null),
      userId
        ? prisma.post_save.findUnique({
            where: {
              user_id_post_id: {
                user_id: userId,
                post_id: post.id,
              },
            },
            select: {
              deleted: true,
            },
          })
        : Promise.resolve(null),
      userId
        ? prisma.community_member.findUnique({
            where: {
              community_id_user_id: {
                community_id: post.community.id,
                user_id: userId,
              },
            },
            select: {
              deleted: true,
            },
          })
        : Promise.resolve(null),
    ]);

    return {
      post: toPostResponse(
        post,
        vote && !vote.deleted ? normalizeVoteValue(vote.value) : null,
        Boolean(save && !save.deleted),
        Boolean(membership && !membership.deleted),
      ),
    };
  }

  async replies(data: IPostRepliesDTO): Promise<PostRepliesResponse | null> {
    const post = await findPublishedPost(data.p.id);
    if (!post) return null;

    const pagination = normalizePagination(data.q);
    const where: Prisma.post_replyWhereInput = {
      post_id: post.id,
      parent_reply_id: null,
      deleted: false,
    };

    const [topLevelItems, count] = await Promise.all([
      prisma.post_reply.findMany({
        where,
        orderBy: [{ upvotes_count: "desc" }, { createdAt: "desc" }, { id: "desc" }],
        select: replyBaseSelect,
      }),
      prisma.post_reply.count({ where }),
    ]);
    const sortedItems = await sortRepliesForDisplay(post.community_id, topLevelItems);
    const paginatedTopLevelItems = sortedItems.slice(
      pagination.skip,
      pagination.skip + pagination.limit,
    );
    const descendants = await loadReplyDescendants(
      post.id,
      paginatedTopLevelItems.map((reply) => reply.id),
      INLINE_REPLY_DESCENDANT_DEPTH,
    );
    const treeRankingSignals = await getCommunityMentorRankingSignals(
      post.community_id,
      [...paginatedTopLevelItems, ...descendants]
        .filter((reply) => reply.author.role === "psicologo")
        .map((reply) => reply.author.id),
    );
    const items = buildReplyTrees(paginatedTopLevelItems, descendants, treeRankingSignals);

    const replyIds = collectReplyIds(items);
    const userId = data.auth?.id;
    const [votes, saves] =
      replyIds.length > 0 && userId
        ? await Promise.all([
            prisma.post_vote.findMany({
              where: {
                user_id: userId,
                reply_id: {
                  in: replyIds,
                },
                deleted: false,
              },
              select: {
                reply_id: true,
                value: true,
              },
            }),
            prisma.post_reply_save.findMany({
              where: {
                user_id: userId,
                reply_id: {
                  in: replyIds,
                },
                deleted: false,
              },
              select: {
                reply_id: true,
              },
            }),
          ])
        : [[], []];
    const voteMap = new Map<string, CurrentVote>();
    const savedReplyIds = new Set(saves.map((save) => save.reply_id));

    for (const vote of votes) {
      if (vote.reply_id) {
        voteMap.set(vote.reply_id, normalizeVoteValue(vote.value));
      }
    }

    return {
      data: items.map((item) => toReplyResponse(item, voteMap, savedReplyIds)),
      page: pagination.page,
      pages: Math.ceil(count / pagination.limit),
      count,
    };
  }

  async replyThread(data: IPostReplyThreadDTO): Promise<PostReplyDTO | null> {
    const post = await findPublishedPost(data.p.id);
    if (!post) return null;

    const replies = await prisma.post_reply.findMany({
      where: {
        post_id: post.id,
        deleted: false,
      },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      select: replyBaseSelect,
    });
    const threadRankingSignals = await getCommunityMentorRankingSignals(
      post.community_id,
      replies.filter((reply) => reply.author.role === "psicologo").map((reply) => reply.author.id),
    );
    const thread = buildReplyThread(data.p.replyId, replies, threadRankingSignals);
    if (!thread) return null;

    const replyIds = collectReplyIds([thread]);
    const userId = data.auth?.id;
    const [votes, saves] =
      replyIds.length > 0 && userId
        ? await Promise.all([
            prisma.post_vote.findMany({
              where: {
                user_id: userId,
                reply_id: {
                  in: replyIds,
                },
                deleted: false,
              },
              select: {
                reply_id: true,
                value: true,
              },
            }),
            prisma.post_reply_save.findMany({
              where: {
                user_id: userId,
                reply_id: {
                  in: replyIds,
                },
                deleted: false,
              },
              select: {
                reply_id: true,
              },
            }),
          ])
        : [[], []];
    const voteMap = new Map<string, CurrentVote>();
    const savedReplyIds = new Set(saves.map((save) => save.reply_id));

    for (const vote of votes) {
      if (vote.reply_id) {
        voteMap.set(vote.reply_id, normalizeVoteValue(vote.value));
      }
    }

    return toReplyResponse(thread, voteMap, savedReplyIds);
  }

  async createReply(data: IPostCreateReplyDTO): Promise<PostMutationResult<PostReplyDTO>> {
    const post = await findPublishedPost(data.p.id);
    if (!post) return { kind: "not_found" };

    const mediaUrl = data.b.mediaUrl?.trim() || null;
    const mediaType = normalizeReplyMediaType(data.b.mediaType);
    const hasMedia = Boolean(mediaUrl || data.b.mediaType);

    if (hasMedia) {
      if (!mediaUrl || !mediaType || !isPublicReplyMediaUrl(mediaUrl)) {
        return { kind: "invalid_media" };
      }

      const canAttachMedia = await this.canAttachReplyMedia(data.auth.id!);
      if (!canAttachMedia) {
        return { kind: "media_not_allowed" };
      }
    }

    if (data.b.parentReplyId) {
      const parent = await prisma.post_reply.findFirst({
        where: {
          id: data.b.parentReplyId,
          post_id: post.id,
          deleted: false,
        },
        select: {
          id: true,
        },
      });

      if (!parent) return { kind: "invalid_parent" };
    }

    const reply = await prisma.$transaction(async (transaction) => {
      const created = await transaction.post_reply.create({
        data: {
          post_id: post.id,
          author_id: data.auth.id!,
          parent_reply_id: data.b.parentReplyId || null,
          content: data.b.content.trim(),
          media_type: mediaType,
          media_url: mediaUrl,
        },
        select: replyBaseSelect,
      });

      await transaction.community_post.update({
        where: {
          id: post.id,
        },
        data: {
          replies_count: {
            increment: 1,
          },
        },
      });

      return created;
    });

    return {
      kind: "ok",
      data: toReplyResponse(reply, new Map()),
    };
  }

  async report(data: IPostReportDTO): Promise<PostMutationResult<PostReportResponse>> {
    const post = await findPublishedPost(data.p.id);
    if (!post) return { kind: "not_found" };

    const replyId = data.p.replyId?.trim() || null;

    if (replyId) {
      const reply = await prisma.post_reply.findFirst({
        where: {
          id: replyId,
          post_id: post.id,
          deleted: false,
        },
        select: {
          id: true,
        },
      });

      if (!reply) return { kind: "invalid_target" };
    }

    const existingReport = await prisma.post_report.findFirst({
      where: {
        post_id: post.id,
        reply_id: replyId,
        reporter_id: data.auth.id!,
      },
      select: {
        id: true,
      },
    });

    const report = existingReport
      ? await prisma.post_report.update({
          where: {
            id: existingReport.id,
          },
          data: {
            deleted: false,
            deletedAt: null,
            reason: data.b.reason,
            description: data.b.description || null,
            status: "pendente",
          },
          select: {
            id: true,
            post_id: true,
            reply_id: true,
            reason: true,
            description: true,
            status: true,
            createdAt: true,
          },
        })
      : await prisma.post_report.create({
          data: {
            post_id: post.id,
            reply_id: replyId,
            reporter_id: data.auth.id!,
            reason: data.b.reason,
            description: data.b.description || null,
          },
          select: {
            id: true,
            post_id: true,
            reply_id: true,
            reason: true,
            description: true,
            status: true,
            createdAt: true,
          },
        });

    return {
      kind: "ok",
      data: {
        id: report.id,
        post_id: report.post_id,
        reply_id: report.reply_id,
        reason: report.reason,
        description: report.description,
        status: report.status,
        created_at: report.createdAt,
      },
    };
  }

  async vote(data: IPostVoteDTO): Promise<PostMutationResult<PostVoteResponse>> {
    const post = await findPublishedPost(data.p.id);
    if (!post) return { kind: "not_found" };

    const replyId = data.b.replyId || null;
    const value = data.b.value;

    if (replyId) {
      const reply = await prisma.post_reply.findFirst({
        where: {
          id: replyId,
          post_id: post.id,
          deleted: false,
        },
        select: {
          id: true,
        },
      });

      if (!reply) return { kind: "invalid_target" };
    }

    const response = await prisma.$transaction(async (transaction) => {
      const existing = replyId
        ? await transaction.post_vote.findUnique({
            where: {
              user_id_reply_id: {
                user_id: data.auth.id!,
                reply_id: replyId,
              },
            },
            select: {
              id: true,
              deleted: true,
              value: true,
            },
          })
        : await transaction.post_vote.findUnique({
            where: {
              user_id_post_id: {
                user_id: data.auth.id!,
                post_id: post.id,
              },
            },
            select: {
              id: true,
              deleted: true,
              value: true,
            },
          });

      const oldValue = existing && !existing.deleted ? normalizeVoteValue(existing.value) : null;
      const nextValue: CurrentVote = oldValue === value ? null : value;
      const upDelta = (nextValue === 1 ? 1 : 0) - (oldValue === 1 ? 1 : 0);
      const downDelta = (nextValue === -1 ? 1 : 0) - (oldValue === -1 ? 1 : 0);

      if (existing) {
        await transaction.post_vote.update({
          where: {
            id: existing.id,
          },
          data: {
            value,
            deleted: nextValue === null,
            deletedAt: nextValue === null ? new Date() : null,
          },
        });
      } else if (nextValue !== null) {
        await transaction.post_vote.create({
          data: {
            user_id: data.auth.id!,
            post_id: replyId ? null : post.id,
            reply_id: replyId,
            value,
          },
        });
      }

      if (replyId) {
        const updatedReply = await transaction.post_reply.update({
          where: {
            id: replyId,
          },
          data: {
            upvotes_count: {
              increment: upDelta,
            },
          },
          select: {
            upvotes_count: true,
          },
        });

        return {
          target_type: "reply" as const,
          post_id: post.id,
          reply_id: replyId,
          value: nextValue,
          upvotes_count: updatedReply.upvotes_count,
          downvotes_count: null,
        };
      }

      const updatedPost = await transaction.community_post.update({
        where: {
          id: post.id,
        },
        data: {
          upvotes_count: {
            increment: upDelta,
          },
          downvotes_count: {
            increment: downDelta,
          },
        },
        select: {
          upvotes_count: true,
          downvotes_count: true,
        },
      });

      return {
        target_type: "post" as const,
        post_id: post.id,
        reply_id: null,
        value: nextValue,
        upvotes_count: updatedPost.upvotes_count,
        downvotes_count: updatedPost.downvotes_count,
      };
    });

    return {
      kind: "ok",
      data: response,
    };
  }

  async save(data: IPostSaveDTO): Promise<PostMutationResult<PostSaveResponse>> {
    const post = await findPublishedPost(data.p.id);
    if (!post) return { kind: "not_found" };

    const response = await prisma.$transaction(async (transaction) => {
      const existing = await transaction.post_save.findUnique({
        where: {
          user_id_post_id: {
            user_id: data.auth.id!,
            post_id: post.id,
          },
        },
        select: {
          id: true,
          deleted: true,
        },
      });

      let saveId = existing?.id ?? null;

      if (existing) {
        if (existing.deleted) {
          const save = await transaction.post_save.update({
            where: {
              id: existing.id,
            },
            data: {
              deleted: false,
              deletedAt: null,
            },
            select: {
              id: true,
            },
          });
          saveId = save.id;
        }
      } else {
        const save = await transaction.post_save.create({
          data: {
            user_id: data.auth.id!,
            post_id: post.id,
          },
          select: {
            id: true,
          },
        });
        saveId = save.id;
      }

      const shouldIncrement = !existing || existing.deleted;
      const updatedPost = shouldIncrement
        ? await transaction.community_post.update({
            where: {
              id: post.id,
            },
            data: {
              saves_count: {
                increment: 1,
              },
            },
            select: {
              saves_count: true,
            },
          })
        : { saves_count: post.saves_count };

      return {
        target_type: "post" as const,
        post_id: post.id,
        reply_id: null,
        saved: true,
        saves_count: updatedPost.saves_count,
        notification_event_id: shouldIncrement ? saveId : null,
      };
    });

    return {
      kind: "ok",
      data: response,
    };
  }

  async unsave(data: IPostSaveDTO): Promise<PostMutationResult<PostSaveResponse>> {
    const post = await findPublishedPost(data.p.id);
    if (!post) return { kind: "not_found" };

    const response = await prisma.$transaction(async (transaction) => {
      const existing = await transaction.post_save.findUnique({
        where: {
          user_id_post_id: {
            user_id: data.auth.id!,
            post_id: post.id,
          },
        },
        select: {
          id: true,
          deleted: true,
        },
      });

      if (existing && !existing.deleted) {
        await transaction.post_save.update({
          where: {
            id: existing.id,
          },
          data: {
            deleted: true,
            deletedAt: new Date(),
          },
        });
      }

      const shouldDecrement = Boolean(existing && !existing.deleted && post.saves_count > 0);
      const updatedPost = shouldDecrement
        ? await transaction.community_post.update({
            where: {
              id: post.id,
            },
            data: {
              saves_count: {
                decrement: 1,
              },
            },
            select: {
              saves_count: true,
            },
          })
        : { saves_count: post.saves_count };

      return {
        target_type: "post" as const,
        post_id: post.id,
        reply_id: null,
        saved: false,
        saves_count: updatedPost.saves_count,
      };
    });

    return {
      kind: "ok",
      data: response,
    };
  }

  async saveReply(data: IPostReplySaveDTO): Promise<PostMutationResult<PostSaveResponse>> {
    const reply = await findPublishedReply(data.p.id, data.p.replyId);
    if (!reply) return { kind: "not_found" };

    const response = await prisma.$transaction(async (transaction) => {
      const existing = await transaction.post_reply_save.findUnique({
        where: {
          user_id_reply_id: {
            user_id: data.auth.id!,
            reply_id: reply.id,
          },
        },
        select: {
          id: true,
          deleted: true,
        },
      });

      if (existing) {
        if (existing.deleted) {
          await transaction.post_reply_save.update({
            where: {
              id: existing.id,
            },
            data: {
              deleted: false,
              deletedAt: null,
            },
          });
        }
      } else {
        await transaction.post_reply_save.create({
          data: {
            user_id: data.auth.id!,
            reply_id: reply.id,
          },
        });
      }

      return {
        target_type: "reply" as const,
        post_id: reply.post_id,
        reply_id: reply.id,
        saved: true,
        saves_count: null,
      };
    });

    return {
      kind: "ok",
      data: response,
    };
  }

  async unsaveReply(data: IPostReplySaveDTO): Promise<PostMutationResult<PostSaveResponse>> {
    const reply = await findPublishedReply(data.p.id, data.p.replyId);
    if (!reply) return { kind: "not_found" };

    const response = await prisma.$transaction(async (transaction) => {
      const existing = await transaction.post_reply_save.findUnique({
        where: {
          user_id_reply_id: {
            user_id: data.auth.id!,
            reply_id: reply.id,
          },
        },
        select: {
          id: true,
          deleted: true,
        },
      });

      if (existing && !existing.deleted) {
        await transaction.post_reply_save.update({
          where: {
            id: existing.id,
          },
          data: {
            deleted: true,
            deletedAt: new Date(),
          },
        });
      }

      return {
        target_type: "reply" as const,
        post_id: reply.post_id,
        reply_id: reply.id,
        saved: false,
        saves_count: null,
      };
    });

    return {
      kind: "ok",
      data: response,
    };
  }

  async deleteReply(
    data: IPostReplyDeleteDTO,
  ): Promise<PostMutationResult<PostReplyDeleteResponse>> {
    const post = await findPublishedPost(data.p.id);
    if (!post) return { kind: "not_found" };

    const reply = await prisma.post_reply.findFirst({
      where: {
        id: data.p.replyId,
        post_id: post.id,
        deleted: false,
      },
      select: {
        id: true,
        author_id: true,
      },
    });

    if (!reply) return { kind: "invalid_target" };
    if (reply.author_id !== data.auth.id) return { kind: "forbidden" };

    const replies = await prisma.post_reply.findMany({
      where: {
        post_id: post.id,
        deleted: false,
      },
      select: {
        id: true,
        parent_reply_id: true,
      },
    });
    const childrenByParent = new Map<string, string[]>();

    for (const item of replies) {
      if (!item.parent_reply_id) continue;
      const children = childrenByParent.get(item.parent_reply_id) ?? [];
      children.push(item.id);
      childrenByParent.set(item.parent_reply_id, children);
    }

    const replyIds = new Set<string>();
    const stack = [reply.id];

    while (stack.length > 0) {
      const currentId = stack.pop();
      if (!currentId || replyIds.has(currentId)) continue;

      replyIds.add(currentId);
      for (const childId of childrenByParent.get(currentId) ?? []) {
        stack.push(childId);
      }
    }

    const ids = [...replyIds];
    const now = new Date();
    const nextRepliesCount = Math.max(0, post.replies_count - ids.length);

    const response = await prisma.$transaction(async (transaction) => {
      await transaction.post_reply.updateMany({
        where: {
          id: {
            in: ids,
          },
          post_id: post.id,
          deleted: false,
        },
        data: {
          deleted: true,
          deletedAt: now,
        },
      });

      const updatedPost = await transaction.community_post.update({
        where: {
          id: post.id,
        },
        data: {
          replies_count: nextRepliesCount,
        },
        select: {
          replies_count: true,
        },
      });

      return {
        post_id: post.id,
        reply_ids: ids,
        deleted_count: ids.length,
        replies_count: updatedPost.replies_count,
      };
    });

    return {
      kind: "ok",
      data: response,
    };
  }
}
