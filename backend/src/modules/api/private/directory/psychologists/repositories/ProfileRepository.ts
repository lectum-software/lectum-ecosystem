import type { Prisma } from "@/external/generated/prisma/client";
import prisma from "@/infra/database/prisma";
import type {
  CommunityAuthorDTO,
  CommunityDTO,
  CommunityPostDTO,
  CommunityProfessionalReplyDTO,
} from "@/modules/api/private/community/DTOs/ICommunityDTO";
import { crpExperienceYears } from "@/utils/professional-experience";
import { activeProfessionalEntitlementWhere } from "@/utils/subscription-entitlement";
import type {
  DirectoryProfileCatalogItem,
  DirectoryPsychologistAcademicFormation,
  DirectoryPsychologistPost,
  DirectoryPsychologistPostsResponse,
  DirectoryPsychologistProfile,
  DirectoryPsychologistReviewsResponse,
  DirectoryReviewAuthor,
  IProfileListDTO,
  IProfileShowDTO,
} from "../DTOs/IProfileDTO";
import type { IProfileRepository } from "./interfaces/IProfileRepository";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;
const CONTACT_MESSAGE =
  "Olá, encontrei seu perfil na Lectum e gostaria de conversar sobre atendimento.";

const catalogSelect = {
  id: true,
  name: true,
  slug: true,
};

const communityCardSelect = {
  id: true,
  name: true,
  slug: true,
  description: true,
  category: true,
  members_count: true,
  avatar_url: true,
  visual_primary_color: true,
  visual_primary_dark_color: true,
  visual_soft_color: true,
  visual_text_color: true,
  visual_gradient_color: true,
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

const postAuthorSelect = {
  id: true,
  name: true,
  avatar: true,
  role: true,
  psychologist_profile: {
    select: professionalProfileSelect,
  },
} satisfies Prisma.userSelect;

const profilePostSelect = {
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
    select: communityCardSelect,
  },
  author: {
    select: postAuthorSelect,
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
    select: {
      id: true,
      title: true,
      content: true,
      media_url: true,
      media_type: true,
      upvotes_count: true,
      createdAt: true,
      author: {
        select: postAuthorSelect,
      },
    },
  },
} satisfies Prisma.community_postSelect;

const profileReplySelect = {
  id: true,
  title: true,
  content: true,
  media_url: true,
  media_type: true,
  upvotes_count: true,
  createdAt: true,
  post: {
    select: profilePostSelect,
  },
  author: {
    select: postAuthorSelect,
  },
} satisfies Prisma.post_replySelect;

type ProfilePostResult = Prisma.community_postGetPayload<{ select: typeof profilePostSelect }>;
type ProfileReplyResult = Prisma.post_replyGetPayload<{ select: typeof profileReplySelect }>;
type ProfileAuthorResult = ProfilePostResult["author"];
type ProfileProfessionalReplyResult = ProfilePostResult["replies"][number];
type CurrentVote = 1 | -1 | null;

const normalizeStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];

  return value.filter((item): item is string => typeof item === "string");
};

const trimToNull = (value: unknown) => {
  if (typeof value !== "string") return null;

  return value.trim() || null;
};

const hasAcademicContent = (item: DirectoryPsychologistAcademicFormation) => {
  return Boolean(item.title || item.institution || item.graduation_year);
};

const normalizeAcademicFormation = (item: unknown): DirectoryPsychologistAcademicFormation => {
  if (!item || typeof item !== "object") {
    return { title: null, institution: null, graduation_year: null };
  }

  const academic = item as Record<string, unknown>;

  return {
    title: trimToNull(academic.title),
    institution: trimToNull(academic.institution),
    graduation_year: trimToNull(academic.graduation_year),
  };
};

const normalizeAcademicFormations = (
  value: unknown,
  fallback: DirectoryPsychologistAcademicFormation,
) => {
  if (Array.isArray(value)) {
    return value.map(normalizeAcademicFormation).filter(hasAcademicContent);
  }

  return hasAcademicContent(fallback) ? [fallback] : [];
};

const currentWeekdayValue = () => {
  const weekday = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    weekday: "long",
  }).format(new Date());

  const normalized = weekday
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

  if (normalized.includes("segunda")) return "segunda";
  if (normalized.includes("terca")) return "terca";
  if (normalized.includes("quarta")) return "quarta";
  if (normalized.includes("quinta")) return "quinta";
  if (normalized.includes("sexta")) return "sexta";
  if (normalized.includes("sabado")) return "sabado";
  return "domingo";
};

