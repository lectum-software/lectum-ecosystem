import type { Request } from "express";
import type { admin } from "@/interfaces/objects";
import type { AdminCommunityIdentity, AdminCommunityRuleDTO } from "./detail";
import type { AdminCommunityReportItemDTO } from "./reports-activities";

import type {
  AdminCommunitiesListQuery,
  AdminCommunitiesListSort,
  AdminCommunityActivitiesQuery,
  AdminCommunityContentDetailQuery,
  AdminCommunityContentQuery,
  AdminCommunityCreateBody,
  AdminCommunityManageParams,
  AdminCommunityPaginationQuery,
  AdminCommunityRankingQuery,
  AdminCommunityRemoveContentBody,
  AdminCommunityReportsQuery,
  AdminCommunityResolveReportsBody,
  AdminCommunityRuleBody,
  AdminCommunityStatisticsQuery,
  AdminCommunityStatusBody,
  AdminCommunityUpdateBody,
} from "./requests";

export type AdminCommunityRemoveContentDTO = {
  affected_reports_count: number;
  affected_replies_count: number;
  content_id: string;
  post_id: string;
  type: "comment" | "post";
};

export type AdminCommunityResolveReportsDTO = {
  affected_reports_count: number;
  content_id: string;
  post_id: string;
  report: AdminCommunityReportItemDTO;
  resolution: "dismissed" | "pending" | "upheld";
  type: "comment" | "post";
};

export type AdminCommunityRulesResponseDTO = {
  community: Pick<AdminCommunityIdentity, "id" | "name" | "slug">;
  rules: AdminCommunityRuleDTO[];
};

export type AdminCommunityAvatarResponseDTO = {
  avatar_url: string;
  community: AdminCommunityIdentity;
};

export type AdminCommunitiesListFilterOptionDTO = {
  count: number;
  id: string;
  label: string;
};

export type AdminCommunitiesListItemDTO = {
  active: boolean;
  activity_count: number;
  avatar_url: string | null;
  category: string | null;
  comments_count: number;
  created_at: Date;
  deactivated_at: Date | null;
  description: string | null;
  detail_url: string;
  id: string;
  last_activity_at: Date | null;
  members_count: number;
  name: string;
  posts_count: number;
  reports_count: number;
  slug: string;
  updated_at: Date;
  visual_primary_color: string | null;
};

export type AdminCommunitiesListDTO = {
  active_filters_count: number;
  count: number;
  data: AdminCommunitiesListItemDTO[];
  filters: {
    categories: AdminCommunitiesListFilterOptionDTO[];
  };
  page: number;
  pages: number;
  per_page: number;
  sort: AdminCommunitiesListSort;
  source: "community+community_member+community_post+post_reply+post_report";
};

export type IAdminCommunitiesListDTO = Request & {
  q: AdminCommunitiesListQuery;
  admin?: admin;
  auth?: admin;
};

export type IAdminCommunityShowDTO = Request & {
  p: AdminCommunityManageParams;
  q: AdminCommunityPaginationQuery;
  admin?: admin;
  auth?: admin;
};

export type IAdminCommunityContentDTO = Request & {
  p: AdminCommunityManageParams;
  q: AdminCommunityContentQuery;
  admin?: admin;
  auth?: admin;
};

export type IAdminCommunityContentDetailDTO = Request & {
  p: AdminCommunityManageParams;
  q: AdminCommunityContentDetailQuery;
  admin?: admin;
  auth?: admin;
};

export type IAdminCommunityRankingDTO = Request & {
  p: AdminCommunityManageParams;
  q: AdminCommunityRankingQuery;
  admin?: admin;
  auth?: admin;
};

export type IAdminCommunityReportsDTO = Request & {
  p: AdminCommunityManageParams;
  q: AdminCommunityReportsQuery;
  admin?: admin;
  auth?: admin;
};

export type IAdminCommunityActivitiesDTO = Request & {
  p: AdminCommunityManageParams;
  q: AdminCommunityActivitiesQuery;
  admin?: admin;
  auth?: admin;
};

export type IAdminCommunityStatisticsDTO = Request & {
  p: AdminCommunityManageParams;
  q: AdminCommunityStatisticsQuery;
  admin?: admin;
  auth?: admin;
};

export type IAdminCommunityRemoveContentDTO = Request & {
  p: AdminCommunityManageParams;
  b: AdminCommunityRemoveContentBody;
  admin?: admin;
  auth?: admin;
};

export type IAdminCommunityResolveReportsDTO = Request & {
  p: AdminCommunityManageParams;
  b: AdminCommunityResolveReportsBody;
  admin?: admin;
  auth?: admin;
};

export type IAdminCommunityStatusDTO = Request & {
  p: AdminCommunityManageParams;
  b: AdminCommunityStatusBody;
  admin?: admin;
  auth?: admin;
};

export type IAdminCommunityUpdateDTO = Request & {
  p: AdminCommunityManageParams;
  b: AdminCommunityUpdateBody;
  admin?: admin;
  auth?: admin;
};

export type IAdminCommunityCreateDTO = Request & {
  b: AdminCommunityCreateBody;
  admin?: admin;
  auth?: admin;
};

export type IAdminCommunityAvatarDTO = Request & {
  p: AdminCommunityManageParams;
  admin?: admin;
  auth?: admin;
  file?: Express.Multer.File & { key?: string; path?: string };
};

export type IAdminCommunityRuleDTO = Request & {
  p: AdminCommunityManageParams;
  b: AdminCommunityRuleBody;
  admin?: admin;
  auth?: admin;
};
