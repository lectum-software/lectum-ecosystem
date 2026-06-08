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
  crp: string | null;
  modality: string | null;
  languages: string[];
  rating_avg: number;
  rating_count: number;
  verified: boolean;
  available_today: boolean;
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
    approach?: string;
    verified?: boolean;
  };
  auth: user;
}
