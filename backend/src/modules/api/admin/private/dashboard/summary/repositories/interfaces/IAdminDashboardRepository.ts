import type { AdminDashboardDateRange } from "../../DTOs/IAdminDashboardSummaryDTO";

export type DashboardCommunityAuthorRole = "paciente" | "psicologo";

export interface IAdminDashboardRepository {
  countPendingReports(range: AdminDashboardDateRange): Promise<number>;
  countVisitorSessions(range: AdminDashboardDateRange): Promise<number>;
  countUsersByRole(role: "paciente" | "psicologo", range: AdminDashboardDateRange): Promise<number>;
  findEarliestDashboardDate(): Promise<Date | null>;
  listCommunityPostDates(
    range: AdminDashboardDateRange,
    authorRole?: DashboardCommunityAuthorRole,
  ): Promise<Array<{ createdAt: Date }>>;
  listPaidSubscriptionsUntil(end: Date): Promise<
    Array<{
      createdAt: Date;
      current_period_end: Date | null;
      id: string;
      source: string;
      status: string;
      plan: {
        interval: string;
        name: string;
        price_cents: number;
        slug: string;
      };
    }>
  >;
  listPendingReports(range: AdminDashboardDateRange): Promise<
    Array<{
      createdAt: Date;
      description: string | null;
      id: string;
      reason: string;
      status: string;
      target_id: string;
      target_type: string;
      post: {
        content: string;
        title: string;
        community: { name: string };
      };
      reply: {
        content: string;
        title: string | null;
        post: {
          title: string;
          community: { name: string };
        };
      } | null;
      reporter: {
        role: string;
      };
    }>
  >;
  listPostReplyDates(
    range: AdminDashboardDateRange,
    authorRole?: DashboardCommunityAuthorRole,
  ): Promise<Array<{ createdAt: Date }>>;
  listIntentConversionSignals(range: AdminDashboardDateRange): Promise<{
    favorites: Array<{ createdAt: Date; psychologist_id: string; user_id: string }>;
    profileViews: Array<{ createdAt: Date; psychologist_id: string; viewer_id: string | null }>;
    whatsappClicks: Array<{ createdAt: Date; psychologist_id: string; user_id: string | null }>;
  }>;
  listPsychologistConversionEvents(range: AdminDashboardDateRange): Promise<{
    favorites: Array<{ createdAt: Date; psychologist_id: string }>;
    profileViews: Array<{ createdAt: Date; psychologist_id: string }>;
    whatsappClicks: Array<{ createdAt: Date; psychologist_id: string }>;
  }>;
  listPsychologistConversionProfiles(): Promise<
    Array<{
      user: {
        createdAt: Date;
        id: string;
      };
      user_id: string;
    }>
  >;
  listVisitorLocations(range: AdminDashboardDateRange): Promise<Array<{ country: string | null }>>;
  listVisitorSessions(range: AdminDashboardDateRange): Promise<Array<{ device_type: string }>>;
}
