import type { PostListPost } from "./posts";

export type DirectoryCatalogItem = {
  active?: boolean;
  category?: DirectoryCatalogCategory | null;
  category_id?: string | null;
  id: string;
  name: string;
  position?: number;
  slug: string;
};

export type DirectoryCatalogCategory = {
  active: boolean;
  id: string;
  name: string;
  position: number;
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
  crp_registration_date?: string | null;
  gender: string | null;
  modality: string | null;
  languages: string[];
  rating_avg: number;
  rating_count: number;
  verified: boolean;
  available_today: boolean;
  formation_years: number | null;
  regional_crp?: string | null;
  registration_number?: string | null;
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
  specialty_categories: DirectoryCatalogCategory[];
  specialties: DirectoryCatalogItem[];
  services: DirectoryCatalogItem[];
  approaches: DirectoryCatalogItem[];
  languages: DirectoryCatalogItem[];
  target_audiences: DirectoryCatalogItem[];
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
  contact_request_id: string | null;
  psychologist_id: string;
  tracked: boolean;
  whatsapp_url: string;
};

export type DirectoryPsychologistContactClickResponse = DirectoryPsychologistContactResponse;

export type DirectoryPsychologistProfileViewResponse = {
  notification_event_id: string | null;
  tracked: boolean;
};

export type DirectoryPsychologistVideoWatchPayload = {
  completed?: boolean;
  duration_seconds?: number;
  max_position_seconds?: number;
  milestone_25?: boolean;
  milestone_50?: boolean;
  milestone_75?: boolean;
  milestone_100?: boolean;
  replay_count?: number;
  session_key: string;
  watched_seconds?: number;
};

export type DirectoryPsychologistVideoWatchResponse = {
  tracked: boolean;
};

export type DirectoryPsychologistProfilePost = PostListPost & {
  contribution_type: "post" | "reply";
};

export type DirectoryPsychologistTopMentorCommunity = {
  id: string;
  name: string;
  slug: string;
  avatar_url: string | null;
  visual_primary_color: string | null;
  visual_primary_dark_color: string | null;
  visual_soft_color: string | null;
  visual_text_color: string | null;
  visual_gradient_color: string | null;
  position: 1 | 2 | 3;
  badge: string;
  score: number;
};

export type DirectoryPsychologistParticipationSummary = {
  posts_count: number;
  replies_count: number;
  top_mentor_communities: DirectoryPsychologistTopMentorCommunity[];
};

export type DirectoryPsychologistProfilePostsResponse = {
  data: DirectoryPsychologistProfilePost[];
  page: number;
  pages: number;
  count: number;
  summary: DirectoryPsychologistParticipationSummary;
  highlighted_publication: DirectoryPsychologistProfilePost | null;
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
  highlighted_review: DirectoryPsychologistProfileReview | null;
};

export type DirectoryPsychologistProfileListQuery = {
  page?: number;
  limit?: number;
};
