"use client";

import { useQuery } from "@tanstack/react-query";
import keys from "@/api/cache/keys";
import type { DirectoryPsychologistsQuery } from "@/api/generator/types/directory";
import * as api from "@/api/req/directory";

export const useDirectoryPsychologists = (query: DirectoryPsychologistsQuery = {}) => {
  return useQuery({
    queryKey: keys.directory.psychologists(query),
    queryFn: () => api.getDirectoryPsychologists(query),
    refetchOnWindowFocus: false,
    retry: false,
  });
};
