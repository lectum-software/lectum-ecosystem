import type { AdminTrafficDateRange } from "../../DTOs/IAdminTrafficSummaryDTO";

export type TrafficSessionRecord = {
  device_type: string;
  first_seen_at: Date;
  last_seen_at: Date;
  session_id: string;
  user: { role: string } | null;
  user_id: string | null;
  visitor_id: string;
};

export type TrafficPageViewRecord = {
  display_mode: string;
  duration_seconds: number | null;
  entry_path: string | null;
  is_entry: boolean;
  normalized_path: string;
  occurred_at: Date;
  page_kind: string;
  path: string;
  referrer_host: string | null;
  session_id: string;
  target_id: string | null;
  target_type: string | null;
  traffic_medium: string | null;
  traffic_source: string;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_medium: string | null;
  utm_source: string | null;
  utm_term: string | null;
  user_id: string | null;
  visitor_id: string;
};

export type TrafficActionRecord = {
  action_type: string;
  occurred_at: Date;
  page_kind: string;
  session_id: string;
  target_id: string | null;
  target_type: string | null;
  user_id: string | null;
  visitor_id: string;
};

export type TrafficUserRecord = {
  createdAt: Date;
  id: string;
  role: string;
};

export type TrafficDomainConversionKind =
  | "community_posts"
  | "post_replies"
  | "pwa_installs"
  | "subscriptions_started"
  | "whatsapp_clicks";

export type TrafficDomainConversionRecord = {
  kind: TrafficDomainConversionKind;
  occurred_at: Date;
  user_id: string | null;
  visitor_id: string | null;
};

export type TrafficLocationRecord = {
  city: string | null;
  country: string | null;
  session_id: string | null;
  state: string | null;
  visitor_id: string;
};

export type TrafficCommunityLabelRecord = {
  name: string;
  slug: string;
};

export type TrafficPsychologistLabelRecord = {
  id: string;
  name: string;
};

export type TrafficPostLabelRecord = {
  community: {
    name: string;
    slug: string;
  };
  id: string;
  title: string;
};

export interface IAdminTrafficRepository {
  countContactRequests(range: AdminTrafficDateRange): Promise<number>;
  countPostReplies(range: AdminTrafficDateRange): Promise<number>;
  countPublishedCommunityPosts(range: AdminTrafficDateRange): Promise<number>;
  countSubscriptionsStarted(range: AdminTrafficDateRange): Promise<number>;
  countUsersByRole(role: "paciente" | "psicologo", range: AdminTrafficDateRange): Promise<number>;
  findEarliestTrafficDate(): Promise<Date | null>;
  listActions(range: AdminTrafficDateRange): Promise<TrafficActionRecord[]>;
  listCommunitiesBySlugs(slugs: string[]): Promise<TrafficCommunityLabelRecord[]>;
  listDomainConversions(range: AdminTrafficDateRange): Promise<TrafficDomainConversionRecord[]>;
  listLocations(range: AdminTrafficDateRange): Promise<TrafficLocationRecord[]>;
  listPageViews(range: AdminTrafficDateRange): Promise<TrafficPageViewRecord[]>;
  listPostsByIds(ids: string[]): Promise<TrafficPostLabelRecord[]>;
  listPsychologistsByIds(ids: string[]): Promise<TrafficPsychologistLabelRecord[]>;
  listSessions(range: AdminTrafficDateRange): Promise<TrafficSessionRecord[]>;
  listUsersByIds(ids: string[]): Promise<TrafficUserRecord[]>;
  listUsersCreated(range: AdminTrafficDateRange): Promise<TrafficUserRecord[]>;
  listVisitorSessionsBefore(
    visitorIds: string[],
    before: Date,
  ): Promise<Array<{ visitor_id: string }>>;
}
