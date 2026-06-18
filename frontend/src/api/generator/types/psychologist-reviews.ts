export type PsychologistReviewsQuery = {
  page?: number;
  limit?: number;
  rating?: number;
  period?: "all" | "7d" | "30d" | "90d";
};

export type PsychologistReviewAuthor = {
  initials: string;
  name: string;
};

export type PsychologistReview = {
  id: string;
  rating: number;
  comment: string | null;
  response: string | null;
  responded_at: string | null;
  created_at: string;
  author: PsychologistReviewAuthor;
};

export type PsychologistReviewSummary = {
  rating_avg: number;
  rating_count: number;
  distribution: Record<1 | 2 | 3 | 4 | 5, number>;
};

export type PsychologistReviewsResponse = {
  access: {
    can_receive_reviews: boolean;
    mode: "full" | "preview";
  };
  data: PsychologistReview[];
  page: number;
  pages: number;
  count: number;
  summary: PsychologistReviewSummary;
};

export type RespondPsychologistReviewPayload = {
  response: string;
};

export type RespondPsychologistReviewResponse = {
  psychologist_id: string;
  review: PsychologistReview;
  summary: PsychologistReviewSummary;
};
