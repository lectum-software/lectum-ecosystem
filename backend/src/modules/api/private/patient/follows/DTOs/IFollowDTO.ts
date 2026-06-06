import type { user } from "@/interfaces/objects";
import type { PaginationResponse } from "@/interfaces/pagination";

export type PatientFollowCatalogItem = {
  id: string;
  name: string;
  slug: string;
};

export type PatientFollowPsychologist = {
  id: string;
  relation_id: string;
  relation_created_at: Date;
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
  favorited: boolean;
  followed: boolean;
  specialties: PatientFollowCatalogItem[];
  services: PatientFollowCatalogItem[];
  approaches: PatientFollowCatalogItem[];
};

export type FollowActionResponse = {
  psychologist_id: string;
  followed: boolean;
};

export type FollowIndexResponse = PaginationResponse<PatientFollowPsychologist>;

export interface IFollowIndexDTO {
  q: {
    limit?: number;
    page?: number;
  };
  auth: user;
}

export interface IFollowActionDTO {
  p: {
    id: string;
  };
  auth: user;
}
