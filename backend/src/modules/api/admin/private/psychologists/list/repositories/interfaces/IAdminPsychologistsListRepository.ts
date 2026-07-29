import type { Prisma } from "@/external/generated/prisma/client";

export type AdminPsychologistListSubscriptionRecord = {
  createdAt: Date;
  current_period_end: Date | null;
  grant_started_at: Date | null;
  id: string;
  plan: {
    name: string;
    price_cents: number;
    slug: string;
  };
  source: string;
  status: string;
  updatedAt: Date;
};

export type AdminPsychologistListProfileRecord = {
  accepts_insurance: boolean;
  academic_formations: Prisma.JsonValue | null;
  academic_graduation_year: string | null;
  academic_institution: string | null;
  academic_title: string | null;
  available_days: Prisma.JsonValue | null;
  bio: string | null;
  cfp_verified_at: Date | null;
  cover_image_url: string | null;
  cpf: string | null;
  createdAt: Date;
  crp: string | null;
  crp_registration_date: Date | null;
  crp_status: string;
  discount_first_session: boolean;
  gender: string | null;
  headline: string | null;
  id: string;
  languages: Prisma.JsonValue | null;
  modality: string | null;
  professional_address_city: string | null;
  professional_address_state: string | null;
  published: boolean;
  race_color: string | null;
  rating_avg: number;
  rating_count: number;
  registry_checks: Array<{
    checked_at: Date;
    createdAt: Date;
    found: boolean;
    provider: string;
    raw: Prisma.JsonValue | null;
  }>;
  religion: string | null;
  show_experience_tag: boolean;
  social_value: boolean;
  subscriptions: AdminPsychologistListSubscriptionRecord[];
  target_audience: Prisma.JsonValue | null;
  updatedAt: Date;
  user: {
    avatar: string | null;
    createdAt: Date;
    email: string;
    id: string;
    name: string;
    psychologist_approaches: Array<{
      approach: {
        id: string;
        name: string;
        slug: string;
      };
    }>;
    psychologist_services: Array<{
      service: {
        id: string;
        name: string;
        slug: string;
      };
    }>;
    psychologist_specialties: Array<{
      specialty: {
        id: string;
        name: string;
        slug: string;
      };
    }>;
  };
  user_id: string;
  video_url: string | null;
  whatsapp: string | null;
};

export type AdminPsychologistListSpecialtyCatalogRecord = {
  category: {
    active: boolean;
    id: string;
    name: string;
    position: number;
    slug: string;
  } | null;
  category_id: string | null;
  id: string;
  name: string;
  position: number;
  slug: string;
};

export type AdminPsychologistListRankingCandidateRecord = Omit<
  AdminPsychologistListProfileRecord,
  "registry_checks" | "subscriptions"
> & {
  subscriptions: Array<{
    id: string;
    source: string | null;
  }>;
};

export type AdminPsychologistCountGroup = {
  _count: {
    _all: number;
  };
  psychologist_id: string;
};

export type AdminPsychologistAuthorCountGroup = {
  _count: {
    _all: number;
  };
  author_id: string;
};

export type AdminPsychologistUserCountGroup = {
  _count: {
    _all: number;
  };
  user_id: string;
};

export type AdminPsychologistReceivedEngagementCountsRecord = {
  comments_received: number;
  content_saves: number;
  content_shares: number;
  positive_votes: number;
  profile_favorites: number;
  profile_follows: number;
  psychologist_id: string;
};

export interface IAdminPsychologistsListRepository {
  listCommunityPostCounts(psychologistIds: string[]): Promise<AdminPsychologistAuthorCountGroup[]>;
  listCommunityReplyCounts(psychologistIds: string[]): Promise<AdminPsychologistAuthorCountGroup[]>;
  listCommunityVoteCounts(psychologistIds: string[]): Promise<AdminPsychologistUserCountGroup[]>;
  listFavoriteCounts(psychologistIds: string[]): Promise<AdminPsychologistCountGroup[]>;
  listReceivedEngagementCounts(
    psychologistIds: string[],
  ): Promise<AdminPsychologistReceivedEngagementCountsRecord[]>;
  listPatientReplyCounts(psychologistIds: string[]): Promise<AdminPsychologistAuthorCountGroup[]>;
  listProfileViewCounts(psychologistIds: string[]): Promise<AdminPsychologistCountGroup[]>;
  listSearchResultImpressionCounts(
    psychologistIds: string[],
  ): Promise<AdminPsychologistCountGroup[]>;
  listQualifiedVideoViewCounts(psychologistIds: string[]): Promise<AdminPsychologistCountGroup[]>;
  listCommunityPostViewCounts(psychologistIds: string[]): Promise<AdminPsychologistCountGroup[]>;
  listCommunityReplyViewCounts(psychologistIds: string[]): Promise<AdminPsychologistCountGroup[]>;
  listPsychologistProfiles(): Promise<AdminPsychologistListProfileRecord[]>;
  listPublicRankingCandidates(): Promise<AdminPsychologistListRankingCandidateRecord[]>;
  listSpecialtyCatalog(): Promise<AdminPsychologistListSpecialtyCatalogRecord[]>;
  listWhatsappClickCounts(psychologistIds: string[]): Promise<AdminPsychologistCountGroup[]>;
}
