import type { user } from "@/interfaces/objects";
import type { PaginationResponse } from "@/interfaces/pagination";

export interface IPendingReviewDTO {
  auth: user;
  q: { page?: number; limit?: number; batch?: string };
}

export type PendingReviewProfessional = {
  id: string;
  psychologist_id: string;
  name: string;
  avatar: string | null;
  headline: string | null;
  verified: boolean;
};

export type PendingReviewsResponse = PaginationResponse<PendingReviewProfessional>;
