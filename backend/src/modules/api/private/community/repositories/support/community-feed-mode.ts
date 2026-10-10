import type { Prisma } from "@/external/generated/prisma/client";
import {
  type CommunityPostSortValue,
  normalizeCommunityPostSort,
  resolveCommunityOpportunitiesStartDate,
} from "./community-feed";

// No sort keeps old clients on the existing curated feed during rollout.
export const resolveCommunityFeedSort = (role?: string | null, sort?: string) =>
  role === "psicologo" ? normalizeCommunityPostSort(sort) : "featured";

export const communityOpportunityWhere = (
  sort: CommunityPostSortValue,
): Prisma.community_postWhereInput =>
  sort === "opportunities"
    ? {
        author: { role: { not: "psicologo" } },
        createdAt: { gte: resolveCommunityOpportunitiesStartDate() },
      }
    : {};
