import type { Prisma } from "@/external/generated/prisma/client";
import prisma, { type ORM } from "@/infra/database/prisma";
import { activeProfessionalEntitlementWhere } from "@/utils/subscription-entitlement";
import type {
  CommunityDTO,
  CommunityFeedResponse,
  CommunityIndexResponse,
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

const postSelect = {
  id: true,
  title: true,
  content: true,
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
    select: {
      id: true,
      name: true,
      avatar: true,
      role: true,
      psychologist_profile: {
        select: {
          gender: true,
          whatsapp: true,
          subscriptions: {
            where: activeProfessionalEntitlementWhere(),
            select: {
              id: true,
            },
            take: 1,
          },
        },
      },
    },
  },
} satisfies Prisma.community_postSelect;

type PostResult = Prisma.community_postGetPayload<{ select: typeof postSelect }>;

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

const authorTypeLabel = (role?: string | null, gender?: string | null) => {
  if (role === "psicologo") {
    const normalizedGender = String(gender ?? "")
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .toLowerCase();

    if (normalizedGender.includes("feminino")) return "Psicóloga";
    if (normalizedGender.includes("masculino")) return "Psicólogo";

    return "Psicólogo(a)";
  }

  return "Membro Anônimo";
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
      author: {
        name: {
          contains: search,
          mode: "insensitive",
        },
      },
    },
  ];
};

const toPostResponse = (item: PostResult) => {
  const responseCommunity = toCommunityResponse(item.community);
  const profile = item.author.psychologist_profile;
  const isPsychologist = item.author.role === "psicologo";
  const verified = Boolean(profile?.subscriptions.length);

  return {
    id: item.id,
    title: item.title,
    content: item.content,
    status: item.status,
    upvotes_count: item.upvotes_count,
    downvotes_count: item.downvotes_count,
    replies_count: item.replies_count,
    saves_count: item.saves_count,
    created_at: item.createdAt,
    tags: responseCommunity.category ? [responseCommunity.category] : [],
    featured_badge: verified && item.upvotes_count >= 60 ? "TOP #1 MENTOR" : null,
    media_url: null,
    media_type: null,
    community: responseCommunity,
    author: {
      id: item.author.id,
      name: isPsychologist ? item.author.name : "Membro Anônimo",
      avatar: isPsychologist ? item.author.avatar : null,
      role: item.author.role,
      type_label: authorTypeLabel(item.author.role, profile?.gender),
      verified,
      whatsapp_url: isPsychologist ? buildWhatsappUrl(profile?.whatsapp) : null,
    },
  };
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
      data: items.map(toPostResponse),
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
