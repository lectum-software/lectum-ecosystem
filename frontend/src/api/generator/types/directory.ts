import type { PostListPost } from "./posts";

export type DirectoryCatalogItem = {
  id: string;
  name: string;
  slug: string;
};
export type DirectoryAcademicFormation = {
  title: string | null;
  institution: string | null;
  graduation_year: string | null;
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

export type DirectoryPsychologistsResponse = {
  data: DirectoryPsychologist[];
  page: number;
  pages: number;
  count: number;
  filters: DirectoryPsychologistFilters;
};

export type DirectoryPsychologistsQuery = {
  page?: number;
  limit?: number;
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
  available_today?: boolean;
  verified?: boolean;
};

export type DirectoryPsychologistProfile = DirectoryPsychologist & {
  cover_image_url: string | null;
  address_city: string | null;
  address_state: string | null;
  academic_formations: DirectoryAcademicFormation[];
  target_audience: string[];
  whatsapp_available: boolean;
};

export type DirectoryPsychologistContactPayload = {
  patient_phone: string;
  consent_accepted: boolean;
};

export type DirectoryPsychologistContactResponse = {
  contact_request_id: string;
  psychologist_id: string;
  whatsapp_url: string;
};

export type DirectoryPsychologistContactClickResponse = DirectoryPsychologistContactResponse;

export type DirectoryPsychologistProfilePost = PostListPost & {
  contribution_type: "post" | "reply";
};

export type DirectoryPsychologistProfilePostsResponse = {
  data: DirectoryPsychologistProfilePost[];
  page: number;
  pages: number;
  count: number;
};

export type DirectoryPsychologistReviewAuthor = {
  initials: string;
  name: string;
};

export type DirectoryPsychologistProfileReview = {
  id: string;
  rating: number;
  comment: string | null;
  response: string | null;
  responded_at: string | null;
  created_at: string;
  author: DirectoryPsychologistReviewAuthor;
};

export type DirectoryReviewSummary = {
  rating_avg: number;
  rating_count: number;
  distribution: Record<1 | 2 | 3 | 4 | 5, number>;
};

export type DirectoryPsychologistProfileReviewsResponse = {
  data: DirectoryPsychologistProfileReview[];
  page: number;
  pages: number;
  count: number;
  summary: DirectoryReviewSummary;
};

export type DirectoryPsychologistProfileListQuery = {
  page?: number;
  limit?: number;
};
