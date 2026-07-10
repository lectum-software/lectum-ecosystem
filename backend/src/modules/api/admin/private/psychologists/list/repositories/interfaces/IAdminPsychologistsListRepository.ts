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
  subscriptions: AdminPsychologistListSubscriptionRecord[];
  target_audience: Prisma.JsonValue | null;
  updatedAt: Date;
  user: {
    avatar: string | null;
    createdAt: Date;
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

export type AdminPsychologistListRankingCandidateRecord = Omit<
  AdminPsychologistListProfileRecord,
  "subscriptions"
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

export interface IAdminPsychologistsListRepository {
  listFavoriteCounts(psychologistIds: string[]): Promise<AdminPsychologistCountGroup[]>;
  listPsychologistProfiles(): Promise<AdminPsychologistListProfileRecord[]>;
  listPublicRankingCandidates(): Promise<AdminPsychologistListRankingCandidateRecord[]>;
  listWhatsappClickCounts(psychologistIds: string[]): Promise<AdminPsychologistCountGroup[]>;
}
