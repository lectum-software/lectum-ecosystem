export type PatientReviewsQuery = { page?: number; limit?: number };
export type PatientReview = {
  id: string;
  psychologist_id: string;
  psychologist_name: string;
  psychologist_avatar: string | null;
  psychologist_headline: string | null;
  rating: number;
  comment: string | null;
  response: string | null;
  responded_at: string | null;
  status: string;
  created_at: string;
};
export type PatientReviewsResponse = {
  data: PatientReview[];
  page: number;
  pages: number;
  count: number;
};
export type ReviewEligibilityReason =
  | "eligible"
  | "not_found"
  | "contact_required"
  | "already_reviewed"
  | "own_profile";
export type ReviewEligibilityResponse = {
  psychologist_id: string;
  psychologist_name: string;
  psychologist_avatar: string | null;
  psychologist_headline: string | null;
  eligible: boolean;
  reason: ReviewEligibilityReason;
  contact_request_id: string | null;
  existing_review_id: string | null;
};
export type CreatePatientReviewPayload = {
  psychologist_id: string;
  rating: number;
  comment?: string | null;
};
export type CreatePatientReviewResponse = {
  review_id: string;
  psychologist_id: string;
  rating_avg: number;
  rating_count: number;
};
