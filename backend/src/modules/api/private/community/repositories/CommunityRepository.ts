import type { Prisma } from "@/external/generated/prisma/client";
import prisma, { type ORM } from "@/infra/database/prisma";
import { activeProfessionalEntitlementWhere } from "@/utils/subscription-entitlement";
import type {
  CommunityAuthorDTO,
  CommunityDTO,
  CommunityFeedResponse,
  CommunityIndexResponse,
  CommunityPostDTO,
  CommunityPostsResponse,
  ICommunityFeedDTO,
  ICommunityIndexDTO,
  ICommunityPostsDTO,
  ICommunitySuggestionDTO,
} from "../DTOs/ICommunityDTO";
import type { ICommunityRepository } from "./interfaces/ICommunityRepository";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

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
      content: true,
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

const buildWhatsappUrl = (value?: string | null) => {
  const digits = String(value ?? "").replace(/\D/g, "");
  if (digits.length < 8) return null;

  return `https://wa.me/${digits}?text=${encodeURIComponent(CONTACT_MESSAGE)}`;
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

const normalizeScope = (value?: string | null) => {
  return value === "following" ? "following" : "all";
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
): CommunityAuthorDTO => {
  const profile = author.psychologist_profile;
  const isPsychologist = author.role === "psicologo";
  const shouldMaskAuthor = !isPsychologist && anonymous;

  return {
    id: author.id,
    name: shouldMaskAuthor ? "Membro Anônimo" : author.name,
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
    content: reply.content,
    upvotes_count: reply.upvotes_count,
    created_at: reply.createdAt,
    author,
  };
};

const toPostResponse = (item: PostResult): CommunityPostDTO => {
  const responseCommunity = toCommunityResponse(item.community);
  const anonymous = item.author.role !== "psicologo" && item.anonymous;
  const author = toAuthorResponse(item.author, item.upvotes_count, anonymous);
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
    const where: Prisma.communityWhereInput = {
      deleted: false,
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

    const [items, count, categories] = await Promise.all([
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
    ]);

    return {
      data: items.map(toCommunityResponse),
      categories: categories
        .map((item) => item.category?.trim())
        .filter((item): item is string => Boolean(item)),
      page: pagination.page,
      pages: Math.ceil(count / pagination.limit),
      count,
    };
  }

  async feed(data: ICommunityFeedDTO): Promise<CommunityFeedResponse> {
    const pagination = normalizePagination(data.q);
    const search = data.q.search?.trim();
    const communitySlug = data.q.community?.trim() || null;
    const scope = normalizeScope(data.q.scope);

    if (scope === "following") {
      return {
        data: [],
        page: pagination.page,
        pages: 0,
        count: 0,
        scope,
        community_slug: communitySlug,
      };
    }

    const where: Prisma.community_postWhereInput = {
      deleted: false,
      status: "publicado",
      community: {
        deleted: false,
        slug: communitySlug || undefined,
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

    return {
      data: sortFeedPosts(items.map(toPostResponse)),
      page: pagination.page,
      pages: Math.ceil(count / pagination.limit),
      count,
      scope,
      community_slug: communitySlug,
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

    return {
      community: toCommunityResponse(community),
      data: items.map(toPostResponse),
      page: pagination.page,
      pages: Math.ceil(count / pagination.limit),
      count,
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
