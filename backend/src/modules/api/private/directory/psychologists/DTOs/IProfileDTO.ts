import type { user } from "@/interfaces/objects";
import type { PaginationResponse } from "@/interfaces/pagination";
import type { CommunityPostDTO } from "@/modules/api/private/community/DTOs/ICommunityDTO";

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
  whatsapp_name: string | null;
  avatar: string | null;
  headline: string | null;
  bio: string | null;
  cover_image_url: string | null;
  video_url: string | null;
  video_cover_url: string | null;
  crp: string | null;
  crp_registration_date: Date | null;
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
  regional_crp: string | null;
  registration_number: string | null;
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

export type DirectoryPsychologistPost = CommunityPostDTO & {
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

export type DirectoryPsychologistPostsResponse = PaginationResponse<DirectoryPsychologistPost> & {
  summary: DirectoryPsychologistParticipationSummary;
  highlighted_publication: DirectoryPsychologistPost | null;
};

export type DirectoryPsychologistReviewsResponse =
  PaginationResponse<DirectoryPsychologistReview> & {
    summary: DirectoryReviewSummary;
    highlighted_review: DirectoryPsychologistReview | null;
  };

export interface IProfileShowDTO {
  p: {
    id: string;
  };
  auth?: user | null;
  headers?: Record<string, string | string[] | undefined>;
}

export type DirectoryPsychologistSearchImpressionPayload = {
  path?: string | null;
  position?: number | null;
};

export interface IProfileSearchImpressionDTO extends IProfileShowDTO {
  b?: DirectoryPsychologistSearchImpressionPayload;
}

export interface IProfileListDTO extends IProfileShowDTO {
  q: {
    limit?: number;
    page?: number;
  };
}

export type DirectoryPsychologistProfileViewResponse = {
  notification_event_id: string | null;
  tracked: boolean;
};
