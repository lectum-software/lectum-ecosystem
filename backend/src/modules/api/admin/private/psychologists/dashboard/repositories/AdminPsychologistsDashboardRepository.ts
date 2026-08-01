import type { Prisma } from "@/external/generated/prisma/client";
import prisma from "@/infra/database/prisma";
import { PSYCHOLOGIST_SIGNUP_ANALYTICS_IDENTITY_TYPE } from "@/modules/api/public/analytics/helpers/signup-identity";
import { activeProfessionalEntitlementWhere } from "@/utils/subscription-entitlement";
import type {
  AdminPsychologistsDashboardDateRange,
  AdminPsychologistsDashboardDirectoryFilterItem,
} from "../DTOs/IAdminPsychologistsDashboardDTO";
import type {
  AdminPsychologistContentAttentionRecord,
  IAdminPsychologistsDashboardRepository,
} from "./interfaces/IAdminPsychologistsDashboardRepository";

const QUALIFIED_VIDEO_WATCH_SECONDS = 3;

const eventCreatedAtWhere = (range: AdminPsychologistsDashboardDateRange) => ({
  gte: range.start,
  lte: range.end,
});

const SEARCH_RESULT_SOURCE = "search_result";

const countRecordsFromGroups = (
  groups: Array<{ _count: { _all: number }; psychologist_id: string }>,
) =>
  groups.map((group) => ({
    count: group._count._all,
    psychologist_id: group.psychologist_id,
  }));

const sumCountsByPsychologistId = (records: Array<{ count: number; psychologist_id: string }>) => {
  const counts = new Map<string, number>();

  for (const record of records) {
    counts.set(record.psychologist_id, (counts.get(record.psychologist_id) ?? 0) + record.count);
  }

  return [...counts.entries()].map(([psychologist_id, count]) => ({
    count,
    psychologist_id,
  }));
};

const catalogSelect = {
  id: true,
  name: true,
  slug: true,
} satisfies Prisma.specialtySelect;

const directoryCategorySelect = {
  id: true,
  name: true,
  position: true,
  slug: true,
} satisfies Prisma.specialty_categorySelect;

const directorySpecialtySelect = {
  category: {
    select: directoryCategorySelect,
  },
  category_id: true,
  id: true,
  name: true,
  position: true,
  slug: true,
} satisfies Prisma.specialtySelect;

const directoryCatalogSelect = {
  id: true,
  name: true,
  position: true,
  slug: true,
};

const STATIC_MODALITY_FILTERS = [
  { id: "online", label: "Online" },
  { id: "presencial", label: "Presencial" },
] as const;

const STATIC_GENDER_FILTERS = [
  { id: "feminino", label: "Feminino" },
  { id: "masculino", label: "Masculino" },
  { id: "nao_binario", label: "Não binário" },
  { id: "outro", label: "Outro" },
] as const;

const STATIC_RACE_COLOR_FILTERS = [
  { id: "branca", label: "Branca" },
  { id: "preta", label: "Preta" },
  { id: "parda", label: "Parda" },
  { id: "amarela", label: "Amarela" },
  { id: "indigena", label: "Indígena" },
] as const;

const STATIC_RELIGION_FILTERS = [
  { id: "catolica", label: "Católica" },
  { id: "evangelica", label: "Evangélica" },
  { id: "espirita", label: "Espírita" },
  { id: "umbanda_candomble", label: "Umbanda/Candomblé" },
  { id: "judaica", label: "Judaica" },
  { id: "islamica", label: "Islâmica" },
  { id: "budista", label: "Budista" },
  { id: "sem_religiao", label: "Sem religião" },
  { id: "ateu_agnostico", label: "Ateu/Agnóstico" },
  { id: "outra", label: "Outra" },
] as const;

const STATIC_STATE_FILTERS = [
  { id: "AC", label: "Acre" },
  { id: "AL", label: "Alagoas" },
  { id: "AP", label: "Amapá" },
  { id: "AM", label: "Amazonas" },
  { id: "BA", label: "Bahia" },
  { id: "CE", label: "Ceará" },
  { id: "DF", label: "Distrito Federal" },
  { id: "ES", label: "Espírito Santo" },
  { id: "GO", label: "Goiás" },
  { id: "MA", label: "Maranhão" },
  { id: "MT", label: "Mato Grosso" },
  { id: "MS", label: "Mato Grosso do Sul" },
  { id: "MG", label: "Minas Gerais" },
  { id: "PA", label: "Pará" },
  { id: "PB", label: "Paraíba" },
  { id: "PR", label: "Paraná" },
  { id: "PE", label: "Pernambuco" },
  { id: "PI", label: "Piauí" },
  { id: "RJ", label: "Rio de Janeiro" },
  { id: "RN", label: "Rio Grande do Norte" },
  { id: "RS", label: "Rio Grande do Sul" },
  { id: "RO", label: "Rondônia" },
  { id: "RR", label: "Roraima" },
  { id: "SC", label: "Santa Catarina" },
  { id: "SP", label: "São Paulo" },
  { id: "SE", label: "Sergipe" },
  { id: "TO", label: "Tocantins" },
] as const;

const STATIC_FEATURE_FILTERS = [
  { id: "available_today", label: "Disponível hoje" },
  { id: "verified", label: "Somente verificados" },
  { id: "more_experienced", label: "Mais experientes" },
  { id: "discount_first_session", label: "Desconto na 1ª sessão" },
  { id: "accepts_insurance", label: "Aceita convênios" },
  { id: "social_value", label: "Valor social" },
] as const;

const catalogOrderBy = () => [{ position: "asc" as const }, { name: "asc" as const }];

const toDirectoryFilterItem = (item: {
  id: string;
  name: string;
  position: number | null;
  slug: string;
}): AdminPsychologistsDashboardDirectoryFilterItem => ({
  id: item.id,
  label: item.name,
  position: item.position,
  slug: item.slug,
});