const hasAvailableToday = (value: unknown) => {
  return normalizeStringArray(value).includes(currentWeekdayValue());
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

const normalizeVoteValue = (value?: number | null): CurrentVote => {
  if (value === 1 || value === -1) return value;

  return null;
};

const normalizePagination = (query: IProfileListDTO["q"] = {}) => {
  const page = Math.max(1, Number(query.page || 1));
  const limit = Math.min(MAX_LIMIT, Math.max(1, Number(query.limit || DEFAULT_LIMIT)));

  return {
    page,
    limit,
    skip: (page - 1) * limit,
  };
};

const isCatalogItem = (
  value: DirectoryProfileCatalogItem | null,
): value is DirectoryProfileCatalogItem => {
  return Boolean(value?.id && value.name && value.slug);
};

const toSafeAuthor = (name: string): DirectoryReviewAuthor => {
  const parts = name.split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return {
      initials: "P",
      name: "Paciente",
    };
  }

  const firstName = parts[0];
  const lastInitial = parts.length > 1 ? `${parts[parts.length - 1][0].toUpperCase()}.` : "";
  const initials =
    parts.length > 1
      ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
      : firstName.slice(0, 2).toUpperCase();

  return {
    initials,
    name: [firstName, lastInitial].filter(Boolean).join(" "),
  };
};

const toCommunityResponse = (item: ProfilePostResult["community"]): CommunityDTO => ({
  id: item.id,
  name: item.name,
  slug: item.slug,
  description: item.description,
  category: item.category,
  members_count: item.members_count,
  avatar_url: item.avatar_url,
  visual_primary_color: item.visual_primary_color,
  visual_primary_dark_color: item.visual_primary_dark_color,
  visual_soft_color: item.visual_soft_color,
  visual_text_color: item.visual_text_color,
  visual_gradient_color: item.visual_gradient_color,
  created_at: item.createdAt,
});

const toPostAuthorResponse = (
  author: ProfileAuthorResult,
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
    crp: isPsychologist ? (profile?.crp ?? null) : null,
    verified: isPsychologist && isProfessionalVerified(profile),
    featured_badge: isPsychologist ? mentorBadgeForScore(profile, mentorScore) : null,
    whatsapp_url: isPsychologist ? buildProfessionalWhatsappUrl(profile) : null,
  };
};

const toHighlightedProfessionalReply = (
  reply?: ProfileProfessionalReplyResult | ProfileReplyResult,
  savedReplyIds?: Set<string>,
  requireVerified = true,
): CommunityProfessionalReplyDTO | null => {
  if (!reply) return null;

  const author = toPostAuthorResponse(reply.author, reply.upvotes_count);
  if (requireVerified && !author.verified) return null;

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

const toPostResponse = (
  item: ProfilePostResult,
  currentUserVote: CurrentVote,
  saved: boolean,
  savedReplyIds?: Set<string>,
  highlightedReply?: ProfileReplyResult,
): CommunityPostDTO => {
  const anonymous = item.author.role !== "psicologo" && item.anonymous;

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
    tags: item.community.category ? [item.community.category] : [],
    featured_badge: toPostAuthorResponse(item.author, item.upvotes_count).featured_badge,
    media_url: null,
    media_type: null,
    current_user_vote: currentUserVote,
    saved,
    community: toCommunityResponse(item.community),
    author: toPostAuthorResponse(
      item.author,
      item.upvotes_count,
      anonymous,
      anonymous ? anonymousDisplayNameForPost(item.id) : undefined,
    ),
    highlighted_professional_reply:
      toHighlightedProfessionalReply(highlightedReply, savedReplyIds, false) ??
      toHighlightedProfessionalReply(item.replies[0], savedReplyIds),
  };
};

const publishedProfileWhere = (psychologistId: string): Prisma.userWhereInput => ({
  id: psychologistId,
  role: "psicologo",
  active: true,
  deleted: false,
  psychologist_profile: {
    is: {
      published: true,
      deleted: false,
    },
  },
});

export class ProfileRepository implements IProfileRepository {
  async hasPublishedProfile(psychologistId: string): Promise<boolean> {
    const profile = await prisma.user.findFirst({
      where: publishedProfileWhere(psychologistId),
      select: {
        id: true,
      },
    });

    return Boolean(profile);
  }

