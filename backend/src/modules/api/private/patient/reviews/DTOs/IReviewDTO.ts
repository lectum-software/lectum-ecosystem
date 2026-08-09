import type { user } from "@/interfaces/objects";
import type { PaginationResponse } from "@/interfaces/pagination";

export type ReviewEligibilityReason = "eligible" | "not_found" | "already_reviewed" | "own_profile";

export type PatientReviewItem = {
  id: string;
  psychologist_id: string;
  psychologist_name: string;
  psychologist_avatar: string | null;
  psychologist_headline: string | null;
  psychologist_crp: string | null;
  psychologist_gender: string | null;
  psychologist_verified: boolean;
  rating: number;
  comment: string | null;
  response: string | null;
  responded_at: Date | null;
  status: string;
  created_at: Date;
};

export type ReviewEligibilityResponse = {
  psychologist_id: string;
  psychologist_name: string;
  psychologist_avatar: string | null;
  psychologist_headline: string | null;
  psychologist_crp: string | null;
  psychologist_gender: string | null;
  psychologist_verified: boolean;
  eligible: boolean;
  reason: ReviewEligibilityReason;
  contact_request_id: string | null;
  existing_review_id: string | null;
};

export type CreateReviewResponse = {
  review_id: string;
  psychologist_id: string;
  rating_avg: number;
  rating_count: number;
};

export type PatientReviewsResponse = PaginationResponse<PatientReviewItem>;

export interface IReviewIndexDTO {
  q: { limit?: number; page?: number };
  auth: user;
}

export interface IReviewEligibilityDTO {
  p: { id: string };
  auth: user;
}

export interface IReviewStoreDTO {
  b: { psychologist_id: string; rating: number; comment: string };
  auth: user;
}
