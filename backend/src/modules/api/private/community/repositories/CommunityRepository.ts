import type { Prisma } from "@/external/generated/prisma/client";
import prisma, { type ORM } from "@/infra/database/prisma";
import { activeProfessionalEntitlementWhere } from "@/utils/subscription-entitlement";
import type {
  CommunityAuthorDTO,
  CommunityDetailResponse,
  CommunityDTO,
  CommunityFeedResponse,
  CommunityIndexResponse,
  CommunityMembershipResponse,
  CommunityPostDTO,
  CommunityPostsResponse,
  CommunityTopMentorsPeriodValue,
  ICommunityCreatePostDTO,
  ICommunityFeedDTO,
  ICommunityIndexDTO,
  ICommunityMembershipDTO,
  ICommunityPostsDTO,
  ICommunityShowDTO,
  ICommunitySuggestionDTO,
  ICommunityTopMentorsDTO,
} from "../DTOs/ICommunityDTO";
import type { ICommunityRepository } from "./interfaces/ICommunityRepository";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;
const DEFAULT_TOP_MENTORS_LIMIT = 5;
const MAX_TOP_MENTORS_LIMIT = 10;
const TOP_MENTOR_UPVOTE_WEIGHT = 5;
const TOP_MENTOR_DOWNVOTE_WEIGHT = 3;
const TOP_MENTOR_COMMENT_WEIGHT = 2;
const TOP_MENTOR_SHARE_WEIGHT = 4;
const TOP_MENTOR_SAVE_WEIGHT = 3;
const TOP_MENTOR_COMMUNITY_WHATSAPP_WEIGHT = 6;
const TOP_MENTOR_POST_WEIGHT = 1;
const TOP_MENTOR_REPLY_WEIGHT = 1;
const TOP_MENTOR_ACTIVE_DAY_WEIGHT = 1;
const TOP_MENTOR_REMOVED_POST_PENALTY_STEP = 30;

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

