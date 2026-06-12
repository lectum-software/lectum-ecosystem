import type { user } from "@/interfaces/objects";
import type { PaginationResponse } from "@/interfaces/pagination";

export type DirectoryProfileCatalogItem = {
  id: string;
  name: string;
  slug: string;
};

export type DirectoryPsychologistAcademicFormation = {
  title: string | null;
  institution: string | null;
  graduation_year: string | null;
};

export type DirectoryPsychologistProfile = {
  id: string;
  name: string;
  avatar: string | null;
  headline: string | null;
  bio: string | null;
  cover_image_url: string | null;
  video_url: string | null;
  video_cover_url: string | null;
  crp: string | null;
  gender: string | null;
  modality: string | null;
  languages: string[];
  target_audience: string[];
  address_city: string | null;
  address_state: string | null;
  academic_formations: DirectoryPsychologistAcademicFormation[];
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
  whatsapp_available: boolean;
  specialties: DirectoryProfileCatalogItem[];
  services: DirectoryProfileCatalogItem[];
  approaches: DirectoryProfileCatalogItem[];
};

export type DirectoryPsychologistPost = {
  id: string;
  title: string;
  content: string;
  created_at: Date;
  upvotes_count: number;
  downvotes_count: number;
  replies_count: number;
  saves_count: number;
  community: DirectoryProfileCatalogItem;
};

export type DirectoryReviewAuthor = {
  initials: string;
  name: string;
};

export type DirectoryPsychologistReview = {
  id: string;
  rating: number;
  comment: string | null;
  response: string | null;
  responded_at: Date | null;
  created_at: Date;
  author: DirectoryReviewAuthor;
};

export type DirectoryReviewSummary = {
  rating_avg: number;
  rating_count: number;
  distribution: Record<1 | 2 | 3 | 4 | 5, number>;
};

export type DirectoryPsychologistPostsResponse = PaginationResponse<DirectoryPsychologistPost>;

export type DirectoryPsychologistReviewsResponse =
  PaginationResponse<DirectoryPsychologistReview> & {
    summary: DirectoryReviewSummary;
  };

export interface IProfileShowDTO {
  p: {
    id: string;
  };
  auth?: user | null;
}

export interface IProfileListDTO extends IProfileShowDTO {
  q: {
    limit?: number;
    page?: number;
  };
}
