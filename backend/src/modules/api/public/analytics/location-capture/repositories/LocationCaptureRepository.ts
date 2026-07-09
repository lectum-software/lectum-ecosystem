import type { Prisma } from "@/external/generated/prisma/client";
import prisma, { type ORM } from "@/infra/database/prisma";
import type { visitor_location, visitor_session } from "@/interfaces/objects";
import type {
  FindRecentVisitorLocationInput,
  StoreVisitorLocationInput,
  UpsertVisitorSessionInput,
} from "../DTOs/ILocationCaptureDTO";
import type { ILocationCaptureRepository } from "./interfaces/ILocationCaptureRepository";

export class LocationCaptureRepository implements ILocationCaptureRepository {
  readonly repository: ORM["visitor_location"];
  readonly sessionRepository: ORM["visitor_session"];

  constructor() {
    this.repository = prisma.visitor_location;
    this.sessionRepository = prisma.visitor_session;
  }

  async findRecent(input: FindRecentVisitorLocationInput): Promise<visitor_location | null> {
    const recentScope: Prisma.visitor_locationWhereInput[] = input.userId
      ? [{ user_id: input.userId }, { visitor_id: input.visitorId, user_id: null }]
      : [{ visitor_id: input.visitorId, user_id: null }];

    return this.repository.findFirst({
      where: {
        deleted: false,
        createdAt: {
          gte: input.since,
        },
        OR: recentScope,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
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

  async linkVisitorToUser(visitorId: string, userId: string): Promise<number> {
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

  async store(input: StoreVisitorLocationInput): Promise<visitor_location> {
    const args: Prisma.visitor_locationCreateArgs = {
      data: {
        visitor_id: input.visitorId,
        session_id: input.sessionId ?? null,
        user_id: input.userId ?? null,
        city: input.city ?? null,
        state: input.state ?? null,
        country: input.country ?? null,
        source: input.source,
        confidence: input.confidence ?? null,
        provider: input.provider ?? null,
      },
    };

    return this.repository.create(args);
  }

  async upsertSession(input: UpsertVisitorSessionInput): Promise<visitor_session> {
    const now = new Date();
    const updateData: Prisma.visitor_sessionUpdateInput = {
      last_seen_at: now,
    };

    if (input.userId) {
      updateData.user = {
        connect: {
          id: input.userId,
        },
      };
    }

    if (input.deviceType !== undefined) {
      updateData.device_type = input.deviceType;
    }

    if (input.os !== undefined) {
      updateData.os = input.os;
    }

    if (input.browser !== undefined) {
      updateData.browser = input.browser;
    }

    if (input.viewportWidth !== undefined) {
      updateData.viewport_width = input.viewportWidth;
    }

    if (input.viewportHeight !== undefined) {
      updateData.viewport_height = input.viewportHeight;
    }

    return this.sessionRepository.upsert({
      where: {
        visitor_id_session_id: {
          visitor_id: input.visitorId,
          session_id: input.sessionId,
        },
      },
      create: {
        visitor_id: input.visitorId,
        session_id: input.sessionId,
        user_id: input.userId ?? null,
        device_type: input.deviceType ?? "unknown",
        os: input.os ?? null,
        browser: input.browser ?? null,
        viewport_width: input.viewportWidth ?? null,
        viewport_height: input.viewportHeight ?? null,
        first_seen_at: now,
        last_seen_at: now,
      },
      update: updateData,
    });
  }
}
