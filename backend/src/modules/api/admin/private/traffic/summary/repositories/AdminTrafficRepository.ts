import prisma from "@/infra/database/prisma";
import type { AdminTrafficDateRange } from "../DTOs/IAdminTrafficSummaryDTO";
import type {
  IAdminTrafficRepository,
  TrafficActionRecord,
  TrafficCommunityLabelRecord,
  TrafficLocationRecord,
  TrafficPageViewRecord,
  TrafficPostLabelRecord,
  TrafficPsychologistLabelRecord,
  TrafficSessionRecord,
} from "./interfaces/IAdminTrafficRepository";

const occurredAtWhere = (range: AdminTrafficDateRange) => ({
  gte: range.start,
  lte: range.end,
});

const createdAtWhere = occurredAtWhere;

export class AdminTrafficRepository implements IAdminTrafficRepository {
  async findEarliestTrafficDate(): Promise<Date | null> {
    const [
      firstAction,
      firstCommunityPost,
      firstContactRequest,
      firstLocation,
      firstPageView,
      firstPostReply,
      firstSession,
      firstSubscription,
      firstUser,
    ] = await Promise.all([
      prisma.important_action_event.findFirst({
        orderBy: { occurred_at: "asc" },
        select: { occurred_at: true },
        where: { deleted: false },
      }),
      prisma.community_post.findFirst({
        orderBy: { createdAt: "asc" },
        select: { createdAt: true },
        where: { deleted: false, status: "publicado" },
      }),
      prisma.contact_request.findFirst({
        orderBy: { createdAt: "asc" },
        select: { createdAt: true },
        where: { channel: "whatsapp", deleted: false },
      }),
      prisma.visitor_location.findFirst({
        orderBy: { createdAt: "asc" },
        select: { createdAt: true },
        where: { deleted: false },
      }),
      prisma.page_view_event.findFirst({
        orderBy: { occurred_at: "asc" },
        select: { occurred_at: true },
        where: { deleted: false },
      }),
      prisma.post_reply.findFirst({
        orderBy: { createdAt: "asc" },
        select: { createdAt: true },
        where: { deleted: false },
      }),
      prisma.visitor_session.findFirst({
        orderBy: { first_seen_at: "asc" },
        select: { first_seen_at: true },
        where: { deleted: false },
      }),
      prisma.professional_subscription.findFirst({
        orderBy: { createdAt: "asc" },
        select: { createdAt: true },
        where: {
          deleted: false,
          plan: {
            deleted: false,
            price_cents: { gt: 0 },
            slug: { not: "gratuito" },
          },
          source: { not: "admin_grant" },
        },
      }),
      prisma.user.findFirst({
        orderBy: { createdAt: "asc" },
        select: { createdAt: true },
        where: { active: true, deleted: false, role: { in: ["paciente", "psicologo"] } },
      }),
    ]);

    const dates = [
      firstAction?.occurred_at,
      firstCommunityPost?.createdAt,
      firstContactRequest?.createdAt,
      firstLocation?.createdAt,
      firstPageView?.occurred_at,
      firstPostReply?.createdAt,
      firstSession?.first_seen_at,
      firstSubscription?.createdAt,
      firstUser?.createdAt,
    ].filter((date): date is Date => Boolean(date));

    return dates.reduce<Date | null>((earliest, date) => {
      if (!earliest || date < earliest) return date;

      return earliest;
    }, null);
  }

  async countContactRequests(range: AdminTrafficDateRange): Promise<number> {
    return prisma.contact_request.count({
      where: {
        channel: "whatsapp",
        createdAt: createdAtWhere(range),
        deleted: false,
      },
    });
  }

  async countPostReplies(range: AdminTrafficDateRange): Promise<number> {
    return prisma.post_reply.count({
      where: {
        createdAt: createdAtWhere(range),
        deleted: false,
      },
    });
  }

  async countPublishedCommunityPosts(range: AdminTrafficDateRange): Promise<number> {
    return prisma.community_post.count({
      where: {
        createdAt: createdAtWhere(range),
        deleted: false,
        status: "publicado",
      },
    });
  }

  async countSubscriptionsStarted(range: AdminTrafficDateRange): Promise<number> {
    return prisma.professional_subscription.count({
      where: {
        createdAt: createdAtWhere(range),
        deleted: false,
        plan: {
          deleted: false,
          price_cents: {
            gt: 0,
          },
          slug: {
            not: "gratuito",
          },
        },
        source: {
          not: "admin_grant",
        },
      },
    });
  }

