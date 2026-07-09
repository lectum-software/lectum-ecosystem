import type { Prisma } from "@/external/generated/prisma/client";
import prisma, { type ORM } from "@/infra/database/prisma";
import type { page_view_event, visitor_session } from "@/interfaces/objects";
import type {
  CreatePageViewInput,
  PageViewDurationInput,
  PageViewEntry,
} from "../DTOs/IPageViewTrackingDTO";
import type { IPageViewTrackingRepository } from "./interfaces/IPageViewTrackingRepository";

export class PageViewTrackingRepository implements IPageViewTrackingRepository {
  readonly repository: ORM["page_view_event"];
  readonly sessionRepository: ORM["visitor_session"];

  constructor() {
    this.repository = prisma.page_view_event;
    this.sessionRepository = prisma.visitor_session;
  }

  async findSessionEntry(visitorId: string, sessionId: string): Promise<PageViewEntry> {
    return this.repository.findFirst({
      where: {
        deleted: false,
        visitor_id: visitorId,
        session_id: sessionId,
      },
      orderBy: {
        occurred_at: "asc",
      },
      select: {
        id: true,
        path: true,
        entry_path: true,
      },
    });
  }

  async linkPageViewsToUser(visitorId: string, userId: string): Promise<number> {
    const result = await this.repository.updateMany({
      where: {
        deleted: false,
        visitor_id: visitorId,
        user_id: null,
      },
      data: {
        user_id: userId,
      },
    });

    return result.count;
  }

  async linkSessionsToUser(visitorId: string, userId: string): Promise<number> {
    const result = await this.sessionRepository.updateMany({
      where: {
        deleted: false,
        visitor_id: visitorId,
        user_id: null,
      },
      data: {
        user_id: userId,
      },
    });

    return result.count;
  }

  async upsertSession(
    visitorId: string,
    sessionId: string,
    userId?: string | null,
  ): Promise<visitor_session> {
    const now = new Date();
    const updateData: Prisma.visitor_sessionUpdateInput = {
      last_seen_at: now,
    };

    if (userId) {
      updateData.user = {
        connect: {
          id: userId,
        },
      };
    }

    return this.sessionRepository.upsert({
      where: {
        visitor_id_session_id: {
          visitor_id: visitorId,
          session_id: sessionId,
        },
      },
      create: {
        visitor_id: visitorId,
        session_id: sessionId,
        user_id: userId ?? null,
        device_type: "unknown",
        first_seen_at: now,
        last_seen_at: now,
      },
      update: updateData,
    });
  }

  async create(input: CreatePageViewInput): Promise<page_view_event> {
    const args: Prisma.page_view_eventCreateArgs = {
      data: {
        visitor_id: input.visitorId,
        session_id: input.sessionId,
        user_id: input.userId ?? null,
        path: input.path,
        normalized_path: input.normalizedPath,
        title: input.title ?? null,
        referrer_host: input.referrerHost ?? null,
        traffic_source: input.trafficSource,
        traffic_medium: input.trafficMedium ?? null,
        utm_source: input.utmSource ?? null,
        utm_medium: input.utmMedium ?? null,
        utm_campaign: input.utmCampaign ?? null,
        utm_content: input.utmContent ?? null,
        utm_term: input.utmTerm ?? null,
        page_kind: input.pageKind,
        target_type: input.targetType ?? null,
        target_id: input.targetId ?? null,
        display_mode: input.displayMode,
        is_entry: input.isEntry,
        entry_path: input.entryPath ?? null,
        occurred_at: input.occurredAt,
      },
    };

    return this.repository.create(args);
  }

  async updateDuration(input: PageViewDurationInput): Promise<page_view_event | null> {
    const event = await this.repository.findFirst({
      where: {
        deleted: false,
        id: input.id,
        visitor_id: input.visitorId,
        session_id: input.sessionId,
      },
      select: {
        id: true,
        duration_seconds: true,
      },
    });

    if (!event) return null;

    const durationSeconds = Math.max(event.duration_seconds ?? 0, input.durationSeconds);

    return this.repository.update({
      where: {
        id: event.id,
      },
      data: {
        duration_seconds: durationSeconds,
      },
    });
  }
}
