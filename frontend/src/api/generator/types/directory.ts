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
  approach?: string;
  verified?: boolean;
};

export type DirectoryPsychologistProfile = DirectoryPsychologist & {
  video_url: string | null;
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

export type DirectoryPsychologistProfilePost = {
  id: string;
  title: string;
  content: string;
  created_at: string;
  upvotes_count: number;
  downvotes_count: number;
  replies_count: number;
  saves_count: number;
  community: DirectoryCatalogItem;
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