  async show(data: IProfileShowDTO): Promise<DirectoryPsychologistProfile | null> {
    const viewerId = data.auth?.id;
    const viewerRelationWhere = viewerId
      ? {
          user_id: viewerId,
          deleted: false,
        }
      : {
          id: "__anonymous__",
        };

    const item = await prisma.user.findFirst({
      where: publishedProfileWhere(data.p.id),
      select: {
        id: true,
        name: true,
        avatar: true,
        favorited_by_patients: {
          where: viewerRelationWhere,
          select: {
            id: true,
          },
          take: 1,
        },
        followed_by_patients: {
          where: viewerRelationWhere,
          select: {
            id: true,
          },
          take: 1,
        },
        psychologist_profile: {
          select: {
            headline: true,
            bio: true,
            cover_image_url: true,
            video_url: true,
            video_cover_url: true,
            crp: true,
            crp_registration_date: true,
            cfp_verified_at: true,
            gender: true,
            discount_first_session: true,
            social_value: true,
            accepts_insurance: true,
            show_experience_tag: true,
            available_days: true,
            modality: true,
            languages: true,
            target_audience: true,
            academic_title: true,
            academic_institution: true,
            academic_graduation_year: true,
            academic_formations: true,
            professional_address_city: true,
            professional_address_state: true,
            rating_avg: true,
            rating_count: true,
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
        psychologist_specialties: {
          where: {
            deleted: false,
            specialty: {
              active: true,
              deleted: false,
            },
          },
          select: {
            specialty: {
              select: catalogSelect,
            },
          },
        },
        psychologist_services: {
          where: {
            deleted: false,
            service: {
              active: true,
              deleted: false,
            },
          },
          select: {
            service: {
              select: catalogSelect,
            },
          },
        },
        psychologist_approaches: {
          where: {
            deleted: false,
            approach: {
              active: true,
              deleted: false,
            },
          },
          select: {
            approach: {
              select: catalogSelect,
            },
          },
        },
      },
    });

    const profile = item?.psychologist_profile;
    if (!item || !profile) return null;

    return {
      id: item.id,
      name: item.name,
      avatar: item.avatar,
      headline: profile.headline,
      bio: profile.bio,
      cover_image_url: profile.cover_image_url,
      video_url: profile.video_url,
      video_cover_url: profile.video_cover_url,
      crp: profile.crp,
      gender: profile.gender,
      modality: profile.modality,
      languages: normalizeStringArray(profile.languages),
      target_audience: normalizeStringArray(profile.target_audience),
      address_city: profile.professional_address_city,
      address_state: profile.professional_address_state,
      academic_formations: normalizeAcademicFormations(profile.academic_formations, {
        title: trimToNull(profile.academic_title),
        institution: trimToNull(profile.academic_institution),
        graduation_year: trimToNull(profile.academic_graduation_year),
      }),
      rating_avg: profile.rating_avg,
      rating_count: profile.rating_count,
      verified: profile.subscriptions.length > 0,
      available_today: hasAvailableToday(profile.available_days),
      formation_years: crpExperienceYears(profile.crp_registration_date),
      discount_first_session: profile.discount_first_session,
      social_value: profile.social_value,
      accepts_insurance: profile.accepts_insurance,
      show_experience_tag: profile.show_experience_tag,
      whatsapp_url: buildWhatsappUrl(profile.whatsapp),
      favorited: item.favorited_by_patients.length > 0,
      followed: item.followed_by_patients.length > 0,
      whatsapp_available: Boolean(profile.whatsapp),
      specialties: item.psychologist_specialties
        .map(({ specialty }) => specialty)
        .filter(isCatalogItem),
      services: item.psychologist_services.map(({ service }) => service).filter(isCatalogItem),
      approaches: item.psychologist_approaches
        .map(({ approach }) => approach)
        .filter(isCatalogItem),
    };
  }

  async posts(data: IProfileListDTO): Promise<DirectoryPsychologistPostsResponse> {
    const pagination = normalizePagination(data.q);
    const postsWhere: Prisma.community_postWhereInput = {
      author_id: data.p.id,
      deleted: false,
      status: "publicado",
      community: {
        deleted: false,
      },
    };
    const repliesWhere: Prisma.post_replyWhereInput = {
      author_id: data.p.id,
      deleted: false,
      post: {
        deleted: false,
        status: "publicado",
        community: {
          deleted: false,
        },
      },
    };
    const take = pagination.skip + pagination.limit;

    const [posts, postsCount, replies, repliesCount] = await Promise.all([
      prisma.community_post.findMany({
        where: postsWhere,
        take,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        select: profilePostSelect,
      }),
      prisma.community_post.count({ where: postsWhere }),
      prisma.post_reply.findMany({
        where: repliesWhere,
        take,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        select: profileReplySelect,
      }),
      prisma.post_reply.count({ where: repliesWhere }),
    ]);
    const count = postsCount + repliesCount;
    const mergedItems = [
      ...posts.map((post) => ({ createdAt: post.createdAt, kind: "post" as const, post })),
      ...replies.map((reply) => ({ createdAt: reply.createdAt, kind: "reply" as const, reply })),
    ]
      .sort((a, b) => {
        const byDate = b.createdAt.getTime() - a.createdAt.getTime();
        if (byDate !== 0) return byDate;

        const aId = a.kind === "post" ? a.post.id : a.reply.id;
        const bId = b.kind === "post" ? b.post.id : b.reply.id;

        return bId.localeCompare(aId);
      })
      .slice(pagination.skip, pagination.skip + pagination.limit);
    const postIds = Array.from(
      new Set(
        mergedItems.map((item) => (item.kind === "post" ? item.post.id : item.reply.post.id)),
      ),
    );
    const replyIds = mergedItems.flatMap((item) => (item.kind === "reply" ? [item.reply.id] : []));
    const authId = data.auth?.id;
    const [votes, saves, replySaves] = authId
      ? await Promise.all([
          postIds.length
            ? prisma.post_vote.findMany({
                where: {
                  deleted: false,
                  post_id: { in: postIds },
                  user_id: authId,
                },
                select: {
                  post_id: true,
                  value: true,
                },
              })
            : Promise.resolve([]),
          postIds.length
            ? prisma.post_save.findMany({
                where: {
                  deleted: false,
                  post_id: { in: postIds },
                  user_id: authId,
                },
                select: {
                  post_id: true,
                },
              })
            : Promise.resolve([]),
          replyIds.length
            ? prisma.post_reply_save.findMany({
                where: {
                  deleted: false,
                  reply_id: { in: replyIds },
                  user_id: authId,
                },
                select: {
                  reply_id: true,
                },
              })
            : Promise.resolve([]),
        ])
      : [[], [], []];
    const voteByPostId = new Map(
      votes.map((vote) => [vote.post_id, normalizeVoteValue(vote.value)]),
    );
    const savedPostIds = new Set(saves.map((save) => save.post_id));
    const savedReplyIds = new Set(replySaves.map((save) => save.reply_id));

    return {
      data: mergedItems.map<DirectoryPsychologistPost>((item) => {
        if (item.kind === "post") {
          return {
            ...toPostResponse(
              item.post,
              voteByPostId.get(item.post.id) ?? null,
              savedPostIds.has(item.post.id),
              savedReplyIds,
            ),
            contribution_type: "post",
          };
        }

        return {
          ...toPostResponse(
            item.reply.post,
            voteByPostId.get(item.reply.post.id) ?? null,
            savedPostIds.has(item.reply.post.id),
            savedReplyIds,
            item.reply,
          ),
          contribution_type: "reply",
        };
      }),
      page: pagination.page,
      pages: Math.ceil(count / pagination.limit),
      count,
    };
  }

  async reviews(data: IProfileListDTO): Promise<DirectoryPsychologistReviewsResponse> {
    const pagination = normalizePagination(data.q);
    const where: Prisma.professional_reviewWhereInput = {
      psychologist_id: data.p.id,
      deleted: false,
      status: "publicada",
      author: {
        active: true,
        deleted: false,
      },
    };

    const [items, count, profile, distributionRows] = await Promise.all([
      prisma.professional_review.findMany({
        where,
        take: pagination.limit,
        skip: pagination.skip,
        orderBy: {
          createdAt: "desc",
        },
        select: {
          id: true,
          rating: true,
          comment: true,
          response: true,
          responded_at: true,
          createdAt: true,
          author: {
            select: {
              name: true,
            },
          },
        },
      }),
      prisma.professional_review.count({ where }),
      prisma.psychologist_profile.findFirst({
        where: {
          user_id: data.p.id,
          deleted: false,
          published: true,
        },
        select: {
          rating_avg: true,
          rating_count: true,
        },
      }),
      prisma.professional_review.groupBy({
        by: ["rating"],
        where,
        _count: {
          rating: true,
        },
      }),
    ]);

    const distribution = {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
    } satisfies Record<1 | 2 | 3 | 4 | 5, number>;

    for (const row of distributionRows) {
      if (row.rating >= 1 && row.rating <= 5) {
        distribution[row.rating as 1 | 2 | 3 | 4 | 5] = row._count.rating;
      }
    }

    return {
      data: items.map((item) => ({
        id: item.id,
        rating: item.rating,
        comment: item.comment,
        response: item.response,
        responded_at: item.responded_at,
        created_at: item.createdAt,
        author: toSafeAuthor(item.author.name),
      })),
      summary: {
        rating_avg: profile?.rating_avg ?? 0,
        rating_count: profile?.rating_count ?? count,
        distribution,
      },
      page: pagination.page,
      pages: Math.ceil(count / pagination.limit),
      count,
    };
  }
}
