import type { Request } from "express";
import type { admin } from "@/interfaces/objects";

export type AdminCommunityManageParams = {
  id: string;
  ruleId?: string;
};

export type AdminCommunityUpdateBody = {
  name?: string;
  description?: string | null;
  avatar_url?: string | null;
  visual_primary_color?: string | null;
  visual_primary_dark_color?: string | null;
  visual_soft_color?: string | null;
  visual_text_color?: string | null;
  visual_gradient_color?: string | null;
};

export type AdminCommunityRuleBody = {
  title: string;
  description: string;
  position?: number;
  active?: boolean;
};

export type AdminCommunityIdentity = {
  avatar_url: string | null;
  category: string | null;
  created_at: Date;
  description: string | null;
  id: string;
  members_count: number;
  name: string;
  slug: string;
  visual_gradient_color: string | null;
  visual_primary_color: string | null;
  visual_primary_dark_color: string | null;
  visual_soft_color: string | null;
  visual_text_color: string | null;
};

export type AdminCommunityRuleDTO = {
  active: boolean;
  created_at: Date;
  description: string;
  id: string;
  position: number;
  title: string;
  updated_at: Date;
};

export type AdminCommunitySummaryDTO = {
  comments_count: number;
  members_count: number;
  posts_count: number;
  popular_posts_count: number;
};

export type AdminCommunityPerformancePointDTO = {
  date: string;
  comments: number;
  members: number;
  posts: number;
  reports: number;
};

export type AdminCommunityPerformanceMetricDTO = {
  label: string;
  value: number;
  change_percent: number | null;
  trend: "down" | "flat" | "unavailable" | "up";
};

export type AdminCommunityTopMentorDTO = {
  avatar: string | null;
  crp: string | null;
  id: string;
  name: string;
  position: number;
  rating_avg: number;
  replies_count: number;
  score: number;
  upvotes_count: number;
  verified: boolean;
};

export type AdminCommunityPopularPostDTO = {
  author_name: string;
  author_role: string;
  comments_count: number;
  created_at: Date;
  id: string;
  saves_count: number;
  title: string;
  upvotes_count: number;
};

export type AdminCommunityDetailDTO = {
  community: AdminCommunityIdentity;
  performance: {
    days: number;
    metrics: {
      comments: AdminCommunityPerformanceMetricDTO;
      new_members: AdminCommunityPerformanceMetricDTO;
      new_posts: AdminCommunityPerformanceMetricDTO;
      reports: AdminCommunityPerformanceMetricDTO;
    };
    points: AdminCommunityPerformancePointDTO[];
  };
  popular_posts: AdminCommunityPopularPostDTO[];
  rules: AdminCommunityRuleDTO[];
  summary: AdminCommunitySummaryDTO;
  top_mentors: AdminCommunityTopMentorDTO[];
};

export type AdminCommunityRulesResponseDTO = {
  community: Pick<AdminCommunityIdentity, "id" | "name" | "slug">;
  rules: AdminCommunityRuleDTO[];
};

export type AdminCommunityAvatarResponseDTO = {
  avatar_url: string;
  community: AdminCommunityIdentity;
};

export type IAdminCommunityShowDTO = Request & {
  p: AdminCommunityManageParams;
  auth: admin;
};

export type IAdminCommunityUpdateDTO = Request & {
  p: AdminCommunityManageParams;
  b: AdminCommunityUpdateBody;
  auth: admin;
};

export type IAdminCommunityAvatarDTO = Request & {
  p: AdminCommunityManageParams;
  auth: admin;
  file?: Express.Multer.File & { key?: string; path?: string };
};

export type IAdminCommunityRuleDTO = Request & {
  p: AdminCommunityManageParams;
  b: AdminCommunityRuleBody;
  auth: admin;
};
