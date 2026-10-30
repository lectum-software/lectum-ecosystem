import { callEndpoint } from "@/api/generator";
import type {
  PsychologistReviewsQuery,
  PsychologistReviewsResponse,
  RespondPsychologistReviewPayload,
  RespondPsychologistReviewResponse,
} from "@/api/generator/types/psychologist-reviews";
import { handleReq } from "@/api/handle";

export const getPsychologistReviews = async (query: PsychologistReviewsQuery = {}) => {
  const handle = callEndpoint({ route: "/api/private/psychologist/reviews", query });
  return handleReq<PsychologistReviewsResponse>(handle);
};

export const respondPsychologistReview = async (
  id: string,
  body: RespondPsychologistReviewPayload,
) => {
  const handle = callEndpoint({
    route: "/api/private/psychologist/reviews/:id/response",
    params: { id },
    method: "POST",
    body,
  });
  return handleReq<RespondPsychologistReviewResponse>({ ...handle, showSuccess: true });
};

export const setReviewVisibility = async (id: string, hidden: boolean) =>
  handleReq<{ psychologist_id: string }>(
    callEndpoint({
      route: "/api/private/psychologist/reviews/:id/visibility",
      method: "PUT",
      params: { id },
      body: { hidden },
    }),
  );

export const deleteReviewResponse = async (id: string) =>
  handleReq<{ psychologist_id: string }>(
    callEndpoint({
      route: "/api/private/psychologist/reviews/:id/response",
      method: "DELETE",
      params: { id },
    }),
  );
