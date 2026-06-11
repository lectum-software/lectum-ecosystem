import type { user } from "@/interfaces/objects";
import type { PaginationResponse } from "@/interfaces/pagination";

export type DirectoryCatalogItem = {
  id: string;
  name: string;
  slug: string;
};

export type DirectoryPsychologist = {
  id: string;
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
  specialties: DirectoryCatalogItem[];
  services: DirectoryCatalogItem[];
  approaches: DirectoryCatalogItem[];
};

export type DirectoryPsychologistFilters = {
  specialties: DirectoryCatalogItem[];
  services: DirectoryCatalogItem[];
  approaches: DirectoryCatalogItem[];
};

export type DirectoryPsychologistResponse = PaginationResponse<DirectoryPsychologist> & {
  filters: DirectoryPsychologistFilters;
};

export interface IIndexDTO {
  q: {
    limit?: number;
    page?: number;
    search?: string;
    specialty?: string;
    service?: string;
    modality?: string;
    approach?: string;
    target_audience?: string;
    state?: string;
    city?: string;
    gender?: string;
    race_color?: string;
    religion?: string;
    language?: string;
    more_experienced?: boolean;
    discount_first_session?: boolean;
    accepts_insurance?: boolean;
    social_value?: boolean;
    verified?: boolean;
  };
  auth?: user | null;
}
