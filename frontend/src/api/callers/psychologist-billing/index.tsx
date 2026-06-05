"use client";

import { useQuery } from "@tanstack/react-query";
import keys from "@/api/cache/keys";
import * as api from "@/api/req/psychologist-billing";

export const usePsychologistBilling = () => {
  const plans = useQuery({
    queryKey: keys.psychologistBilling.plans(),
    queryFn: () => api.getPsychologistBillingPlans(),
    refetchOnWindowFocus: false,
    retry: false,
  });

  const current = useQuery({
    queryKey: keys.psychologistBilling.current(),
    queryFn: () => api.getPsychologistBillingCurrent(),
    refetchOnWindowFocus: false,
    retry: false,
  });

  return {
    plans,
    current,
  };
};
