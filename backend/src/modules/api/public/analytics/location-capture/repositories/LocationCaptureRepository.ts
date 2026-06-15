import type { Prisma } from "@/external/generated/prisma/client";
import prisma, { type ORM } from "@/infra/database/prisma";
import type { visitor_location } from "@/interfaces/objects";
import type {
  FindRecentVisitorLocationInput,
  StoreVisitorLocationInput,
} from "../DTOs/ILocationCaptureDTO";
import type { ILocationCaptureRepository } from "./interfaces/ILocationCaptureRepository";

export class LocationCaptureRepository implements ILocationCaptureRepository {
  readonly repository: ORM["visitor_location"];

  constructor() {
    this.repository = prisma.visitor_location;
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
}
