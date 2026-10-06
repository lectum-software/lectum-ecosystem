import type { InfiniteData } from "@tanstack/react-query";
import type { PatientRelationListResponse } from "@/api/generator/types";

export type RelationListCache =
  | PatientRelationListResponse
  | InfiniteData<PatientRelationListResponse>;

export const mapRelationPages = (
  cached: RelationListCache | undefined,
  update: (page: PatientRelationListResponse) => PatientRelationListResponse,
): RelationListCache | undefined => {
  if (!cached) return cached;
  return "pageParams" in cached ? { ...cached, pages: cached.pages.map(update) } : update(cached);
};
