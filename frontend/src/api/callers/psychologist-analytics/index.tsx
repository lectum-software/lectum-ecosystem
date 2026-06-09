"use client";

import { useQuery } from "@tanstack/react-query";
import keys from "@/api/cache/keys";
import type { PsychologistAnalyticsQuery } from "@/api/generator/types/psychologist-analytics";
import * as api from "@/api/req/psychologist-analytics";

export const usePsychologistAnalytics = (query: PsychologistAnalyticsQuery = {}) =>
  useQuery({
    queryKey: keys.psychologistAnalytics.show(query),
    queryFn: () => api.getPsychologistAnalytics(query),
    refetchOnWindowFocus: false,
    retry: false,
  });
