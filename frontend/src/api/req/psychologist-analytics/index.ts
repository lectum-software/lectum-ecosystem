import { callEndpoint } from "@/api/generator";
import type {
  PsychologistAnalyticsQuery,
  PsychologistAnalyticsResponse,
} from "@/api/generator/types/psychologist-analytics";
import { handleReq } from "@/api/handle";

export const getPsychologistAnalytics = async (query: PsychologistAnalyticsQuery = {}) => {
  const handle = callEndpoint({ route: "/api/private/psychologist/analytics", query });
  return handleReq<PsychologistAnalyticsResponse>(handle);
};
