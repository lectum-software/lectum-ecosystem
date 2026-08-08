import type { Prisma } from "@/external/generated/prisma/client";
import type {
  AdminPsychologistsDashboardDateRange,
  AdminPsychologistsDashboardDirectoryFilterItem,
} from "../../DTOs/IAdminPsychologistsDashboardDTO";

export const QUALIFIED_VIDEO_WATCH_SECONDS = 3;

export const eventCreatedAtWhere = (range: AdminPsychologistsDashboardDateRange) => ({
  gte: range.start,
  lte: range.end,
});

export const SEARCH_RESULT_SOURCE = "search_result";

export const countRecordsFromGroups = (
  groups: Array<{ _count: { _all: number }; psychologist_id: string }>,
) =>
  groups.map((group) => ({
    count: group._count._all,
    psychologist_id: group.psychologist_id,
  }));

export const sumCountsByPsychologistId = (
  records: Array<{ count: number; psychologist_id: string }>,
) => {
  const counts = new Map<string, number>();

  for (const record of records) {
    counts.set(record.psychologist_id, (counts.get(record.psychologist_id) ?? 0) + record.count);
  }

  return [...counts.entries()].map(([psychologist_id, count]) => ({
    count,
    psychologist_id,
  }));
};

export const catalogSelect = {
  id: true,
  name: true,
  slug: true,
} satisfies Prisma.specialtySelect;

export const directoryCategorySelect = {
  id: true,
  name: true,
  position: true,
  slug: true,
} satisfies Prisma.specialty_categorySelect;

export const directorySpecialtySelect = {
  category: {
    select: directoryCategorySelect,
  },
  category_id: true,
  id: true,
  name: true,
  position: true,
  slug: true,
} satisfies Prisma.specialtySelect;

export const directoryCatalogSelect = {
  id: true,
  name: true,
  position: true,
  slug: true,
};

export const STATIC_MODALITY_FILTERS = [
  { id: "online", label: "Online" },
  { id: "presencial", label: "Presencial" },
] as const;

export const STATIC_GENDER_FILTERS = [
  { id: "feminino", label: "Feminino" },
  { id: "masculino", label: "Masculino" },
  { id: "nao_binario", label: "Não binário" },
  { id: "outro", label: "Outro" },
] as const;

export const STATIC_RACE_COLOR_FILTERS = [
  { id: "branca", label: "Branca" },
  { id: "preta", label: "Preta" },
  { id: "parda", label: "Parda" },
  { id: "amarela", label: "Amarela" },
  { id: "indigena", label: "Indígena" },
] as const;

export const STATIC_RELIGION_FILTERS = [
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

export const STATIC_STATE_FILTERS = [
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

export const STATIC_FEATURE_FILTERS = [
  { id: "available_today", label: "Disponível hoje" },
  { id: "verified", label: "Somente verificados" },
  { id: "more_experienced", label: "Mais experientes" },
  { id: "discount_first_session", label: "Desconto na 1ª sessão" },
  { id: "accepts_insurance", label: "Aceita convênios" },
  { id: "social_value", label: "Valor social" },
] as const;

export const catalogOrderBy = () => [{ position: "asc" as const }, { name: "asc" as const }];

export const toDirectoryFilterItem = (item: {
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

export const toStaticDirectoryFilterItem = (
  item: { id: string; label: string },
  position: number,
): AdminPsychologistsDashboardDirectoryFilterItem => ({
  id: item.id,
  label: item.label,
  position,
  slug: item.id,
});

export const profileBaseSelect = {
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

export const preSignupConversionUserSelect = {
  createdAt: true,
  id: true,
  role: true,
} satisfies Prisma.userSelect;

export const preSignupConversionPageViewSelect = {
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

export const preSignupConversionSessionSelect = {
  first_seen_at: true,
  last_seen_at: true,
  session_id: true,
  user: {
    select: preSignupConversionUserSelect,
  },
  user_id: true,
  visitor_id: true,
} satisfies Prisma.visitor_sessionSelect;

export const signupAnalyticsIdentitySelect = {
  createdAt: true,
  data: true,
  user_id: true,
} satisfies Prisma.user_backgroundSelect;

export const publicDirectoryWhere = {
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
