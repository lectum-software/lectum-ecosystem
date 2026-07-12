import type { DirectoryCatalogItem } from "./directory";

export type PatientRelationPsychologist = {
  id: string;
  relation_id: string;
  relation_created_at: string;
  name: string;
  whatsapp_name?: string | null;
  avatar: string | null;
  headline: string | null;
  bio: string | null;
  cover_image_url?: string | null;
  video_url?: string | null;
  video_cover_url?: string | null;
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
  show_experience_tag?: boolean;
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
  search?: string;
  available_today?: boolean;
  accepts_insurance?: boolean;
  social_value?: boolean;
  discount_first_session?: boolean;
  more_experienced?: boolean;
  verified?: boolean;
};
