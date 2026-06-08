import type { DirectoryCatalogItem } from "./directory";

export type PatientRelationPsychologist = {
  id: string;
  relation_id: string;
  relation_created_at: string;
  name: string;
  avatar: string | null;
  headline: string | null;
  bio: string | null;
  video_url?: string | null;
  crp: string | null;
  gender?: string | null;
  modality: string | null;
  languages: string[];
  rating_avg: number;
  rating_count: number;
  verified: boolean;
  available_today?: boolean;
  formation_years?: number | null;
  discount_first_session?: boolean;
  social_value?: boolean;
  accepts_insurance?: boolean;
  whatsapp_url?: string | null;
  favorited: boolean;
  followed: boolean;
  specialties: DirectoryCatalogItem[];
  services: DirectoryCatalogItem[];
  approaches: DirectoryCatalogItem[];
};

export type PatientRelationListResponse = {
  data: PatientRelationPsychologist[];
  page: number;
  pages: number;
  count: number;
};

export type PatientRelationQuery = {
  page?: number;
  limit?: number;
};
