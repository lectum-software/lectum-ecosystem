import prisma from "@/infra/database/prisma";
import {
  type AdminPsychologistEngagementProfile,
  type AdminPsychologistPlatformSessionRecord,
  PROFILE_PAGE_SOURCE,
  platformSessionSelect,
  psychologistSelect,
  SEARCH_RESULT_SOURCE,
} from "../support/engagement-selects";

export class AdminPsychologistEngagementProfileRepository {
  async findPsychologist(id: string): Promise<AdminPsychologistEngagementProfile | null> {
    return prisma.psychologist_profile.findFirst({
      where: {
        deleted: false,
        OR: [{ id }, { user_id: id }],
        user: {
          active: true,
          deleted: false,
          role: "psicologo",
        },
      },
      select: psychologistSelect,
    });
  }

  async listProfileConversionBenchmarkProfiles() {
    return prisma.psychologist_profile.findMany({
      select: {
        user: {
          select: {
            createdAt: true,
            id: true,
          },
        },
        user_id: true,
      },
      where: {
        deleted: false,
        user: {
          active: true,
          deleted: false,
          role: "psicologo",
        },
      },
    });
  }

  async listWhatsappClickCountsByPsychologist(from: Date, to: Date) {
    return prisma.contact_request.groupBy({
      by: ["psychologist_id"],
      where: {
        channel: "whatsapp",
        createdAt: { gte: from, lte: to },
        deleted: false,
        psychologist: {
          active: true,
          deleted: false,
          role: "psicologo",
        },
      },
      _count: {
        _all: true,
      },
    });
  }

  async listPublicProfileAttentionSecondsByPsychologists(
    psychologistIds: string[],
    from: Date,
    to: Date,
  ) {
    if (psychologistIds.length === 0) return [];

    const views = await prisma.page_view_event.findMany({
      select: {
        duration_seconds: true,
        target_id: true,
        user_id: true,
      },
      where: {
        deleted: false,
        duration_seconds: {
          gt: 0,
        },
        occurred_at: { gte: from, lte: to },
        page_kind: "psychologist_profile",
        target_id: {
          in: psychologistIds,
        },
        target_type: "psychologist",
      },
    });
    const attentionSecondsByPsychologist = new Map<string, number>();

    for (const view of views) {
      if (!view.target_id) continue;
      if (view.user_id && view.user_id === view.target_id) continue;

      attentionSecondsByPsychologist.set(
        view.target_id,
        (attentionSecondsByPsychologist.get(view.target_id) ?? 0) + (view.duration_seconds ?? 0),
      );
    }

    return [...attentionSecondsByPsychologist].map(([psychologist_id, attention_seconds]) => ({
      attention_seconds,
      psychologist_id,
    }));
  }

  async listCommunityContentAttentionSecondsByPsychologists(
    psychologistIds: string[],
    from: Date,
    to: Date,
  ) {
    if (psychologistIds.length === 0) return [];

    const records = await prisma.content_attention_session.groupBy({
      by: ["psychologist_id"],
      where: {
        attention_seconds: {
          gt: 0,
        },
        createdAt: { gte: from, lte: to },
        deleted: false,
        psychologist_id: {
          in: psychologistIds,
        },
        target_type: {
          in: ["post", "reply"],
        },
      },
      _sum: {
        attention_seconds: true,
      },
    });

    return records.map((record) => ({
      attention_seconds: record._sum.attention_seconds ?? 0,
      psychologist_id: record.psychologist_id,
    }));
  }

  async listProfileVideoAttentionSecondsByPsychologists(
    psychologistIds: string[],
    from: Date,
    to: Date,
  ) {
    if (psychologistIds.length === 0) return [];

    const records = await prisma.profile_video_watch_session.groupBy({
      by: ["psychologist_id"],
      where: {
        createdAt: { gte: from, lte: to },
        deleted: false,
        psychologist_id: {
          in: psychologistIds,
        },
        watched_seconds: {
          gt: 0,
        },
      },
      _sum: {
        watched_seconds: true,
      },
    });

    return records.map((record) => ({
      attention_seconds: record._sum.watched_seconds ?? 0,
      psychologist_id: record.psychologist_id,
    }));
  }

  async listProfileViews(psychologistId: string, from: Date, to: Date) {
    return prisma.profile_view_event.findMany({
      where: {
        createdAt: { gte: from, lte: to },
        deleted: false,
        psychologist_id: psychologistId,
        source: PROFILE_PAGE_SOURCE,
      },
      select: {
        createdAt: true,
        device_id: true,
        viewer_id: true,
      },
    });
  }

  async listPlatformPageViews(userId: string, from: Date, to: Date) {
    return prisma.page_view_event.findMany({
      orderBy: {
        occurred_at: "asc",
      },
      select: {
        duration_seconds: true,
        normalized_path: true,
        occurred_at: true,
        page_kind: true,
        path: true,
        session_id: true,
        user_id: true,
      },
      where: {
        deleted: false,
        occurred_at: { gte: from, lte: to },
        user_id: userId,
        user: {
          active: true,
          deleted: false,
          role: "psicologo",
        },
      },
    });
  }

