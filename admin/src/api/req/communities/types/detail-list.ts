export type AdminCommunityIdentity = {
  active: boolean;
  avatar_url: string | null;
  category: string | null;
  created_at: string;
  deactivated_at: string | null;
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

export type AdminCommunityRule = {
  active: boolean;
  created_at: string;
  description: string;
  id: string;
  position: number;
  title: string;
  updated_at: string;
};

export type AdminCommunitySummary = {
  comments_count: number;
  members_count: number;
  popular_posts_count: number;
  posts_count: number;
};

export type AdminCommunityHighlightCounters = {
  accesses_count: number;
  patient_comments_count: number;
  patient_posts_count: number;
  psychologist_posts_count: number;
  psychologist_replies_count: number;
  reports_count: number;
  source: "community_post+post_reply+post_report+page_view_event";
};

export type AdminCommunityTodaySummary = {
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

export type AdminCommunityUrgentPendingReport = {
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
  created_at: string;
  id: string;
  reason_label: string;
  reporter: {
    label: string;
    name: string;
    role: string;
  };
  status_label: string;
};

export type AdminCommunityUrgentSummary = {
  pending_reports_count: number;
  pending_reports_last_reported_at: string | null;
  pending_reports: AdminCommunityUrgentPendingReport[];
  source: "post_report";
};

export type AdminCommunityPerformanceMetric = {
  change_percent: number | null;
  label: string;
  trend: "down" | "flat" | "unavailable" | "up";
  value: number;
};

export type AdminCommunityPerformancePoint = {
  comments: number;
  date: string;
  members: number;
  posts: number;
  reports: number;
};

export type AdminCommunityTopMentor = {
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

export type AdminCommunityContentAuthor = {
  anonymous: boolean;
  avatar: string | null;
  gender: string | null;
  id: string;
  name: string;
  role: string;
  verified: boolean;
};

export type AdminCommunityPopularPost = {
  author: AdminCommunityContentAuthor;
  author_name: string;
  author_role: string;
  comments_count: number;
  created_at: string;
  id: string;
  saves_count: number;
  title: string;
  upvotes_count: number;
};

export type AdminCommunityDetail = {
  community: AdminCommunityIdentity;
  highlight_counters: AdminCommunityHighlightCounters;
  performance: {
    days: number;
    metrics: {
      comments: AdminCommunityPerformanceMetric;
      new_members: AdminCommunityPerformanceMetric;
      new_posts: AdminCommunityPerformanceMetric;
      reports: AdminCommunityPerformanceMetric;
    };
    points: AdminCommunityPerformancePoint[];
  };
  popular_posts: AdminCommunityPopularPost[];
  rules: AdminCommunityRule[];
  summary: AdminCommunitySummary;
  today_summary: AdminCommunityTodaySummary;
  top_mentors: AdminCommunityTopMentor[];
  urgent_summary: AdminCommunityUrgentSummary;
};

export type AdminCommunityPaginationQuery = {
  limit?: number;
  page?: number;
  q?: string;
};

export type AdminCommunitiesListSort = "activity" | "members" | "name" | "posts" | "recent";

export type AdminCommunitiesListQuery = AdminCommunityPaginationQuery & {
  category?: string;
  sort?: AdminCommunitiesListSort;
};

export type AdminCommunitiesListFilterOption = {
  count: number;
  id: string;
  label: string;
};

export type AdminCommunitiesListItem = {
  active: boolean;
  activity_count: number;
  avatar_url: string | null;
  category: string | null;
  comments_count: number;
  created_at: string;
  deactivated_at: string | null;
  description: string | null;
  detail_url: string;
  id: string;
  last_activity_at: string | null;
  members_count: number;
  name: string;
  posts_count: number;
  reports_count: number;
  slug: string;
  updated_at: string;
  visual_primary_color: string | null;
};

export type AdminCommunitiesList = {
  active_filters_count: number;
  count: number;
  data: AdminCommunitiesListItem[];
  filters: {
    categories: AdminCommunitiesListFilterOption[];
  };
  page: number;
  pages: number;
  per_page: number;
  sort: AdminCommunitiesListSort;
  source: "community+community_member+community_post+post_reply+post_report";
};