const toStaticDirectoryFilterItem = (
  item: { id: string; label: string },
  position: number,
): AdminPsychologistsDashboardDirectoryFilterItem => ({
  id: item.id,
  label: item.label,
  position,
  slug: item.id,
});

const profileBaseSelect = {
  accepts_insurance: true,
  academic_formations: true,
  academic_graduation_year: true,
  academic_institution: true,
  academic_title: true,
  available_days: true,
  bio: true,
  cfp_verified_at: true,
  cover_image_url: true,
  cpf: true,
  createdAt: true,
  crp: true,
  crp_registration_date: true,
  crp_status: true,
  discount_first_session: true,
  gender: true,
  headline: true,
  id: true,
  languages: true,
  modality: true,
  professional_address_city: true,
  professional_address_state: true,
  published: true,
  race_color: true,
  rating_avg: true,
  rating_count: true,
  religion: true,
  show_experience_tag: true,
  social_value: true,
  target_audience: true,
  updatedAt: true,
  user_id: true,
  video_url: true,
  whatsapp: true,
  user: {
    select: {
      avatar: true,
      createdAt: true,
      email: true,
      id: true,
      name: true,
      provider: true,
      psychologist_approaches: {
        where: {
          approach: {
            active: true,
            deleted: false,
          },
          deleted: false,
        },
        select: {
          approach: {
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
    },
  },
} satisfies Prisma.psychologist_profileSelect;

const preSignupConversionUserSelect = {
  createdAt: true,
  id: true,
  role: true,
} satisfies Prisma.userSelect;

const preSignupConversionPageViewSelect = {
  normalized_path: true,
  occurred_at: true,
  page_kind: true,
  path: true,
  session_id: true,
  user: {
    select: preSignupConversionUserSelect,
  },
  user_id: true,
  visitor_id: true,
} satisfies Prisma.page_view_eventSelect;

const preSignupConversionSessionSelect = {
  first_seen_at: true,
  last_seen_at: true,
  session_id: true,
  user: {
    select: preSignupConversionUserSelect,
  },
  user_id: true,
  visitor_id: true,
} satisfies Prisma.visitor_sessionSelect;

const signupAnalyticsIdentitySelect = {
  createdAt: true,
  data: true,
  user_id: true,
} satisfies Prisma.user_backgroundSelect;

const publicDirectoryWhere = {
  deleted: false,
  published: true,
  video_url: {
    not: null,
  },
  modality: {
    not: null,
  },
  gender: {
    not: null,
  },
  cpf: {
    not: null,
  },
  crp: {
    not: null,
  },
  NOT: [
    {
      video_url: "",
    },
    {
      modality: "",
    },
    {
      gender: "",
    },
    {
      cpf: "",
    },
    {
      crp: "",
    },
    {
      professional_address_city: "",
    },
    {
      professional_address_state: "",
    },
  ],
  professional_address_state: {
    not: null,
  },
  professional_address_city: {
    not: null,
  },
  target_audience: {
    not: [],
  },
  user: {
    active: true,
    deleted: false,
    role: "psicologo",
    psychologist_approaches: {
      some: {
        approach: {
          active: true,
          deleted: false,
        },
        deleted: false,
      },
    },
    psychologist_services: {
      some: {
        deleted: false,
        service: {
          active: true,
          deleted: false,
        },
      },
    },
    psychologist_specialties: {
      some: {
        deleted: false,
        specialty: {
          active: true,
          deleted: false,
        },
      },
    },
  },
} satisfies Prisma.psychologist_profileWhereInput;

export class AdminPsychologistsDashboardRepository
  implements IAdminPsychologistsDashboardRepository
{
  async listDirectoryFilters() {
    const [specialties, services, approaches, languages, targetAudiences] = await Promise.all([
      prisma.specialty.findMany({
        orderBy: [{ category: { position: "asc" } }, { position: "asc" }, { name: "asc" }],
        select: directorySpecialtySelect,
        where: {
          active: true,
          category: {
            active: true,
            deleted: false,
          },
          deleted: false,
        },
      }),
      prisma.service.findMany({
        orderBy: catalogOrderBy(),
        select: directoryCatalogSelect,
        where: {
          active: true,
          deleted: false,
        },
      }),
      prisma.approach.findMany({
        orderBy: catalogOrderBy(),
        select: directoryCatalogSelect,
        where: {
          active: true,
          deleted: false,
        },
      }),
      prisma.profile_catalog_option.findMany({
        orderBy: catalogOrderBy(),
        select: directoryCatalogSelect,
        where: {
          active: true,
          deleted: false,
          type: "language",
        },
      }),
      prisma.profile_catalog_option.findMany({
        orderBy: catalogOrderBy(),
        select: directoryCatalogSelect,
        where: {
          active: true,
          deleted: false,
          type: "target_audience",
        },
      }),
    ]);

    return {
      approaches: approaches.map(toDirectoryFilterItem),
      features: STATIC_FEATURE_FILTERS.map(toStaticDirectoryFilterItem),
      genders: STATIC_GENDER_FILTERS.map(toStaticDirectoryFilterItem),
      languages: languages.map(toDirectoryFilterItem),
      modalities: STATIC_MODALITY_FILTERS.map(toStaticDirectoryFilterItem),
      race_colors: STATIC_RACE_COLOR_FILTERS.map(toStaticDirectoryFilterItem),
      religions: STATIC_RELIGION_FILTERS.map(toStaticDirectoryFilterItem),
      services: services.map(toDirectoryFilterItem),
      specialties: specialties.map((item) => ({
        ...toDirectoryFilterItem(item),
        category_id: item.category_id,
        category_label: item.category?.name ?? null,
      })),
      states: STATIC_STATE_FILTERS.map(toStaticDirectoryFilterItem),
      target_audiences: targetAudiences.map(toDirectoryFilterItem),
    };
  }

  async listPsychologistProfiles() {
    return prisma.psychologist_profile.findMany({
      orderBy: {
        createdAt: "desc",
      },
      where: {
        deleted: false,
        user: {
          active: true,
          deleted: false,
          role: "psicologo",
        },
      },
      select: {
        ...profileBaseSelect,
        subscriptions: {
          orderBy: {
            createdAt: "desc",
          },
          where: {
            deleted: false,
            plan: {
              active: true,
              deleted: false,
            },
          },
          select: {
            createdAt: true,
            current_period_end: true,
            gateway: true,
            gateway_subscription_id: true,
            grant_started_at: true,
            id: true,
            plan: {
              select: {
                name: true,
                price_cents: true,
                slug: true,
              },
            },
            source: true,
            status: true,
            updatedAt: true,
          },
        },
      },
    });
  }

  async listPublicRankingCandidates() {
    return prisma.psychologist_profile.findMany({
      orderBy: {
        createdAt: "desc",
      },
      where: publicDirectoryWhere,
      select: {
        ...profileBaseSelect,
        subscriptions: {
          where: activeProfessionalEntitlementWhere(),
          orderBy: [{ grant_started_at: "asc" }, { createdAt: "asc" }],
          select: {
            createdAt: true,
            grant_started_at: true,
            id: true,
            source: true,
          },
          take: 1,
        },
      },
    });
  }

  async listPlatformPageViews(range: AdminPsychologistsDashboardDateRange) {
    return prisma.page_view_event.findMany({
      orderBy: {
        occurred_at: "asc",
      },
      select: {
        duration_seconds: true,
        normalized_path: true,
        occurred_at: true,
        page_kind: true,
        path: true,
        session_id: true,
        user_id: true,
      },
      where: {
        deleted: false,
        occurred_at: eventCreatedAtWhere(range),
        user_id: {
          not: null,
        },
        user: {
          active: true,
          deleted: false,
          role: "psicologo",
        },
      },
    });
  }

  async listPlatformSessions(range: AdminPsychologistsDashboardDateRange) {
    return prisma.visitor_session.findMany({
      orderBy: {
        last_seen_at: "asc",
      },
      select: {
        device_type: true,
        os: true,
        session_id: true,
        user_id: true,
      },
      where: {
        deleted: false,
        first_seen_at: {
          lte: range.end,
        },
        last_seen_at: {
          gte: range.start,
        },
        user_id: {
          not: null,
        },
        user: {
          active: true,
          deleted: false,
          role: "psicologo",
        },
      },
    });
  }

  async listPreSignupConversionLinkedPageViews(psychologistIds: string[]) {
    const uniquePsychologistIds = [...new Set(psychologistIds.filter(Boolean))];
    if (uniquePsychologistIds.length === 0) return [];

    return prisma.page_view_event.findMany({
      orderBy: {
        occurred_at: "asc",
      },
      select: preSignupConversionPageViewSelect,
      where: {
        deleted: false,
        user_id: {
          in: uniquePsychologistIds,
        },
        user: {
          active: true,
          deleted: false,
          role: "psicologo",
        },
      },
    });
  }

  async listPreSignupConversionLinkedSessions(psychologistIds: string[]) {
    const uniquePsychologistIds = [...new Set(psychologistIds.filter(Boolean))];
    if (uniquePsychologistIds.length === 0) return [];

    return prisma.visitor_session.findMany({
      orderBy: {
        first_seen_at: "asc",
      },
      select: preSignupConversionSessionSelect,
      where: {
        deleted: false,
        user_id: {
          in: uniquePsychologistIds,
        },
        user: {
          active: true,
          deleted: false,
          role: "psicologo",
        },
      },
    });
  }

  async listPreSignupConversionPageViewsByVisitorIds(
    visitorIds: string[],
    psychologistIds: string[],
    maxOccurredAt: Date | null,
  ) {
    const uniqueVisitorIds = [...new Set(visitorIds.filter(Boolean))];
    const uniquePsychologistIds = [...new Set(psychologistIds.filter(Boolean))];
    if (uniqueVisitorIds.length === 0 || !maxOccurredAt) return [];

    return prisma.page_view_event.findMany({
      orderBy: {
        occurred_at: "asc",
      },
      select: preSignupConversionPageViewSelect,
      where: {
        deleted: false,
        occurred_at: {
          lte: maxOccurredAt,
        },
        visitor_id: {
          in: uniqueVisitorIds,
        },
        OR: [
          {
            user_id: null,
          },
          {
            user_id: {
              in: uniquePsychologistIds,
            },
            user: {
              active: true,
              deleted: false,
              role: "psicologo",
            },
          },
        ],
      },
    });
  }

  async listPreSignupConversionSessionsByVisitorIds(
    visitorIds: string[],
    psychologistIds: string[],
    maxFirstSeenAt: Date | null,
  ) {
    const uniqueVisitorIds = [...new Set(visitorIds.filter(Boolean))];
    const uniquePsychologistIds = [...new Set(psychologistIds.filter(Boolean))];
    if (uniqueVisitorIds.length === 0 || !maxFirstSeenAt) return [];

    return prisma.visitor_session.findMany({
      orderBy: {
        first_seen_at: "asc",
      },
      select: preSignupConversionSessionSelect,
      where: {
        deleted: false,
        first_seen_at: {
          lte: maxFirstSeenAt,
        },
        visitor_id: {
          in: uniqueVisitorIds,
        },
        OR: [
          {
            user_id: null,
          },
          {
            user_id: {
              in: uniquePsychologistIds,
            },
            user: {
              active: true,
              deleted: false,
              role: "psicologo",
            },
          },
        ],
      },
    });
  }

  async listPreSignupConversionSignupIdentities(psychologistIds: string[]) {
    const uniquePsychologistIds = [...new Set(psychologistIds.filter(Boolean))];
    if (uniquePsychologistIds.length === 0) return [];

    return prisma.user_background.findMany({
      orderBy: {
        createdAt: "asc",
      },
      select: signupAnalyticsIdentitySelect,
      where: {
        deleted: false,
        type: PSYCHOLOGIST_SIGNUP_ANALYTICS_IDENTITY_TYPE,
        user_id: {
          in: uniquePsychologistIds,
        },
        user: {
          active: true,
          deleted: false,
          role: "psicologo",
        },
      },
    });
  }

  async listPlatformPwaInstallActions(range: AdminPsychologistsDashboardDateRange) {
    return prisma.important_action_event.findMany({
      orderBy: {
        occurred_at: "asc",
      },
      select: {
        occurred_at: true,
        user_id: true,
      },
      where: {
        action_type: "pwa_installed",
        deleted: false,
        occurred_at: eventCreatedAtWhere(range),
        user_id: {
          not: null,
        },
        user: {
          active: true,
          deleted: false,
          role: "psicologo",
        },
      },
    });
  }

  async listDirectoryFilterSearchActions(range: AdminPsychologistsDashboardDateRange) {
    return prisma.important_action_event.findMany({
      orderBy: {
        occurred_at: "asc",
      },
      select: {
        target_id: true,
        target_type: true,
      },
      where: {
        action_type: "psychologist_directory_filter_search",
        deleted: false,
        occurred_at: eventCreatedAtWhere(range),
      },
    });
  }

  async listPublicProfilePageViews(
    range: AdminPsychologistsDashboardDateRange,
    psychologistIds: string[],
  ) {
    const uniquePsychologistIds = [...new Set(psychologistIds.filter(Boolean))];
    if (uniquePsychologistIds.length === 0) return [];

    return prisma.page_view_event.findMany({
      orderBy: {
        occurred_at: "asc",
      },
      select: {
        occurred_at: true,
        session_id: true,
        target_id: true,
        traffic_source: true,
      },
      where: {
        deleted: false,
        occurred_at: eventCreatedAtWhere(range),
        page_kind: "psychologist_profile",
        target_id: {
          in: uniquePsychologistIds,
        },
        target_type: "psychologist",
      },
    });
  }

  async listWhatsappTrafficActions(range: AdminPsychologistsDashboardDateRange) {
    return prisma.important_action_event.findMany({
      orderBy: {
        occurred_at: "asc",
      },
      select: {
        action_type: true,
        occurred_at: true,
        page_kind: true,
        path: true,
        session_id: true,
        target_id: true,
        target_type: true,
      },
      where: {
        action_type: {
          in: ["psychologist_video_whatsapp_click", "whatsapp_click"],
        },
        deleted: false,
        occurred_at: eventCreatedAtWhere(range),
      },
    });
  }

  async listTrafficCommunityPosts(postIds: string[]) {
    const uniquePostIds = [...new Set(postIds.filter(Boolean))];
    if (uniquePostIds.length === 0) return [];

    return prisma.community_post.findMany({
      select: {
        author_id: true,
        id: true,
        media_items: {
          select: {
            media_type: true,
          },
          where: {
            deleted: false,
          },
        },
        media_type: true,
      },
      where: {
        deleted: false,
        id: {
          in: uniquePostIds,
        },
        status: "publicado",
        author: {
          active: true,
          deleted: false,
          role: "psicologo",
        },
      },
    });
  }

  async listTrafficCommunityReplies(replyIds: string[]) {
    const uniqueReplyIds = [...new Set(replyIds.filter(Boolean))];
    if (uniqueReplyIds.length === 0) return [];

    return prisma.post_reply.findMany({
      select: {
        author_id: true,
        id: true,
        media_type: true,
      },
      where: {
        author: {
          active: true,
          deleted: false,
          role: "psicologo",
        },
        deleted: false,
        id: {
          in: uniqueReplyIds,
        },
        post: {
          deleted: false,
          status: "publicado",
        },
      },
    });
  }

  async listCommunityTrafficPlatformMetricDataset(range: AdminPsychologistsDashboardDateRange) {
    const [posts, replies] = await Promise.all([
      prisma.community_post.findMany({
        select: {
          author_id: true,
          createdAt: true,
          id: true,
          media_items: {
            select: {
              media_type: true,
            },
            where: {
              deleted: false,
            },
          },
          media_type: true,
        },
        where: {
          author: {
            active: true,
            deleted: false,
            role: "psicologo",
          },
          community: {
            deleted: false,
          },
          createdAt: {
            lte: range.end,
          },
          deleted: false,
          status: "publicado",
        },
      }),
      prisma.post_reply.findMany({
        select: {
          author_id: true,
          createdAt: true,
          id: true,
          media_type: true,
          parent_reply_id: true,
          post: {
            select: {
              author: {
                select: {
                  role: true,
                },
              },
              author_id: true,
              createdAt: true,
              id: true,
            },
          },
          post_id: true,
        },
        where: {
          author: {
            active: true,
            deleted: false,
            role: "psicologo",
          },
          createdAt: {
            lte: range.end,
          },
          deleted: false,
          post: {
            community: {
              deleted: false,
            },
            deleted: false,
            status: "publicado",
          },
        },
      }),
    ]);

    const postIds = posts.map((post) => post.id);
    const replyIds = replies.map((reply) => reply.id);
    const psychologistIds = [...new Set([...posts, ...replies].map((item) => item.author_id))];
    const pageViewTargets: Prisma.page_view_eventWhereInput[] = [];
    const attentionTargets: Prisma.content_attention_sessionWhereInput[] = [];
    const videoTargets: Prisma.content_video_watch_sessionWhereInput[] = [];
    const voteTargets: Prisma.post_voteWhereInput[] = [];
    const commentTargets: Prisma.post_replyWhereInput[] = [];

    if (postIds.length > 0) {
      pageViewTargets.push({
        target_id: {
          in: postIds,
        },
        target_type: {
          in: ["community_post", "post"],
        },
      });
      attentionTargets.push({
        target_id: {
          in: postIds,
        },
        target_type: "post",
      });
      videoTargets.push({
        target_id: {
          in: postIds,
        },
        target_type: "post",
      });
      voteTargets.push({
        post_id: {
          in: postIds,
        },
      });
      commentTargets.push({
        post_id: {
          in: postIds,
        },
      });
    }

    if (replyIds.length > 0) {
      pageViewTargets.push({
        target_id: {
          in: replyIds,
        },
        target_type: {
          in: ["post_reply", "reply"],
        },
      });
      attentionTargets.push({
        target_id: {
          in: replyIds,
        },
        target_type: "reply",
      });
      videoTargets.push({
        target_id: {
          in: replyIds,
        },
        target_type: "reply",
      });
      voteTargets.push({
        reply_id: {
          in: replyIds,
        },
      });
      commentTargets.push({
        parent_reply_id: {
          in: replyIds,
        },
      });
    }

    if (psychologistIds.length > 0) {
      pageViewTargets.push({
        page_kind: "psychologist_profile",
        target_id: {
          in: psychologistIds,
        },
        target_type: "psychologist",
      });
    }

    const [
      attentionSessions,
      comments,
      pageViews,
      postSaves,
      replySaves,
      shares,
      videoWatchSessions,
      votes,
    ] = await Promise.all([
      attentionTargets.length > 0
        ? prisma.content_attention_session.findMany({
            select: {
              attention_seconds: true,
              target_id: true,
              target_type: true,
            },
            where: {
              attention_seconds: {
                gt: 0,
              },
              createdAt: eventCreatedAtWhere(range),
              deleted: false,
              OR: attentionTargets,
            },
          })
        : Promise.resolve([]),
      commentTargets.length > 0
        ? prisma.post_reply.findMany({
            select: {
              parent_reply_id: true,
              post_id: true,
            },
            where: {
              createdAt: eventCreatedAtWhere(range),
              deleted: false,
              OR: commentTargets,
            },
          })
        : Promise.resolve([]),
      pageViewTargets.length > 0
        ? prisma.page_view_event.findMany({
            orderBy: [{ session_id: "asc" }, { occurred_at: "asc" }, { id: "asc" }],
            select: {
              occurred_at: true,
              session_id: true,
              target_id: true,
              target_type: true,
            },
            where: {
              deleted: false,
              occurred_at: eventCreatedAtWhere(range),
              OR: pageViewTargets,
            },
          })
        : Promise.resolve([]),
      postIds.length > 0
        ? prisma.post_save.findMany({
            select: {
              post_id: true,
            },
            where: {
              createdAt: eventCreatedAtWhere(range),
              deleted: false,
              post_id: {
                in: postIds,
              },
            },
          })
        : Promise.resolve([]),
      replyIds.length > 0
        ? prisma.post_reply_save.findMany({
            select: {
              reply_id: true,
            },
            where: {
              createdAt: eventCreatedAtWhere(range),
              deleted: false,
              reply_id: {
                in: replyIds,
              },
            },
          })
        : Promise.resolve([]),
      postIds.length > 0 || replyIds.length > 0
        ? prisma.post_share.findMany({
            select: {
              post_id: true,
              reply_id: true,
            },
            where: {
              createdAt: eventCreatedAtWhere(range),
              deleted: false,
              OR: [
                ...(postIds.length > 0
                  ? [
                      {
                        post_id: {
                          in: postIds,
                        },
                        reply_id: null,
                      },
                    ]
                  : []),
                ...(replyIds.length > 0
                  ? [
                      {
                        reply_id: {
                          in: replyIds,
                        },
                      },
                    ]
                  : []),
              ],
            },
          })
        : Promise.resolve([]),
      videoTargets.length > 0
        ? prisma.content_video_watch_session.findMany({
            select: {
              duration_seconds: true,
              target_id: true,
              target_type: true,
              watched_seconds: true,
            },
            where: {
              createdAt: eventCreatedAtWhere(range),
              deleted: false,
              OR: videoTargets,
            },
          })
        : Promise.resolve([]),
      voteTargets.length > 0
        ? prisma.post_vote.findMany({
            select: {
              post_id: true,
              reply_id: true,
              value: true,
            },
            where: {
              createdAt: eventCreatedAtWhere(range),
              deleted: false,
              OR: voteTargets,
              value: {
                in: [1, -1],
              },
            },
          })
        : Promise.resolve([]),
    ]);

    return {
      attentionSessions,
      comments,
      pageViews,
      posts,
      postSaves,
      replies,
      replySaves,
      shares,
      videoWatchSessions,
      votes,
    };
  }

  async listProfileTrafficPlatformMetricDataset(
    range: AdminPsychologistsDashboardDateRange,
    psychologistIds: string[],
  ) {
    const uniquePsychologistIds = [...new Set(psychologistIds.filter(Boolean))];
    if (uniquePsychologistIds.length === 0) {
      return {
        favorites: [],
        pageViews: [],
        profileViews: [],
        tabActions: [],
        videoActions: [],
        videoWatchSessions: [],
      };
    }

    const [favorites, pageViews, profileViews, tabActions, videoActions, videoWatchSessions] =
      await Promise.all([
        prisma.psychologist_favorite.findMany({
          select: {
            psychologist_id: true,
          },
          where: {
            createdAt: eventCreatedAtWhere(range),
            deleted: false,
            psychologist_id: {
              in: uniquePsychologistIds,
            },
          },
        }),
        prisma.page_view_event.findMany({
          select: {
            duration_seconds: true,
            target_id: true,
            user_id: true,
          },
          where: {
            deleted: false,
            duration_seconds: {
              gt: 0,
            },
            occurred_at: eventCreatedAtWhere(range),
            page_kind: "psychologist_profile",
            target_id: {
              in: uniquePsychologistIds,
            },
            target_type: "psychologist",
          },
        }),
        prisma.profile_view_event.findMany({
          select: {
            psychologist_id: true,
          },
          where: {
            createdAt: eventCreatedAtWhere(range),
            deleted: false,
            psychologist_id: {
              in: uniquePsychologistIds,
            },
            source: "profile_page",
          },
        }),
        prisma.important_action_event.findMany({
          select: {
            action_type: true,
            target_id: true,
            user_id: true,
          },
          where: {
            action_type: {
              in: [
                "psychologist_profile_publications_tab_open",
                "psychologist_profile_reviews_tab_open",
              ],
            },
            deleted: false,
            occurred_at: eventCreatedAtWhere(range),
            target_id: {
              in: uniquePsychologistIds,
            },
            target_type: "psychologist",
          },
        }),
        prisma.important_action_event.findMany({
          select: {
            action_type: true,
            path: true,
            target_id: true,
            user_id: true,
          },
          where: {
            action_type: {
              in: [
                "psychologist_video_favorite",
                "psychologist_video_profile_access",
                "psychologist_video_share",
              ],
            },
            deleted: false,
            occurred_at: eventCreatedAtWhere(range),
            target_id: {
              in: uniquePsychologistIds,
            },
            target_type: "psychologist",
          },
        }),
        prisma.profile_video_watch_session.findMany({
          select: {
            completed: true,
            duration_seconds: true,
            max_position_seconds: true,
            milestone_100: true,
            psychologist_id: true,
            replay_count: true,
            viewer_id: true,
            watched_seconds: true,
          },
          where: {
            createdAt: eventCreatedAtWhere(range),
            deleted: false,
            psychologist_id: {
              in: uniquePsychologistIds,
            },
          },
        }),
      ]);

    return {
      favorites,
      pageViews,
      profileViews,
      tabActions,
      videoActions,
      videoWatchSessions,
    };
  }

  async listReceivedEngagementEvents(range: AdminPsychologistsDashboardDateRange) {
    const favoriteEvents = await prisma.psychologist_favorite.findMany({
      select: {
        createdAt: true,
        psychologist_id: true,
      },
      where: {
        createdAt: eventCreatedAtWhere(range),
        deleted: false,
        psychologist: {
          active: true,
          deleted: false,
          role: "psicologo",
        },
        user: {
          active: true,
          deleted: false,
          role: "paciente",
        },
      },
    });

    const followEvents = await prisma.psychologist_follow.findMany({
      select: {
        createdAt: true,
        psychologist_id: true,
      },
      where: {
        createdAt: eventCreatedAtWhere(range),
        deleted: false,
        psychologist: {
          active: true,
          deleted: false,
          role: "psicologo",
        },
        user: {
          active: true,
          deleted: false,
          role: "paciente",
        },
      },
    });

    const postComments = await prisma.post_reply.findMany({
      select: {
        author_id: true,
        createdAt: true,
        id: true,
        post: {
          select: {
            author_id: true,
          },
        },
      },
      where: {
        author: {
          active: true,
          deleted: false,
          role: "paciente",
        },
        createdAt: eventCreatedAtWhere(range),
        deleted: false,
        post: {
          author: {
            active: true,
            deleted: false,
            role: "psicologo",
          },
          community: {
            deleted: false,
          },
          deleted: false,
          status: "publicado",
        },
      },
    });

    const nestedReplyComments = await prisma.post_reply.findMany({
      select: {
        author_id: true,
        createdAt: true,
        id: true,
        parent_reply: {
          select: {
            author_id: true,
          },
        },
      },
      where: {
        author: {
          active: true,
          deleted: false,
          role: "paciente",
        },
        createdAt: eventCreatedAtWhere(range),
        deleted: false,
        parent_reply: {
          author: {
            active: true,
            deleted: false,
            role: "psicologo",
          },
          deleted: false,
        },
        parent_reply_id: {
          not: null,
        },
        post: {
          community: {
            deleted: false,
          },
          deleted: false,
          status: "publicado",
        },
      },
    });

    const seenCommentEvents = new Set<string>();
    const commentEvents = [
      ...postComments.flatMap((comment) => {
        const psychologistId = comment.post.author_id;
        if (comment.author_id === psychologistId) return [];

        return [
          {
            commentId: comment.id,
            createdAt: comment.createdAt,
            psychologist_id: psychologistId,
          },
        ];
      }),
      ...nestedReplyComments.flatMap((comment) => {
        const psychologistId = comment.parent_reply?.author_id;
        if (!psychologistId || comment.author_id === psychologistId) return [];

        return [
          {
            commentId: comment.id,
            createdAt: comment.createdAt,
            psychologist_id: psychologistId,
          },
        ];
      }),
    ].flatMap((event) => {
      const key = `${event.commentId}:${event.psychologist_id}`;
      if (seenCommentEvents.has(key)) return [];
      seenCommentEvents.add(key);

      return [
        {
          createdAt: event.createdAt,
          psychologist_id: event.psychologist_id,
          type: "comment_received" as const,
        },
      ];
    });

    const postVotes = await prisma.post_vote.findMany({
      select: {
        createdAt: true,
        post: {
          select: {
            author_id: true,
          },
        },
        user_id: true,
      },
      where: {
        createdAt: eventCreatedAtWhere(range),
        deleted: false,
        post: {
          author: {
            active: true,
            deleted: false,
            role: "psicologo",
          },
          community: {
            deleted: false,
          },
          deleted: false,
          status: "publicado",
        },
        post_id: {
          not: null,
        },
        user: {
          active: true,
          deleted: false,
          role: "paciente",
        },
        value: 1,
      },
    });

    const replyVotes = await prisma.post_vote.findMany({
      select: {
        createdAt: true,
        reply: {
          select: {
            author_id: true,
          },
        },
        user_id: true,
      },
      where: {
        createdAt: eventCreatedAtWhere(range),
        deleted: false,
        reply: {
          author: {
            active: true,
            deleted: false,
            role: "psicologo",
          },
          deleted: false,
          post: {
            community: {
              deleted: false,
            },
            deleted: false,
            status: "publicado",
          },
        },
        reply_id: {
          not: null,
        },
        user: {
          active: true,
          deleted: false,
          role: "paciente",
        },
        value: 1,
      },
    });

    const postSaves = await prisma.post_save.findMany({
      select: {
        createdAt: true,
        post: {
          select: {
            author_id: true,
          },
        },
        user_id: true,
      },
      where: {
        createdAt: eventCreatedAtWhere(range),
        deleted: false,
        post: {
          author: {
            active: true,
            deleted: false,
            role: "psicologo",
          },
          community: {
            deleted: false,
          },
          deleted: false,
          status: "publicado",
        },
        user: {
          active: true,
          deleted: false,
          role: "paciente",
        },
      },
    });

    const replySaves = await prisma.post_reply_save.findMany({
      select: {
        createdAt: true,
        reply: {
          select: {
            author_id: true,
          },
        },
        user_id: true,
      },
      where: {
        createdAt: eventCreatedAtWhere(range),
        deleted: false,
        reply: {
          author: {
            active: true,
            deleted: false,
            role: "psicologo",
          },
          deleted: false,
          post: {
            community: {
              deleted: false,
            },
            deleted: false,
            status: "publicado",
          },
        },
        user: {
          active: true,
          deleted: false,
          role: "paciente",
        },
      },
    });

    const postShares = await prisma.post_share.findMany({
      select: {
        createdAt: true,
        post: {
          select: {
            author_id: true,
          },
        },
        user_id: true,
      },
      where: {
        createdAt: eventCreatedAtWhere(range),
        deleted: false,
        post: {
          author: {
            active: true,
            deleted: false,
            role: "psicologo",
          },
          community: {
            deleted: false,
          },
          deleted: false,
          status: "publicado",
        },
        reply_id: null,
        user: {
          is: {
            active: true,
            deleted: false,
            role: "paciente",
          },
        },
        user_id: {
          not: null,
        },
      },
    });

    const replyShares = await prisma.post_share.findMany({
      select: {
        createdAt: true,
        reply: {
          select: {
            author_id: true,
          },
        },
        user_id: true,
      },
      where: {
        createdAt: eventCreatedAtWhere(range),
        deleted: false,
        reply: {
          author: {
            active: true,
            deleted: false,
            role: "psicologo",
          },
          deleted: false,
          post: {
            community: {
              deleted: false,
            },
            deleted: false,
            status: "publicado",
          },
        },
        reply_id: {
          not: null,
        },
        user: {
          is: {
            active: true,
            deleted: false,
            role: "paciente",
          },
        },
        user_id: {
          not: null,
        },
      },
    });

    return [
      ...favoriteEvents.map((event) => ({
        createdAt: event.createdAt,
        psychologist_id: event.psychologist_id,
        type: "profile_favorite" as const,
      })),
      ...followEvents.map((event) => ({
        createdAt: event.createdAt,
        psychologist_id: event.psychologist_id,
        type: "profile_follow" as const,
      })),
      ...commentEvents,
      ...postVotes.flatMap((vote) => {
        const psychologistId = vote.post?.author_id;
        if (!psychologistId || vote.user_id === psychologistId) return [];

        return [
          {
            createdAt: vote.createdAt,
            psychologist_id: psychologistId,
            type: "positive_vote" as const,
          },
        ];
      }),
      ...replyVotes.flatMap((vote) => {
        const psychologistId = vote.reply?.author_id;
        if (!psychologistId || vote.user_id === psychologistId) return [];

        return [
          {
            createdAt: vote.createdAt,
            psychologist_id: psychologistId,
            type: "positive_vote" as const,
          },
        ];
      }),
      ...postSaves.flatMap((save) => {
        const psychologistId = save.post.author_id;
        if (save.user_id === psychologistId) return [];

        return [
          {
            createdAt: save.createdAt,
            psychologist_id: psychologistId,
            type: "content_save" as const,
          },
        ];
      }),
      ...replySaves.flatMap((save) => {
        const psychologistId = save.reply.author_id;
        if (save.user_id === psychologistId) return [];

        return [
          {
            createdAt: save.createdAt,
            psychologist_id: psychologistId,
            type: "content_save" as const,
          },
        ];
      }),
      ...postShares.flatMap((share) => {
        const psychologistId = share.post.author_id;
        if (share.user_id === psychologistId) return [];

        return [
          {
            createdAt: share.createdAt,
            psychologist_id: psychologistId,
            type: "content_share" as const,
          },
        ];
      }),
      ...replyShares.flatMap((share) => {
        const psychologistId = share.reply?.author_id;
        if (!psychologistId || share.user_id === psychologistId) return [];

        return [
          {
            createdAt: share.createdAt,
            psychologist_id: psychologistId,
            type: "content_share" as const,
          },
        ];
      }),
    ];
  }

  async listFavoriteEvents(range: AdminPsychologistsDashboardDateRange) {
    return prisma.psychologist_favorite.findMany({
      where: {
        createdAt: eventCreatedAtWhere(range),
        deleted: false,
      },
      select: {
        createdAt: true,
        psychologist_id: true,
      },
    });
  }

  async listProfileViews(range: AdminPsychologistsDashboardDateRange) {
    return prisma.profile_view_event.findMany({
      where: {
        createdAt: eventCreatedAtWhere(range),
        deleted: false,
        source: "profile_page",
      },
      select: {
        createdAt: true,
        psychologist_id: true,
      },
    });
  }

  async listProfileAttentionSeconds(
    range: AdminPsychologistsDashboardDateRange,
    psychologistIds: string[],
  ) {
    const uniquePsychologistIds = [...new Set(psychologistIds.filter(Boolean))];
    if (uniquePsychologistIds.length === 0) return [];

    const views = await prisma.page_view_event.findMany({
      orderBy: {
        occurred_at: "asc",
      },
      select: {
        duration_seconds: true,
        target_id: true,
        user_id: true,
      },
      where: {
        deleted: false,
        duration_seconds: {
          gt: 0,
        },
        occurred_at: eventCreatedAtWhere(range),
        page_kind: "psychologist_profile",
        target_id: {
          in: uniquePsychologistIds,
        },
        target_type: "psychologist",
      },
    });
    const secondsByPsychologistId = new Map<string, number>();

    for (const view of views) {
      const psychologistId = view.target_id;
      if (!psychologistId) continue;
      if (view.user_id && view.user_id === psychologistId) continue;

      secondsByPsychologistId.set(
        psychologistId,
        (secondsByPsychologistId.get(psychologistId) ?? 0) + (view.duration_seconds ?? 0),
      );
    }

    return [...secondsByPsychologistId.entries()].map(([psychologist_id, attention_seconds]) => ({
      attention_seconds,
      psychologist_id,
    }));
  }

  async listProfileVideoAttentionSeconds(range: AdminPsychologistsDashboardDateRange) {
    const groups = await prisma.profile_video_watch_session.groupBy({
      by: ["psychologist_id"],
      where: {
        createdAt: eventCreatedAtWhere(range),
        deleted: false,
        watched_seconds: {
          gt: 0,
        },
      },
      _sum: {
        watched_seconds: true,
      },
    });

    return groups.map((group) => ({
      attention_seconds: group._sum.watched_seconds ?? 0,
      psychologist_id: group.psychologist_id,
    }));
  }

  async listCommunityContentAttentionSeconds(
    range: AdminPsychologistsDashboardDateRange,
  ): Promise<AdminPsychologistContentAttentionRecord[]> {
    const groups = await prisma.content_attention_session.groupBy({
      by: ["psychologist_id", "target_type"],
      where: {
        attention_seconds: {
          gt: 0,
        },
        createdAt: eventCreatedAtWhere(range),
        deleted: false,
      },
      _sum: {
        attention_seconds: true,
      },
    });

    return groups.flatMap((group) => {
      if (group.target_type !== "post" && group.target_type !== "reply") return [];

      return [
        {
          attention_seconds: group._sum.attention_seconds ?? 0,
          psychologist_id: group.psychologist_id,
          target_type: group.target_type,
        },
      ];
    });
  }

  async listSearchResultImpressionCounts(range: AdminPsychologistsDashboardDateRange) {
    const groups = await prisma.profile_view_event.groupBy({
      by: ["psychologist_id"],
      where: {
        createdAt: eventCreatedAtWhere(range),
        deleted: false,
        source: SEARCH_RESULT_SOURCE,
      },
      _count: {
        _all: true,
      },
    });

    return countRecordsFromGroups(groups);
  }

  async listQualifiedVideoViewCounts(range: AdminPsychologistsDashboardDateRange) {
    const groups = await prisma.profile_video_watch_session.groupBy({
      by: ["psychologist_id"],
      where: {
        createdAt: eventCreatedAtWhere(range),
        deleted: false,
        OR: [
          {
            watched_seconds: {
              gte: QUALIFIED_VIDEO_WATCH_SECONDS,
            },
          },
          {
            max_position_seconds: {
              gte: QUALIFIED_VIDEO_WATCH_SECONDS,
            },
          },
        ],
      },
      _count: {
        _all: true,
      },
    });

    return countRecordsFromGroups(groups);
  }

  async listCommunityPostViewCounts(range: AdminPsychologistsDashboardDateRange) {
    const viewGroups = await prisma.page_view_event.groupBy({
      by: ["target_id"],
      where: {
        deleted: false,
        occurred_at: eventCreatedAtWhere(range),
        target_id: {
          not: null,
        },
        target_type: {
          in: ["post", "community_post"],
        },
      },
      _count: {
        _all: true,
      },
    });
    const postIds = viewGroups.flatMap((group) => (group.target_id ? [group.target_id] : []));
    if (postIds.length === 0) return [];

    const posts = await prisma.community_post.findMany({
      select: {
        author_id: true,
        id: true,
      },
      where: {
        author: {
          active: true,
          deleted: false,
          role: "psicologo",
        },
        community: {
          deleted: false,
        },
        deleted: false,
        id: {
          in: postIds,
        },
        status: "publicado",
      },
    });
    const authorByPostId = new Map(posts.map((post) => [post.id, post.author_id]));

    return sumCountsByPsychologistId(
      viewGroups.flatMap((group) => {
        const targetId = group.target_id;
        if (!targetId) return [];

        const psychologistId = authorByPostId.get(targetId);
        if (!psychologistId) return [];

        return [
          {
            count: group._count._all,
            psychologist_id: psychologistId,
          },
        ];
      }),
    );
  }

  async listCommunityReplyViewCounts(range: AdminPsychologistsDashboardDateRange) {
    const viewGroups = await prisma.page_view_event.groupBy({
      by: ["target_id"],
      where: {
        deleted: false,
        occurred_at: eventCreatedAtWhere(range),
        target_id: {
          not: null,
        },
        target_type: {
          in: ["reply", "post_reply"],
        },
      },
      _count: {
        _all: true,
      },
    });
    const replyIds = viewGroups.flatMap((group) => (group.target_id ? [group.target_id] : []));
    if (replyIds.length === 0) return [];

    const replies = await prisma.post_reply.findMany({
      select: {
        author_id: true,
        id: true,
      },
      where: {
        author: {
          active: true,
          deleted: false,
          role: "psicologo",
        },
        deleted: false,
        id: {
          in: replyIds,
        },
        post: {
          community: {
            deleted: false,
          },
          deleted: false,
          status: "publicado",
        },
      },
    });
    const authorByReplyId = new Map(replies.map((reply) => [reply.id, reply.author_id]));

    return sumCountsByPsychologistId(
      viewGroups.flatMap((group) => {
        const targetId = group.target_id;
        if (!targetId) return [];

        const psychologistId = authorByReplyId.get(targetId);
        if (!psychologistId) return [];

        return [
          {
            count: group._count._all,
            psychologist_id: psychologistId,
          },
        ];
      }),
    );
  }

  async listPublishedReviews(range: AdminPsychologistsDashboardDateRange) {
    return prisma.professional_review.findMany({
      where: {
        createdAt: eventCreatedAtWhere(range),
        deleted: false,
        status: "publicada",
      },
      select: {
        createdAt: true,
        psychologist_id: true,
      },
    });
  }

  async listWhatsappContactRequests(range: AdminPsychologistsDashboardDateRange) {
    return prisma.contact_request.findMany({
      where: {
        channel: "whatsapp",
        createdAt: eventCreatedAtWhere(range),
        deleted: false,
      },
      select: {
        createdAt: true,
        psychologist_id: true,
      },
    });
  }
}
