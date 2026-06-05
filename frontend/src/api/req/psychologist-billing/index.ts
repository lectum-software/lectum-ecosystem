import { callEndpoint } from "@/api/generator";
import type { BillingCurrentResponse, BillingPlansResponse } from "@/api/generator/types/billing";
import { handleReq } from "@/api/handle";

export const getPsychologistBillingPlans = async () => {
  const handle = callEndpoint({
    route: "/api/private/psychologist/billing/plans",
  });

  return handleReq<BillingPlansResponse>(handle);
};

export const getPsychologistBillingCurrent = async () => {
  const handle = callEndpoint({
    route: "/api/private/psychologist/billing/current",
  });

  return handleReq<BillingCurrentResponse>(handle);
};