const topMentorUserSelect = {
  id: true,
  name: true,
  avatar: true,
  psychologist_profile: {
    select: {
      headline: true,
      crp: true,
      rating_avg: true,
      rating_count: true,
    },
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
    take: 1,
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

type PostResult = Prisma.community_postGetPayload<{ select: typeof postSelect }>;
type AuthorResult = PostResult["author"];
type ProfessionalReplyResult = PostResult["replies"][number];
type TopMentorUserResult = Prisma.userGetPayload<{ select: typeof topMentorUserSelect }>;
type CurrentVote = 1 | -1 | null;

const CONTACT_MESSAGE =
  "Olá, encontrei seu post na comunidade Lectum e gostaria de conversar sobre atendimento.";

const normalizePagination = (query: { page?: number; limit?: number }) => {
  const page = Math.max(1, Number(query.page || 1));
  const limit = Math.min(MAX_LIMIT, Math.max(1, Number(query.limit || DEFAULT_LIMIT)));

  return {
    page,
    limit,
    skip: (page - 1) * limit,
  };
};

const toCommunityResponse = (item: {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  category: string | null;
  members_count: number;
  createdAt: Date;
}): CommunityDTO => ({
  id: item.id,
  name: item.name,
  slug: item.slug,
  description: item.description,
  category: item.category,
  members_count: item.members_count,
  created_at: item.createdAt,
});

const toCommunityDetailResponse = (
  community: Parameters<typeof toCommunityResponse>[0],
  postsCount: number,
  membershipCreatedAt: Date | null,
): CommunityDetailResponse => {
  const following = Boolean(membershipCreatedAt);
  const communityDetail = {
    ...toCommunityResponse(community),
    posts_count: postsCount,
    following,
    membership_created_at: membershipCreatedAt,
  };

  return {
    community: communityDetail,
    participation: {
      following,
      member_since: membershipCreatedAt,
      can_post: true,
    },
  };
};

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
  void score;
  if (!isProfessionalVerified(profile) || !hasPaidProfessionalEntitlement(profile)) return null;

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

const normalizeScope = (value?: string | null) => {
  return value === "following" ? "following" : "all";
};

const normalizeVoteValue = (value?: number | null): CurrentVote => {
  if (value === 1 || value === -1) return value;

  return null;
};

const getPostCurrentVotes = async (userId: string | undefined, postIds: string[]) => {
  if (!userId || postIds.length === 0) return new Map<string, CurrentVote>();

  const votes = await prisma.post_vote.findMany({
    where: {
      user_id: userId,
      deleted: false,
      post_id: {
        in: postIds,
      },
    },
    select: {
      post_id: true,
      value: true,
    },
  });

  return new Map(
    votes
      .filter((vote): vote is { post_id: string; value: number } => Boolean(vote.post_id))
      .map((vote) => [vote.post_id, normalizeVoteValue(vote.value)]),
  );
};

const resolveTopMentorsPeriod = (value?: string | null) => {
  const key: CommunityTopMentorsPeriodValue = value === "90d" || value === "all" ? value : "30d";
  const endAt = new Date();
  const startAt = key === "all" ? null : new Date(endAt);

  if (startAt && key === "30d") startAt.setDate(startAt.getDate() - 30);
  if (startAt && key === "90d") startAt.setDate(startAt.getDate() - 90);

  const labels = {
    "30d": "Últimos 30 dias",
    "90d": "Últimos 90 dias",
    all: "Histórico completo",
  } as const;

  return {
    key,
    label: labels[key],
    start_at: startAt,
    end_at: endAt,
  };
};

const topMentorsCreatedAtWindow = (period: ReturnType<typeof resolveTopMentorsPeriod>) => {
  const range: Prisma.DateTimeFilter = {
    lte: period.end_at,
  };

  if (period.start_at) range.gte = period.start_at;

  return range;
};

const normalizeTopMentorsLimit = (limit?: number) => {
  return Math.min(MAX_TOP_MENTORS_LIMIT, Math.max(1, Number(limit || DEFAULT_TOP_MENTORS_LIMIT)));
};

type TopMentorMutableMetrics = {
  upvotes_received: number;
  downvotes_received: number;
  comments_received: number;
  shares_received: number;
  saves_received: number;
  community_whatsapp_clicks: number;
  posts_published: number;
  replies_published: number;
  active_days: number;
  removed_posts: number;
  removed_posts_penalty: number;
};

const emptyTopMentorMetrics = (): TopMentorMutableMetrics => ({
  upvotes_received: 0,
  downvotes_received: 0,
  comments_received: 0,
  shares_received: 0,
  saves_received: 0,
  community_whatsapp_clicks: 0,
  posts_published: 0,
  replies_published: 0,
  active_days: 0,
  removed_posts: 0,
  removed_posts_penalty: 0,
});

const topMentorRemovedPostsPenalty = (removedPosts: number) => {
  return (removedPosts * (removedPosts + 1) * TOP_MENTOR_REMOVED_POST_PENALTY_STEP) / 2;
};

const topMentorScore = (metrics: TopMentorMutableMetrics) => {
  const positivePoints =
    metrics.upvotes_received * TOP_MENTOR_UPVOTE_WEIGHT +
    metrics.comments_received * TOP_MENTOR_COMMENT_WEIGHT +
    metrics.shares_received * TOP_MENTOR_SHARE_WEIGHT +
    metrics.saves_received * TOP_MENTOR_SAVE_WEIGHT +
    metrics.community_whatsapp_clicks * TOP_MENTOR_COMMUNITY_WHATSAPP_WEIGHT +
    metrics.posts_published * TOP_MENTOR_POST_WEIGHT +
    metrics.replies_published * TOP_MENTOR_REPLY_WEIGHT +
    metrics.active_days * TOP_MENTOR_ACTIVE_DAY_WEIGHT;
  const penaltyPoints =
    metrics.downvotes_received * TOP_MENTOR_DOWNVOTE_WEIGHT + metrics.removed_posts_penalty;

  return positivePoints - penaltyPoints;
};

const hasTopMentorRankingSignal = (metrics: TopMentorMutableMetrics) => {
  return (
    metrics.upvotes_received > 0 ||
    metrics.downvotes_received > 0 ||
    metrics.comments_received > 0 ||
    metrics.shares_received > 0 ||
    metrics.saves_received > 0 ||
    metrics.community_whatsapp_clicks > 0 ||
    metrics.posts_published > 0 ||
    metrics.replies_published > 0 ||
    metrics.active_days > 0 ||
    metrics.removed_posts > 0
  );
};

const topMentorsFormula = () => ({
  upvote_weight: TOP_MENTOR_UPVOTE_WEIGHT,
  downvote_weight: TOP_MENTOR_DOWNVOTE_WEIGHT,
  comment_weight: TOP_MENTOR_COMMENT_WEIGHT,
  share_weight: TOP_MENTOR_SHARE_WEIGHT,
  save_weight: TOP_MENTOR_SAVE_WEIGHT,
  community_whatsapp_weight: TOP_MENTOR_COMMUNITY_WHATSAPP_WEIGHT,
  post_weight: TOP_MENTOR_POST_WEIGHT,
  reply_weight: TOP_MENTOR_REPLY_WEIGHT,
  active_day_weight: TOP_MENTOR_ACTIVE_DAY_WEIGHT,
  removed_post_penalty_step: TOP_MENTOR_REMOVED_POST_PENALTY_STEP,
  description:
    "score = (upvotes × 5) - (downvotes × 3) + (comentários recebidos × 2) + (compartilhamentos × 4) + (salvamentos × 3) + (cliques WhatsApp da comunidade × 6) + (posts publicados × 1) + (respostas publicadas × 1) + (dias ativos × 1) - penalidade progressiva por posts removidos",
  notes: [
    "Compartilhamentos e cliques de WhatsApp por comunidade só entram quando houver evento persistido com origem de comunidade; sem essa fonte real, esses componentes permanecem zerados.",
  ],
});

const topMentorBadgeForPosition = (position: number) => {
  if (position === 1) return "TOP #1 MENTOR";
  if (position === 2) return "TOP #2 MENTOR";
  if (position === 3) return "TOP #3 MENTOR";

  return null;
};

const postSearchWhere = (search?: string): Prisma.community_postWhereInput["OR"] => {
  if (!search) return undefined;

  return [
    {
      title: {
        contains: search,
        mode: "insensitive",
      },
    },
    {
      content: {
        contains: search,
        mode: "insensitive",
      },
    },
    {
      AND: [
        {
          OR: [
            {
              anonymous: false,
            },
            {
              author: {
                role: "psicologo",
              },
            },
          ],
        },
        {
          author: {
            name: {
              contains: search,
              mode: "insensitive",
            },
          },
        },
      ],
    },
  ];
};

const toAuthorResponse = (
  author: AuthorResult,
  mentorScore = 0,
  anonymous = false,
  anonymousDisplayName?: string,
): CommunityAuthorDTO => {
  const profile = author.psychologist_profile;
  const isPsychologist = author.role === "psicologo";
  const shouldMaskAuthor = !isPsychologist && anonymous;

  return {
    id: author.id,
    name: shouldMaskAuthor ? (anonymousDisplayName ?? "Membro Anônimo") : author.name,
    avatar: shouldMaskAuthor ? null : author.avatar,
    role: author.role,
    type_label: authorTypeLabel(author.role, profile?.gender, anonymous),
    verified: isPsychologist && isProfessionalVerified(profile),
    featured_badge: isPsychologist ? mentorBadgeForScore(profile, mentorScore) : null,
    whatsapp_url: isPsychologist ? buildProfessionalWhatsappUrl(profile) : null,
  };
};

const toHighlightedProfessionalReply = (
  reply?: ProfessionalReplyResult,
): CommunityPostDTO["highlighted_professional_reply"] => {
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
    author,
  };
};

const toPostResponse = (
  item: PostResult,
  currentUserVote: CurrentVote = null,
): CommunityPostDTO => {
  const responseCommunity = toCommunityResponse(item.community);
  const anonymous = item.author.role !== "psicologo" && item.anonymous;
  const author = toAuthorResponse(
    item.author,
    item.upvotes_count,
    anonymous,
    anonymous ? anonymousDisplayNameForPost(item.id) : undefined,
  );
  const highlightedReply = toHighlightedProfessionalReply(item.replies[0]);

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
    community: responseCommunity,
    author,
    highlighted_professional_reply: highlightedReply,
  };
};

