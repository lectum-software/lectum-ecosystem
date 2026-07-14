import type { Prisma } from "@/external/generated/prisma/client";
import type {
  AdminPsychologistsDashboardDateRange,
  AdminPsychologistsDashboardDirectoryFilters,
} from "../../DTOs/IAdminPsychologistsDashboardDTO";

export type AdminPsychologistSubscriptionRecord = {
  createdAt: Date;
  current_period_end: Date | null;
  gateway: string | null;
  gateway_subscription_id?: string | null;
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

export type AdminPsychologistProfileRecord = {
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
  rating_avg: number;
  rating_count: number;
  social_value: boolean;
  subscriptions: AdminPsychologistSubscriptionRecord[];
  target_audience: Prisma.JsonValue | null;
  updatedAt: Date;
  user: {
    avatar: string | null;
    createdAt: Date;
    email: string;
    id: string;
    name: string;
    provider: string | null;
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

export type AdminPsychologistRankingCandidateRecord = Omit<
  AdminPsychologistProfileRecord,
  "subscriptions"
> & {
  subscriptions: Array<{
    id: string;
    source: string | null;
  }>;
};

export type AdminPsychologistEventRecord = {
  createdAt: Date;
  psychologist_id: string;
};

export type AdminPsychologistPlatformPageViewRecord = {
  duration_seconds: number | null;
  normalized_path: string;
  occurred_at: Date;
  page_kind: string;
  path: string;
  session_id: string;
  user_id: string | null;
};

export type AdminPsychologistPublicProfilePageViewRecord = {
  occurred_at: Date;
  session_id: string;
  traffic_source: string | null;
};

export interface IAdminPsychologistsDashboardRepository {
  listProfileViews(
    range: AdminPsychologistsDashboardDateRange,
  ): Promise<AdminPsychologistEventRecord[]>;
  listDirectoryFilters(): Promise<AdminPsychologistsDashboardDirectoryFilters>;
  listPlatformPageViews(
    range: AdminPsychologistsDashboardDateRange,
  ): Promise<AdminPsychologistPlatformPageViewRecord[]>;
  listPublicProfilePageViews(
    range: AdminPsychologistsDashboardDateRange,
    psychologistIds: string[],
  ): Promise<AdminPsychologistPublicProfilePageViewRecord[]>;
  listPsychologistProfiles(): Promise<AdminPsychologistProfileRecord[]>;
  listPublicRankingCandidates(): Promise<AdminPsychologistRankingCandidateRecord[]>;
  listPublishedReviews(
    range: AdminPsychologistsDashboardDateRange,
  ): Promise<AdminPsychologistEventRecord[]>;
  listWhatsappContactRequests(
    range: AdminPsychologistsDashboardDateRange,
  ): Promise<AdminPsychologistEventRecord[]>;
}