  async countUsersByRole(
    role: "paciente" | "psicologo",
    range: AdminTrafficDateRange,
  ): Promise<number> {
    return prisma.user.count({
      where: {
        active: true,
        createdAt: createdAtWhere(range),
        deleted: false,
        role,
      },
    });
  }

  async listActions(range: AdminTrafficDateRange): Promise<TrafficActionRecord[]> {
    return prisma.important_action_event.findMany({
      orderBy: {
        occurred_at: "asc",
      },
      where: {
        deleted: false,
        occurred_at: occurredAtWhere(range),
      },
      select: {
        action_type: true,
        occurred_at: true,
        page_kind: true,
        session_id: true,
        target_id: true,
        target_type: true,
        user_id: true,
        visitor_id: true,
      },
    });
  }

  async listCommunitiesBySlugs(slugs: string[]): Promise<TrafficCommunityLabelRecord[]> {
    if (slugs.length === 0) return [];

    return prisma.community.findMany({
      where: {
        deleted: false,
        slug: {
          in: slugs,
        },
      },
      select: {
        name: true,
        slug: true,
      },
    });
  }

  async listLocations(range: AdminTrafficDateRange): Promise<TrafficLocationRecord[]> {
    return prisma.visitor_location.findMany({
      where: {
        createdAt: createdAtWhere(range),
        deleted: false,
      },
      select: {
        city: true,
        country: true,
        session_id: true,
        state: true,
        visitor_id: true,
      },
    });
  }

  async listPageViews(range: AdminTrafficDateRange): Promise<TrafficPageViewRecord[]> {
    return prisma.page_view_event.findMany({
      orderBy: {
        occurred_at: "asc",
      },
      where: {
        deleted: false,
        occurred_at: occurredAtWhere(range),
      },
      select: {
        display_mode: true,
        duration_seconds: true,
        entry_path: true,
        is_entry: true,
        normalized_path: true,
        occurred_at: true,
        page_kind: true,
        path: true,
        referrer_host: true,
        session_id: true,
        target_id: true,
        target_type: true,
        traffic_medium: true,
        traffic_source: true,
        utm_campaign: true,
        utm_content: true,
        utm_medium: true,
        utm_source: true,
        utm_term: true,
        user_id: true,
        visitor_id: true,
      },
    });
  }

  async listPostsByIds(ids: string[]): Promise<TrafficPostLabelRecord[]> {
    if (ids.length === 0) return [];

    return prisma.community_post.findMany({
      where: {
        deleted: false,
        id: {
          in: ids,
        },
      },
      select: {
        community: {
          select: {
            name: true,
            slug: true,
          },
        },
        id: true,
        title: true,
      },
    });
  }

  async listPsychologistsByIds(ids: string[]): Promise<TrafficPsychologistLabelRecord[]> {
    if (ids.length === 0) return [];

    return prisma.user.findMany({
      where: {
        active: true,
        deleted: false,
        id: {
          in: ids,
        },
        role: "psicologo",
      },
      select: {
        id: true,
        name: true,
        psychologist_profile: {
          select: {
            crp: true,
          },
        },
      },
    });
  }

  async listSessions(range: AdminTrafficDateRange): Promise<TrafficSessionRecord[]> {
    return prisma.visitor_session.findMany({
      where: {
        deleted: false,
        first_seen_at: {
          lte: range.end,
        },
        last_seen_at: {
          gte: range.start,
        },
      },
      select: {
        device_type: true,
        first_seen_at: true,
        last_seen_at: true,
        session_id: true,
        user: {
          select: {
            role: true,
          },
        },
        user_id: true,
        visitor_id: true,
      },
    });
  }

  async listVisitorSessionsBefore(
    visitorIds: string[],
    before: Date,
  ): Promise<Array<{ visitor_id: string }>> {
    if (visitorIds.length === 0) return [];

    return prisma.visitor_session.findMany({
      distinct: ["visitor_id"],
      where: {
        deleted: false,
        first_seen_at: {
          lt: before,
        },
        visitor_id: {
          in: visitorIds,
        },
      },
      select: {
        visitor_id: true,
      },
    });
  }
}