const feedEngagementScore = (post: CommunityPostDTO) => {
  const verifiedReplyBoost = post.highlighted_professional_reply
    ? 250 + post.highlighted_professional_reply.upvotes_count * 4
    : 0;

  return post.upvotes_count * 3 + post.replies_count * 2 + post.saves_count + verifiedReplyBoost;
};

const sortFeedPosts = (items: CommunityPostDTO[]) => {
  return items.sort((a, b) => {
    const scoreDiff = feedEngagementScore(b) - feedEngagementScore(a);
    if (scoreDiff !== 0) return scoreDiff;

    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
};

export class CommunityRepository implements ICommunityRepository {
  readonly repository: ORM["community"];

  constructor() {
    this.repository = prisma.community;
  }

  async index(data: ICommunityIndexDTO): Promise<CommunityIndexResponse> {
    const pagination = normalizePagination(data.q);
    const search = data.q.search?.trim();
    const category = data.q.category?.trim();
    const scope = normalizeScope(data.q.scope);
    const userId = data.auth?.id;
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const where: Prisma.communityWhereInput = {
      deleted: false,
      members:
        scope === "following"
          ? {
              some: {
                user_id: userId || "__missing_user__",
                deleted: false,
              },
            }
          : undefined,
      category: category
        ? {
            equals: category,
            mode: "insensitive",
          }
        : undefined,
      OR: search
        ? [
            {
              name: {
                contains: search,
                mode: "insensitive",
              },
            },
            {
              description: {
                contains: search,
                mode: "insensitive",
              },
            },
            {
              category: {
                contains: search,
                mode: "insensitive",
              },
            },
          ]
        : undefined,
    };
    const followedMembershipWhere: Prisma.community_memberWhereInput = {
      user_id: userId || "__missing_user__",
      deleted: false,
      community: {
        deleted: false,
      },
    };
    const followedPostsTodayWhere: Prisma.community_postWhereInput = {
      deleted: false,
      status: "publicado",
      createdAt: {
        gte: todayStart,
      },
      community: {
        deleted: false,
        members: {
          some: {
            user_id: userId || "__missing_user__",
            deleted: false,
          },
        },
      },
    };

    const [items, count, categories, followingCount, newPostsTodayCount] = await Promise.all([
      this.repository.findMany({
        where,
        take: pagination.limit,
        skip: pagination.skip,
        orderBy: [{ members_count: "desc" }, { name: "asc" }, { createdAt: "desc" }],
        select: communitySelect,
      }),
      this.repository.count({ where }),
      this.repository.findMany({
        where: {
          deleted: false,
          category: {
            not: null,
          },
        },
        distinct: ["category"],
        orderBy: {
          category: "asc",
        },
        select: {
          category: true,
        },
      }),
      userId
        ? prisma.community_member.count({ where: followedMembershipWhere })
        : Promise.resolve(0),
      userId ? prisma.community_post.count({ where: followedPostsTodayWhere }) : Promise.resolve(0),
    ]);
    const itemIds = items.map((item) => item.id);
    const [memberships, postsCount, newPostsCount] =
      userId && itemIds.length > 0
        ? await Promise.all([
            prisma.community_member.findMany({
              where: {
                user_id: userId,
                community_id: {
                  in: itemIds,
                },
                deleted: false,
              },
              select: {
                community_id: true,
                createdAt: true,
              },
            }),
            prisma.community_post.groupBy({
              by: ["community_id"],
              where: {
                community_id: {
                  in: itemIds,
                },
                deleted: false,
                status: "publicado",
              },
              _count: {
                _all: true,
              },
            }),
            prisma.community_post.groupBy({
              by: ["community_id"],
              where: {
                community_id: {
                  in: itemIds,
                },
                deleted: false,
                status: "publicado",
                createdAt: {
                  gte: todayStart,
                },
              },
              _count: {
                _all: true,
              },
            }),
          ])
        : [[], [], []];
    const membershipByCommunityId = new Map(
      memberships.map((item) => [item.community_id, item.createdAt]),
    );
    const postsCountByCommunityId = new Map(
      postsCount.map((item) => [item.community_id, item._count._all]),
    );
    const newPostsCountByCommunityId = new Map(
      newPostsCount.map((item) => [item.community_id, item._count._all]),
    );

    return {
      data: items.map((item) => {
        const membershipCreatedAt = membershipByCommunityId.get(item.id) ?? null;

        return {
          ...toCommunityResponse(item),
          following: Boolean(membershipCreatedAt),
          membership_created_at: membershipCreatedAt,
          posts_count: postsCountByCommunityId.get(item.id) ?? 0,
          new_posts_count: newPostsCountByCommunityId.get(item.id) ?? 0,
        };
      }),
      categories: categories
        .map((item) => item.category?.trim())
        .filter((item): item is string => Boolean(item)),
      page: pagination.page,
      pages: Math.ceil(count / pagination.limit),
      count,
      scope,
      following_count: followingCount,
      new_posts_today_count: newPostsTodayCount,
    };
  }

  async show(data: ICommunityShowDTO): Promise<CommunityDetailResponse | null> {
    const community = await this.repository.findFirst({
      where: {
        slug: data.p.slug,
        deleted: false,
      },
      select: communitySelect,
    });

    if (!community) return null;

    const [postsCount, membership] = await Promise.all([
      prisma.community_post.count({
        where: {
          community_id: community.id,
          deleted: false,
          status: "publicado",
        },
      }),
      prisma.community_member.findUnique({
        where: {
          community_id_user_id: {
            community_id: community.id,
            user_id: data.auth.id!,
          },
        },
        select: {
          createdAt: true,
          deleted: true,
        },
      }),
    ]);

    return toCommunityDetailResponse(
      community,
      postsCount,
      membership && !membership.deleted ? membership.createdAt : null,
    );
  }

  async feed(data: ICommunityFeedDTO): Promise<CommunityFeedResponse> {
    const pagination = normalizePagination(data.q);
    const search = data.q.search?.trim();
    const communitySlug = data.q.community?.trim() || null;
    const scope = normalizeScope(data.q.scope);
    const followerUserId = scope === "following" ? data.auth?.id : undefined;

    if (scope === "following" && !followerUserId) {
      return {
        data: [],
        page: pagination.page,
        pages: 0,
        count: 0,
        scope,
        community_slug: communitySlug,
      };
    }

    const communityMemberFilter: Prisma.communityWhereInput["members"] =
      scope === "following" && followerUserId
        ? {
            some: {
              user_id: followerUserId,
              deleted: false,
            },
          }
        : undefined;

    const where: Prisma.community_postWhereInput = {
      deleted: false,
      status: "publicado",
      community: {
        deleted: false,
        slug: communitySlug || undefined,
        members: communityMemberFilter,
      },
      OR: postSearchWhere(search),
    };

    const [items, count] = await Promise.all([
      prisma.community_post.findMany({
        where,
        take: pagination.limit,
        skip: pagination.skip,
        orderBy: [
          { upvotes_count: "desc" },
          { replies_count: "desc" },
          { saves_count: "desc" },
          { createdAt: "desc" },
          { id: "desc" },
        ],
        select: postSelect,
      }),
      prisma.community_post.count({ where }),
    ]);
    const currentVotes = await getPostCurrentVotes(
      data.auth?.id ?? undefined,
      items.map((item) => item.id),
    );

    return {
      data: sortFeedPosts(
        items.map((item) => toPostResponse(item, currentVotes.get(item.id) ?? null)),
      ),
      page: pagination.page,
      pages: Math.ceil(count / pagination.limit),
      count,
      scope,
      community_slug: communitySlug,
    };
  }

  async topMentors(data: ICommunityTopMentorsDTO) {
    const period = resolveTopMentorsPeriod(data.q.period);
    const createdAtWindow = topMentorsCreatedAtWindow(period);
    const communitySlug = data.q.community?.trim() || null;
    const limit = normalizeTopMentorsLimit(data.q.limit);

    const community = communitySlug
      ? await this.repository.findFirst({
          where: {
            slug: communitySlug,
            deleted: false,
          },
          select: communitySelect,
        })
      : null;

    if (communitySlug && !community) return null;

    const eligibleMentors = await prisma.user.findMany({
      where: {
        deleted: false,
        active: true,
        role: "psicologo",
        psychologist_profile: {
          is: {
            deleted: false,
            published: true,
            cfp_verified_at: {
              not: null,
            },
            subscriptions: {
              some: activeProfessionalEntitlementWhere(),
            },
          },
        },
      },
      select: topMentorUserSelect,
    });
    const eligibleMentorIds = eligibleMentors.map((mentor) => mentor.id);

    if (eligibleMentorIds.length === 0) {
      return {
        data: [],
        period,
        community: community ? toCommunityResponse(community) : null,
        formula: topMentorsFormula(),
        count: 0,
      };
    }

    const communityFilter: Prisma.communityWhereInput = {
      deleted: false,
      slug: communitySlug || undefined,
    };
    const publishedPostFilter: Prisma.community_postWhereInput = {
      deleted: false,
      status: "publicado",
      community: communityFilter,
    };

    const [
      postParticipation,
      replyParticipation,
      postVotes,
      replyVotes,
      postCommentsReceived,
      replyCommentsReceived,
      postSaves,
      removedPostParticipation,
      postActivityDays,
      replyActivityDays,
    ] = await Promise.all([
      prisma.community_post.groupBy({
        by: ["author_id"],
        where: {
          ...publishedPostFilter,
          author_id: {
            in: eligibleMentorIds,
          },
          createdAt: createdAtWindow,
        },
        _count: {
          author_id: true,
        },
      }),
      prisma.post_reply.groupBy({
        by: ["author_id"],
        where: {
          deleted: false,
          author_id: {
            in: eligibleMentorIds,
          },
          createdAt: createdAtWindow,
          post: publishedPostFilter,
        },
        _count: {
          author_id: true,
        },
      }),
      prisma.post_vote.findMany({
        where: {
          deleted: false,
          value: {
            in: [1, -1],
          },
          createdAt: createdAtWindow,
          post_id: {
            not: null,
          },
          post: {
            ...publishedPostFilter,
            author_id: {
              in: eligibleMentorIds,
            },
          },
        },
        select: {
          value: true,
          post: {
            select: {
              author_id: true,
            },
          },
        },
      }),
      prisma.post_vote.findMany({
        where: {
          deleted: false,
          value: {
            in: [1, -1],
          },
          createdAt: createdAtWindow,
          reply_id: {
            not: null,
          },
          reply: {
            deleted: false,
            author_id: {
              in: eligibleMentorIds,
            },
            post: publishedPostFilter,
          },
        },
        select: {
          value: true,
          reply: {
            select: {
              author_id: true,
            },
          },
        },
      }),
      prisma.post_reply.findMany({
        where: {
          deleted: false,
          parent_reply_id: null,
          createdAt: createdAtWindow,
          post: {
            ...publishedPostFilter,
            author_id: {
              in: eligibleMentorIds,
            },
          },
        },
        select: {
          author_id: true,
          post: {
            select: {
              author_id: true,
            },
          },
        },
      }),
      prisma.post_reply.findMany({
        where: {
          deleted: false,
          parent_reply_id: {
            not: null,
          },
          createdAt: createdAtWindow,
          post: publishedPostFilter,
          parent_reply: {
            is: {
              deleted: false,
              author_id: {
                in: eligibleMentorIds,
              },
              post: publishedPostFilter,
            },
          },
        },
        select: {
          author_id: true,
          parent_reply: {
            select: {
              author_id: true,
            },
          },
        },
      }),
      prisma.post_save.findMany({
        where: {
          deleted: false,
          createdAt: createdAtWindow,
          post: {
            ...publishedPostFilter,
            author_id: {
              in: eligibleMentorIds,
            },
          },
        },
        select: {
          post: {
            select: {
              author_id: true,
            },
          },
        },
      }),
      prisma.community_post.groupBy({
        by: ["author_id"],
        where: {
          deleted: false,
          status: "removido",
          author_id: {
            in: eligibleMentorIds,
          },
          community: communityFilter,
          updatedAt: createdAtWindow,
        },
        _count: {
          author_id: true,
        },
      }),
      prisma.community_post.findMany({
        where: {
          ...publishedPostFilter,
          author_id: {
            in: eligibleMentorIds,
          },
          createdAt: createdAtWindow,
        },
        select: {
          author_id: true,
          createdAt: true,
        },
      }),
      prisma.post_reply.findMany({
        where: {
          deleted: false,
          author_id: {
            in: eligibleMentorIds,
          },
          createdAt: createdAtWindow,
          post: publishedPostFilter,
        },
        select: {
          author_id: true,
          createdAt: true,
        },
      }),
    ]);

    const metricsByMentorId = new Map<string, TopMentorMutableMetrics>();
    const activeDaysByMentorId = new Map<string, Set<string>>();
    const getMetrics = (mentorId: string) => {
      const existing = metricsByMentorId.get(mentorId);
      if (existing) return existing;

      const metrics = emptyTopMentorMetrics();
      metricsByMentorId.set(mentorId, metrics);

      return metrics;
    };
    const addActiveDay = (mentorId: string, date: Date) => {
      const existing = activeDaysByMentorId.get(mentorId) ?? new Set<string>();
      existing.add(date.toISOString().slice(0, 10));
      activeDaysByMentorId.set(mentorId, existing);
    };

    for (const item of postParticipation) {
      getMetrics(item.author_id).posts_published = item._count.author_id;
    }

    for (const item of replyParticipation) {
      getMetrics(item.author_id).replies_published = item._count.author_id;
    }

    for (const vote of postVotes) {
      if (vote.post?.author_id) {
        const metrics = getMetrics(vote.post.author_id);
        if (vote.value === 1) metrics.upvotes_received += 1;
        if (vote.value === -1) metrics.downvotes_received += 1;
      }
    }

    for (const vote of replyVotes) {
      if (vote.reply?.author_id) {
        const metrics = getMetrics(vote.reply.author_id);
        if (vote.value === 1) metrics.upvotes_received += 1;
        if (vote.value === -1) metrics.downvotes_received += 1;
      }
    }

    for (const comment of postCommentsReceived) {
      const mentorId = comment.post?.author_id;
      if (mentorId && comment.author_id !== mentorId) {
        getMetrics(mentorId).comments_received += 1;
      }
    }

    for (const comment of replyCommentsReceived) {
      const mentorId = comment.parent_reply?.author_id;
      if (mentorId && comment.author_id !== mentorId) {
        getMetrics(mentorId).comments_received += 1;
      }
    }

    for (const save of postSaves) {
      if (save.post?.author_id) {
        getMetrics(save.post.author_id).saves_received += 1;
      }
    }

    for (const item of removedPostParticipation) {
      const metrics = getMetrics(item.author_id);
      metrics.removed_posts = item._count.author_id;
      metrics.removed_posts_penalty = topMentorRemovedPostsPenalty(metrics.removed_posts);
    }

    for (const item of postActivityDays) {
      addActiveDay(item.author_id, item.createdAt);
    }

    for (const item of replyActivityDays) {
      addActiveDay(item.author_id, item.createdAt);
    }

    for (const [mentorId, days] of activeDaysByMentorId.entries()) {
      getMetrics(mentorId).active_days = days.size;
    }

    const mentorById = new Map<string, TopMentorUserResult>(
      eligibleMentors.map((mentor) => [mentor.id, mentor]),
    );
    const ranked = [...metricsByMentorId.entries()]
      .map(([mentorId, metrics]) => {
        const mentor = mentorById.get(mentorId);
        const score = topMentorScore(metrics);

        if (!mentor || !hasTopMentorRankingSignal(metrics)) return null;

        return {
          mentor,
          metrics,
          score,
        };
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item))
      .sort((a, b) => {
        const scoreDiff = b.score - a.score;
        if (scoreDiff !== 0) return scoreDiff;

        const upvoteDiff = b.metrics.upvotes_received - a.metrics.upvotes_received;
        if (upvoteDiff !== 0) return upvoteDiff;

        const commentDiff = b.metrics.comments_received - a.metrics.comments_received;
        if (commentDiff !== 0) return commentDiff;

        const whatsappDiff =
          b.metrics.community_whatsapp_clicks - a.metrics.community_whatsapp_clicks;
        if (whatsappDiff !== 0) return whatsappDiff;

        const saveDiff = b.metrics.saves_received - a.metrics.saves_received;
        if (saveDiff !== 0) return saveDiff;

        const activeDayDiff = b.metrics.active_days - a.metrics.active_days;
        if (activeDayDiff !== 0) return activeDayDiff;

        const replyDiff = b.metrics.replies_published - a.metrics.replies_published;
        if (replyDiff !== 0) return replyDiff;

        const postDiff = b.metrics.posts_published - a.metrics.posts_published;
        if (postDiff !== 0) return postDiff;

        const downvoteDiff = a.metrics.downvotes_received - b.metrics.downvotes_received;
        if (downvoteDiff !== 0) return downvoteDiff;

        const removedPostDiff = a.metrics.removed_posts - b.metrics.removed_posts;
        if (removedPostDiff !== 0) return removedPostDiff;

        const nameDiff = a.mentor.name.localeCompare(b.mentor.name, "pt-BR");
        if (nameDiff !== 0) return nameDiff;

        return a.mentor.id.localeCompare(b.mentor.id);
      })
      .slice(0, limit);

    const items = ranked.map((item, index) => {
      const position = index + 1;
      const profile = item.mentor.psychologist_profile;

      return {
        position,
        score: item.score,
        badge: topMentorBadgeForPosition(position),
        professional: {
          id: item.mentor.id,
          name: item.mentor.name,
          avatar: item.mentor.avatar,
          headline: profile?.headline ?? null,
          crp: profile?.crp ?? null,
          rating_avg: profile?.rating_avg ?? 0,
          rating_count: profile?.rating_count ?? 0,
          profile_url: `/app/psychologist/${item.mentor.id}`,
        },
        metrics: {
          upvotes_received: item.metrics.upvotes_received,
          downvotes_received: item.metrics.downvotes_received,
          comments_received: item.metrics.comments_received,
          shares_received: item.metrics.shares_received,
          saves_received: item.metrics.saves_received,
          community_whatsapp_clicks: item.metrics.community_whatsapp_clicks,
          posts_published: item.metrics.posts_published,
          replies_published: item.metrics.replies_published,
          active_days: item.metrics.active_days,
          removed_posts: item.metrics.removed_posts,
          removed_posts_penalty: item.metrics.removed_posts_penalty,
          participation_events: item.metrics.posts_published + item.metrics.replies_published,
        },
        score_breakdown: {
          upvotes_points: item.metrics.upvotes_received * TOP_MENTOR_UPVOTE_WEIGHT,
          downvotes_penalty: item.metrics.downvotes_received * TOP_MENTOR_DOWNVOTE_WEIGHT,
          comments_points: item.metrics.comments_received * TOP_MENTOR_COMMENT_WEIGHT,
          shares_points: item.metrics.shares_received * TOP_MENTOR_SHARE_WEIGHT,
          saves_points: item.metrics.saves_received * TOP_MENTOR_SAVE_WEIGHT,
          community_whatsapp_points:
            item.metrics.community_whatsapp_clicks * TOP_MENTOR_COMMUNITY_WHATSAPP_WEIGHT,
          posts_points: item.metrics.posts_published * TOP_MENTOR_POST_WEIGHT,
          replies_points: item.metrics.replies_published * TOP_MENTOR_REPLY_WEIGHT,
          active_days_points: item.metrics.active_days * TOP_MENTOR_ACTIVE_DAY_WEIGHT,
          removed_posts_penalty: item.metrics.removed_posts_penalty,
        },
      };
    });

    return {
      data: items,
      period,
      community: community ? toCommunityResponse(community) : null,
      formula: topMentorsFormula(),
      count: items.length,
    };
  }

  async posts(data: ICommunityPostsDTO): Promise<CommunityPostsResponse | null> {
    const pagination = normalizePagination(data.q);
    const search = data.q.search?.trim();
    const community = await this.repository.findFirst({
      where: {
        slug: data.p.slug,
        deleted: false,
      },
      select: communitySelect,
    });

    if (!community) return null;

    const where: Prisma.community_postWhereInput = {
      community_id: community.id,
      deleted: false,
      status: "publicado",
      OR: postSearchWhere(search),
    };

    const [items, count] = await Promise.all([
      prisma.community_post.findMany({
        where,
        take: pagination.limit,
        skip: pagination.skip,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        select: postSelect,
      }),
      prisma.community_post.count({ where }),
    ]);
    const currentVotes = await getPostCurrentVotes(
      data.auth?.id ?? undefined,
      items.map((item) => item.id),
    );

    return {
      community: toCommunityResponse(community),
      data: items.map((item) => toPostResponse(item, currentVotes.get(item.id) ?? null)),
      page: pagination.page,
      pages: Math.ceil(count / pagination.limit),
      count,
    };
  }

  async createPost(data: ICommunityCreatePostDTO): Promise<CommunityPostDTO | null> {
    const community = await this.repository.findFirst({
      where: {
        slug: data.p.slug,
        deleted: false,
      },
      select: {
        id: true,
      },
    });

    if (!community) return null;

    const isPsychologist = data.auth.role === "psicologo";
    const post = await prisma.community_post.create({
      data: {
        community_id: community.id,
        author_id: data.auth.id!,
        title: data.b.title.trim(),
        content: data.b.content.trim(),
        anonymous: isPsychologist ? false : data.b.anonymous === true,
        status: "publicado",
      },
      select: postSelect,
    });

    return toPostResponse(post);
  }

  async follow(data: ICommunityMembershipDTO): Promise<CommunityMembershipResponse | null> {
    const community = await this.repository.findFirst({
      where: {
        slug: data.p.slug,
        deleted: false,
      },
      select: communitySelect,
    });

    if (!community) return null;

    const existing = await prisma.community_member.findUnique({
      where: {
        community_id_user_id: {
          community_id: community.id,
          user_id: data.auth.id!,
        },
      },
      select: {
        deleted: true,
      },
    });

    const membership = await prisma.$transaction(async (transaction) => {
      const item = existing
        ? await transaction.community_member.update({
            where: {
              community_id_user_id: {
                community_id: community.id,
                user_id: data.auth.id!,
              },
            },
            data: {
              deleted: false,
              deletedAt: null,
            },
            select: {
              createdAt: true,
            },
          })
        : await transaction.community_member.create({
            data: {
              community_id: community.id,
              user_id: data.auth.id!,
            },
            select: {
              createdAt: true,
            },
          });

      if (!existing || existing.deleted) {
        await transaction.community.update({
          where: {
            id: community.id,
          },
          data: {
            members_count: {
              increment: 1,
            },
          },
        });
      }

      return item;
    });

    const postsCount = await prisma.community_post.count({
      where: {
        community_id: community.id,
        deleted: false,
        status: "publicado",
      },
    });
    const updatedCommunity = await this.repository.findUniqueOrThrow({
      where: {
        id: community.id,
      },
      select: communitySelect,
    });
    const detail = toCommunityDetailResponse(updatedCommunity, postsCount, membership.createdAt);

    return {
      community: detail.community,
      following: true,
    };
  }

  async unfollow(data: ICommunityMembershipDTO): Promise<CommunityMembershipResponse | null> {
    const community = await this.repository.findFirst({
      where: {
        slug: data.p.slug,
        deleted: false,
      },
      select: communitySelect,
    });

    if (!community) return null;

    const existing = await prisma.community_member.findUnique({
      where: {
        community_id_user_id: {
          community_id: community.id,
          user_id: data.auth.id!,
        },
      },
      select: {
        deleted: true,
      },
    });

    if (existing && !existing.deleted) {
      await prisma.$transaction([
        prisma.community_member.update({
          where: {
            community_id_user_id: {
              community_id: community.id,
              user_id: data.auth.id!,
            },
          },
          data: {
            deleted: true,
            deletedAt: new Date(),
          },
        }),
        prisma.community.update({
          where: {
            id: community.id,
          },
          data: {
            members_count: {
              decrement: community.members_count > 0 ? 1 : 0,
            },
          },
        }),
      ]);
    }

    const postsCount = await prisma.community_post.count({
      where: {
        community_id: community.id,
        deleted: false,
        status: "publicado",
      },
    });
    const updatedCommunity = await this.repository.findUniqueOrThrow({
      where: {
        id: community.id,
      },
      select: communitySelect,
    });
    const detail = toCommunityDetailResponse(updatedCommunity, postsCount, null);

    return {
      community: detail.community,
      following: false,
    };
  }

  async suggest(data: ICommunitySuggestionDTO) {
    const suggestion = await prisma.community_suggestion.create({
      data: {
        user_id: data.auth.id!,
        theme: data.b.theme.trim(),
        status: "pendente",
      },
      select: {
        id: true,
        theme: true,
        status: true,
        createdAt: true,
      },
    });

    return {
      id: suggestion.id,
      theme: suggestion.theme,
      status: suggestion.status,
      created_at: suggestion.createdAt,
    };
  }
}
