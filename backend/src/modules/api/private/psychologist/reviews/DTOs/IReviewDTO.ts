import type { user } from "@/interfaces/objects";
import type { PaginationResponse } from "@/interfaces/pagination";

export type PsychologistReviewQueryPeriod = "all" | "7d" | "30d" | "90d";

export type PsychologistReviewAuthor = {
  initials: string;
  name: string;
};

export type PsychologistReviewItem = {
  id: string;
  rating: number;
  comment: string | null;
  response: string | null;
  responded_at: Date | null;
  created_at: Date;
  author: PsychologistReviewAuthor;
};

export type PsychologistReviewSummary = {
  rating_avg: number;
  rating_count: number;
  distribution: Record<1 | 2 | 3 | 4 | 5, number>;
};

export type PsychologistReviewsResponse = PaginationResponse<PsychologistReviewItem> & {
  access: {
    can_receive_reviews: boolean;
    mode: "full" | "preview";
  };
  summary: PsychologistReviewSummary;
};

export type PsychologistReviewResponseResult = {
  psychologist_id: string;
  review: PsychologistReviewItem;
  summary: PsychologistReviewSummary;
};

export interface IPsychologistReviewIndexDTO {
  q: {
    limit?: number;
    page?: number;
    period?: PsychologistReviewQueryPeriod;
    rating?: number;
  };
  auth: user;
}

export interface IPsychologistReviewRespondDTO {
  p: { id: string };
  b: { response: string };
  auth: user;
}