  async listPlatformSessions(
    userId: string,
    from: Date,
    to: Date,
  ): Promise<AdminPsychologistPlatformSessionRecord[]> {
    return prisma.visitor_session.findMany({
      orderBy: {
        last_seen_at: "asc",
      },
      select: platformSessionSelect,
      where: {
        deleted: false,
        first_seen_at: {
          lte: to,
        },
        last_seen_at: {
          gte: from,
        },
        user_id: userId,
        user: {
          active: true,
          deleted: false,
          role: "psicologo",
        },
      },
    });
  }

  async findPwaInstallAction(userId: string) {
    return prisma.important_action_event.findFirst({
      orderBy: {
        occurred_at: "asc",
      },
      select: {
        occurred_at: true,
      },
      where: {
        action_type: "pwa_installed",
        deleted: false,
        user_id: userId,
        user: {
          active: true,
          deleted: false,
          role: "psicologo",
        },
      },
    });
  }

  async listPublicProfilePageViews(userId: string, from: Date, to: Date) {
    return prisma.page_view_event.findMany({
      orderBy: {
        occurred_at: "asc",
      },
      select: {
        occurred_at: true,
        session_id: true,
        traffic_source: true,
        user_id: true,
        visitor_id: true,
      },
      where: {
        deleted: false,
        occurred_at: { gte: from, lte: to },
        page_kind: "psychologist_profile",
        target_id: userId,
        target_type: "psychologist",
      },
    });
  }

  async listPublicProfileAttentionSessions(psychologistId: string, from: Date, to: Date) {
    const views = await prisma.page_view_event.findMany({
      orderBy: {
        occurred_at: "asc",
      },
      select: {
        duration_seconds: true,
        occurred_at: true,
        user_id: true,
      },
      where: {
        deleted: false,
        duration_seconds: {
          gt: 0,
        },
        occurred_at: { gte: from, lte: to },
        page_kind: "psychologist_profile",
        target_id: psychologistId,
        target_type: "psychologist",
      },
    });

    return views.flatMap((view) => {
      if (view.user_id && view.user_id === psychologistId) return [];

      return [
        {
          attention_seconds: view.duration_seconds ?? 0,
          createdAt: view.occurred_at,
        },
      ];
    });
  }

  async listCommunityContentAttentionSessions(psychologistId: string, from: Date, to: Date) {
    return prisma.content_attention_session.findMany({
      orderBy: {
        createdAt: "asc",
      },
      select: {
        attention_seconds: true,
        community_id: true,
        createdAt: true,
        target_type: true,
      },
      where: {
        attention_seconds: {
          gt: 0,
        },
        createdAt: { gte: from, lte: to },
        deleted: false,
        psychologist_id: psychologistId,
        target_type: {
          in: ["post", "reply"],
        },
      },
    });
  }

  async listSearchResultImpressions(psychologistId: string, from: Date, to: Date) {
    return prisma.profile_view_event.findMany({
      orderBy: {
        createdAt: "asc",
      },
      where: {
        createdAt: { gte: from, lte: to },
        deleted: false,
        psychologist_id: psychologistId,
        source: SEARCH_RESULT_SOURCE,
      },
      select: {
        createdAt: true,
        search_result_position: true,
      },
    });
  }

  async listWhatsappClicks(psychologistId: string, from: Date, to: Date) {
    return prisma.contact_request.findMany({
      where: {
        channel: "whatsapp",
        createdAt: { gte: from, lte: to },
        deleted: false,
        psychologist_id: psychologistId,
      },
      select: {
        createdAt: true,
        user_id: true,
      },
    });
  }

  async listFavorites(psychologistId: string, from: Date, to: Date) {
    return prisma.psychologist_favorite.findMany({
      where: {
        createdAt: { gte: from, lte: to },
        deleted: false,
        psychologist_id: psychologistId,
      },
      select: {
        createdAt: true,
        user_id: true,
      },
    });
  }

  async listImportantPsychologistWhatsappActions(psychologistId: string, from: Date, to: Date) {
    return prisma.important_action_event.findMany({
      orderBy: {
        occurred_at: "asc",
      },
      select: {
        occurred_at: true,
        session_id: true,
        user_id: true,
        visitor_id: true,
      },
      where: {
        action_type: "whatsapp_click",
        deleted: false,
        occurred_at: { gte: from, lte: to },
        target_id: psychologistId,
        target_type: "psychologist",
      },
    });
  }

  async listWhatsappTrafficActions(from: Date, to: Date) {
    return prisma.important_action_event.findMany({
      orderBy: {
        occurred_at: "asc",
      },
      select: {
        action_type: true,
        occurred_at: true,
        page_kind: true,
        path: true,
        session_id: true,
        target_id: true,
        target_type: true,
        user_id: true,
      },
      where: {
        action_type: {
          in: ["psychologist_video_whatsapp_click", "whatsapp_click"],
        },
        deleted: false,
        occurred_at: { gte: from, lte: to },
      },
    });
  }
}
