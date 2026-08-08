import type { Prisma } from "@/external/generated/prisma/client";
import {
  activeProfessionalEntitlementWhere,
  isVerifiedProfessionalEntitlement,
  verifiedProfessionalProfileWhere,
} from "@/utils/subscription-entitlement";
import { buildLectumWhatsappUrl, type LectumWhatsappMessageSource } from "@/utils/whatsapp-contact";
import type {
  DirectoryProfileCatalogItem,
  DirectoryPsychologistAcademicFormation,
  DirectoryReviewAuthor,
  IProfileListDTO,
} from "../../DTOs/IProfileDTO";

export const DEFAULT_LIMIT = 20;

export const MAX_LIMIT = 50;

export const catalogSelect = {
  id: true,
  name: true,
  slug: true,
};

export const communityCardSelect = {
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

export const professionalProfileSelect = {
  professional_first_name: true,
  professional_last_name: true,
  gender: true,
  crp: true,
  whatsapp: true,
  cfp_verified_at: true,
  crp_status: true,
  subscriptions: {
    where: activeProfessionalEntitlementWhere(),
    select: {
      id: true,
      source: true,
    },
    take: 1,
  },
} satisfies Prisma.psychologist_profileSelect;

export const postAuthorSelect = {
  id: true,
  name: true,
  avatar: true,
  role: true,
  psychologist_profile: {
    select: professionalProfileSelect,
  },
} satisfies Prisma.userSelect;

export const profilePostSelect = {
  id: true,
  title: true,
  content: true,
  media_url: true,
  media_type: true,
  thumbnail_url: true,
  media_items: {
    where: {
      deleted: false,
    },
    orderBy: [{ position: "asc" }, { createdAt: "asc" }, { id: "asc" }],
    select: {
      id: true,
      media_url: true,
      media_type: true,
      thumbnail_url: true,
      position: true,
    },
  },
  anonymous: true,
  status: true,
  upvotes_count: true,
  downvotes_count: true,
  replies_count: true,
  saves_count: true,
  createdAt: true,
  edited_at: true,
  community: {
    select: communityCardSelect,
  },
  author: {
    select: postAuthorSelect,
  },
  replies: {
    where: {
      deleted: false,
      parent_reply_id: null,
      author: {
        role: "psicologo",
        psychologist_profile: {
          is: {
            deleted: false,
            ...verifiedProfessionalProfileWhere(),
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
      thumbnail_url: true,
      upvotes_count: true,
      downvotes_count: true,
      createdAt: true,
      edited_at: true,
      parent_reply_id: true,
      parent_reply: {
        select: {
          content: true,
        },
      },
      author: {
        select: postAuthorSelect,
      },
    },
  },
} satisfies Prisma.community_postSelect;

export const profileReplySelect = {
  id: true,
  title: true,
  content: true,
  media_url: true,
  media_type: true,
  thumbnail_url: true,
  upvotes_count: true,
  downvotes_count: true,
  createdAt: true,
  edited_at: true,
  parent_reply_id: true,
  parent_reply: {
    select: {
      content: true,
    },
  },
  post: {
    select: profilePostSelect,
  },
  author: {
    select: postAuthorSelect,
  },
} satisfies Prisma.post_replySelect;

export const profileReviewSelect = {
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
} satisfies Prisma.professional_reviewSelect;

export type ProfilePostResult = Prisma.community_postGetPayload<{
  select: typeof profilePostSelect;
}>;

export type ProfileReplyResult = Prisma.post_replyGetPayload<{ select: typeof profileReplySelect }>;

export type ProfileReviewResult = Prisma.professional_reviewGetPayload<{
  select: typeof profileReviewSelect;
}>;

export type ProfileAuthorResult = ProfilePostResult["author"];

export type ProfileProfessionalReplyResult = ProfilePostResult["replies"][number];

export type CurrentVote = 1 | -1 | null;

export type MentorBadgeByCommunityId = Map<string, string>;

export type ProfilePublicationCandidate =
  | {
      createdAt: Date;
      id: string;
      kind: "post";
      post: ProfilePostResult;
      score: number;
    }
  | {
      createdAt: Date;
      id: string;
      kind: "reply";
      reply: ProfileReplyResult;
      score: number;
    };

export const PROFILE_PUBLICATION_UPVOTE_WEIGHT = 3;

export const PROFILE_PUBLICATION_DOWNVOTE_WEIGHT = 0.6;

export const PROFILE_PUBLICATION_COMMENT_WEIGHT = 5;

export const PROFILE_PUBLICATION_PSYCHOLOGIST_REPLY_WEIGHT = 15;

export const PROFILE_PUBLICATION_TOP_MENTOR_REPLY_WEIGHT = 25;

export const PROFILE_PUBLICATION_SHARE_WEIGHT = 4;

export const PROFILE_PUBLICATION_SAVE_WEIGHT = 3;

export const professionalReplyVideoTieBreakScore = ({
  media_type,
  media_url,
}: Pick<ProfileProfessionalReplyResult, "media_type" | "media_url">) =>
  media_type === "video" && media_url ? 1 : 0;

export const selectHighlightedProfileReplyPreview = (replies: ProfileProfessionalReplyResult[]) =>
  [...replies].sort((a, b) => {
    const scoreDiff =
      b.upvotes_count -
      b.downvotes_count * PROFILE_PUBLICATION_DOWNVOTE_WEIGHT -
      (a.upvotes_count - a.downvotes_count * PROFILE_PUBLICATION_DOWNVOTE_WEIGHT);
    if (scoreDiff !== 0) return scoreDiff;

    const videoDiff =
      professionalReplyVideoTieBreakScore(b) - professionalReplyVideoTieBreakScore(a);
    if (videoDiff !== 0) return videoDiff;

    const dateDiff = b.createdAt.getTime() - a.createdAt.getTime();
    if (dateDiff !== 0) return dateDiff;

    return b.id.localeCompare(a.id);
  })[0];

export const normalizeStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];

  return value.filter((item): item is string => typeof item === "string");
};

export const normalizeLanguages = (value: unknown): string[] => {
  const languages = normalizeStringArray(value);

  return languages.length > 0 ? languages : ["Português"];
};

export const trimToNull = (value: unknown) => {
  if (typeof value !== "string") return null;

  return value.trim() || null;
};

export const hasRelationItems = (value?: unknown[] | null) =>
  Array.isArray(value) && value.length > 0;

export const hasPublishedProfileRequirements = (
  item: {
    name?: string | null;
    psychologist_approaches?: unknown[] | null;
    psychologist_services?: unknown[] | null;
    psychologist_specialties?: unknown[] | null;
  },
  profile: {
    cpf?: string | null;
    crp?: string | null;
    gender?: string | null;
    modality?: string | null;
    professional_address_city?: string | null;
    professional_address_state?: string | null;
    target_audience?: unknown;
    video_url?: string | null;
  },
) => {
  return Boolean(
    trimToNull(item.name) &&
      trimToNull(profile.video_url) &&
      trimToNull(profile.modality) &&
      trimToNull(profile.gender) &&
      trimToNull(profile.cpf) &&
      trimToNull(profile.crp) &&
      trimToNull(profile.professional_address_city) &&
      trimToNull(profile.professional_address_state) &&
      normalizeStringArray(profile.target_audience).length > 0 &&
      hasRelationItems(item.psychologist_specialties) &&
      hasRelationItems(item.psychologist_services) &&
      hasRelationItems(item.psychologist_approaches),
  );
};

export const hasAcademicContent = (item: DirectoryPsychologistAcademicFormation) => {
  return Boolean(item.title || item.institution || item.graduation_year);
};

export const normalizeAcademicFormation = (
  item: unknown,
): DirectoryPsychologistAcademicFormation => {
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

export const normalizeAcademicFormations = (
  value: unknown,
  fallback: DirectoryPsychologistAcademicFormation,
) => {
  if (Array.isArray(value)) {
    return value.map(normalizeAcademicFormation).filter(hasAcademicContent);
  }

  return hasAcademicContent(fallback) ? [fallback] : [];
};

export const currentWeekdayValue = () => {
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

export const hasAvailableToday = (value: unknown) => {
  return normalizeStringArray(value).includes(currentWeekdayValue());
};

export const buildWhatsappUrl = (
  value?: string | null,
  psychologistName?: string | null,
  psychologistWhatsappName?: string | null,
  source: LectumWhatsappMessageSource = "profile",
) =>
  buildLectumWhatsappUrl({
    phone: value,
    psychologistName,
    psychologistWhatsappName,
    source,
  });

export const anonymousDisplayNameForAuthor = (authorId: string) => {
  let hash = 0;

  for (const character of authorId) {
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  }

  return `Membro Anônimo #${1000 + (hash % 9000)}`;
};

export const isProfessionalVerified = (
  profile?: {
    cfp_verified_at: Date | null;
    crp_status?: string | null;
    subscriptions: { id?: string; source?: string | null }[];
  } | null,
) => isVerifiedProfessionalEntitlement(profile);

export const hasPaidProfessionalEntitlement = (
  profile?: { subscriptions: { id: string }[] } | null,
) => {
  return Boolean(profile?.subscriptions.length);
};

export const buildProfessionalWhatsappUrl = (
  profile?: {
    cfp_verified_at: Date | null;
    crp_status?: string | null;
    subscriptions: { id: string }[];
    whatsapp: string | null;
  } | null,
  psychologistName?: string | null,
  psychologistWhatsappName?: string | null,
  source: LectumWhatsappMessageSource = "community_post",
) => {
  if (!isProfessionalVerified(profile) || !hasPaidProfessionalEntitlement(profile)) return null;

  return buildWhatsappUrl(profile?.whatsapp, psychologistName, psychologistWhatsappName, source);
};

export const mentorBadgeForScore = (
  profile?: {
    cfp_verified_at: Date | null;
    crp_status?: string | null;
    subscriptions: { id: string }[];
  } | null,
  score = 0,
) => {
  if (!isProfessionalVerified(profile) || !hasPaidProfessionalEntitlement(profile)) return null;
  if (score >= 80) return "TOP #1 MENTOR";
  if (score >= 65) return "TOP #2 MENTOR";
  if (score >= 50) return "TOP #3 MENTOR";

  return null;
};

export const authorTypeLabel = (
  role?: string | null,
  gender?: string | null,
  anonymous = false,
) => {
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

export const normalizeVoteValue = (value?: number | null): CurrentVote => {
  if (value === 1 || value === -1) return value;

  return null;
};

export const normalizePagination = (query: IProfileListDTO["q"] = {}) => {
  const page = Math.max(1, Number(query.page || 1));
  const limit = Math.min(MAX_LIMIT, Math.max(1, Number(query.limit || DEFAULT_LIMIT)));

  return {
    page,
    limit,
    skip: (page - 1) * limit,
  };
};

export const isCatalogItem = (
  value: DirectoryProfileCatalogItem | null,
): value is DirectoryProfileCatalogItem => {
  return Boolean(value?.id && value.name && value.slug);
};

export const toSafeAuthor = (name: string): DirectoryReviewAuthor => {
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

export const toReviewResponse = (item: ProfileReviewResult) => ({
  id: item.id,
  rating: item.rating,
  comment: item.comment,
  response: item.response,
  responded_at: item.responded_at,
  created_at: item.createdAt,
  author: toSafeAuthor(item.author.name),
});
