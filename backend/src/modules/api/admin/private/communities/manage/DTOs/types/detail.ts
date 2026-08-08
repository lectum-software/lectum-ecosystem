export type AdminCommunityIdentity = {
  active: boolean;
  avatar_url: string | null;
  category: string | null;
  created_at: Date;
  deactivated_at: Date | null;
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

export type AdminCommunityHighlightCountersDTO = {
  accesses_count: number;
  patient_comments_count: number;
  patient_posts_count: number;
  psychologist_posts_count: number;
  psychologist_replies_count: number;
  reports_count: number;
  source: "community_post+post_reply+post_report+page_view_event";
};

export type AdminCommunityTodaySummaryDTO = {
  new_active_patients_count: number;
  new_active_psychologists_count: number;
  new_patient_followers_count: number;
  new_psychologist_followers_count: number;
  patient_comments_count: number;
  patient_posts_count: number;
  period: {
    date: string;
    from: string;
    label: string;
    timezone: "server-local";
    to: string;
  };
  psychologist_posts_count: number;
  source: "community_member+community_post+post_reply+page_view_event";
  unverified_psychologist_replies_count: number;
  verified_psychologist_replies_count: number;
};

export type AdminCommunityUrgentPendingReportDTO = {
  content: {
    author: {
      name: string;
      role_label: string;
    } | null;
    available: boolean;
    content_kind_label: string;
    excerpt: string;
    id: string;
    title: string | null;
    type: "comment" | "post";
    unavailable_reason: string | null;
  };
  created_at: Date;
  id: string;
  reason_label: string;
  reporter: {
    label: string;
    name: string;
    role: string;
  };
  status_label: string;
};

export type AdminCommunityUrgentSummaryDTO = {
  pending_reports_count: number;
  pending_reports_last_reported_at: Date | null;
  pending_reports: AdminCommunityUrgentPendingReportDTO[];
  source: "post_report";
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

export type AdminCommunityContentAuthorDTO = {
  anonymous: boolean;
  avatar: string | null;
  gender: string | null;
  id: string;
  name: string;
  role: string;
  verified: boolean;
};

export type AdminCommunityPopularPostDTO = {
  author: AdminCommunityContentAuthorDTO;
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
  highlight_counters: AdminCommunityHighlightCountersDTO;
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
  today_summary: AdminCommunityTodaySummaryDTO;
  top_mentors: AdminCommunityTopMentorDTO[];
  urgent_summary: AdminCommunityUrgentSummaryDTO;
};
