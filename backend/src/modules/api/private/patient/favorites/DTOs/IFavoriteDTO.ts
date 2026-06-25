import type { user } from "@/interfaces/objects";
import type { PaginationResponse } from "@/interfaces/pagination";

export type PatientRelationCatalogItem = {
  id: string;
  name: string;
  slug: string;
};

export type PatientRelationPsychologist = {
  id: string;
  relation_id: string;
  relation_created_at: Date;
  name: string;
  avatar: string | null;
  headline: string | null;
  bio: string | null;
  video_url: string | null;
  video_cover_url: string | null;
  crp: string | null;
  gender: string | null;
  modality: string | null;
  languages: string[];
  rating_avg: number;
  rating_count: number;
  verified: boolean;
  available_today: boolean;
  formation_years: number | null;
  discount_first_session: boolean;
  social_value: boolean;
  accepts_insurance: boolean;
  show_experience_tag: boolean;
  whatsapp_url: string | null;
  favorited: boolean;
  followed: boolean;
  specialties: PatientRelationCatalogItem[];
  services: PatientRelationCatalogItem[];
  approaches: PatientRelationCatalogItem[];
};

export type FavoriteActionResponse = {
  psychologist_id: string;
  favorited: boolean;
  notification_event_id?: string | null;
};

export type FavoriteIndexResponse = PaginationResponse<PatientRelationPsychologist>;

export interface IFavoriteIndexDTO {
  q: {
    limit?: number;
    page?: number;
    search?: string;
    available_today?: boolean;
    accepts_insurance?: boolean;
    social_value?: boolean;
    discount_first_session?: boolean;
    more_experienced?: boolean;
    verified?: boolean;
  };
  auth: user;
}

export interface IFavoriteActionDTO {
  p: {
    id: string;
  };
  auth: user;
}
