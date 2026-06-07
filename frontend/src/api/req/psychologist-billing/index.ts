import { callEndpoint } from "@/api/generator";
import type {
  BillingCurrentResponse,
  BillingPlansResponse,
  BillingSelectFreeResponse,
} from "@/api/generator/types/billing";
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

export const selectPsychologistBillingFreePlan = async () => {
  const handle = callEndpoint({
    route: "/api/private/psychologist/billing/select-free",
    method: "POST",
  });

  return handleReq<BillingSelectFreeResponse>(handle);
};
