import { callEndpoint } from "@/api/generator";
import type {
  CreatePatientReviewPayload,
  CreatePatientReviewResponse,
  PatientReviewsQuery,
  PatientReviewsResponse,
  ReviewEligibilityResponse,
} from "@/api/generator/types/reviews";
import { handleReq } from "@/api/handle";

export const getPatientReviews = async (query: PatientReviewsQuery = {}) => {
  const handle = callEndpoint({ route: "/api/private/patient/reviews", query });
  return handleReq<PatientReviewsResponse>(handle);
};

export const getReviewEligibility = async (id: string) => {
  const handle = callEndpoint({
    route: "/api/private/patient/reviews/eligibility/:id",
    params: { id },
  });
  return handleReq<ReviewEligibilityResponse>(handle);
};

export const createPatientReview = async (body: CreatePatientReviewPayload) => {
  const handle = callEndpoint({ route: "/api/private/patient/reviews", method: "POST", body });
  return handleReq<CreatePatientReviewResponse>({ ...handle, showSuccess: true });
};
