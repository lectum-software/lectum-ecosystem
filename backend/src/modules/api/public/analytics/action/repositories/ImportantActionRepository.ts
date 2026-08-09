import type { Prisma } from "@/external/generated/prisma/client";
import prisma, { type ORM } from "@/infra/database/prisma";
import type { important_action_event, visitor_session } from "@/interfaces/objects";
import {
  linkVisitorSessionsToUser,
  upsertOwnedVisitorSession,
} from "../../helpers/visitor-session";
import type { CreateImportantActionInput } from "../DTOs/IImportantActionDTO";
import type { IImportantActionRepository } from "./interfaces/IImportantActionRepository";

export class ImportantActionRepository implements IImportantActionRepository {
  readonly repository: ORM["important_action_event"];

  constructor() {
    this.repository = prisma.important_action_event;
  }

  async create(input: CreateImportantActionInput): Promise<important_action_event> {
    const args: Prisma.important_action_eventCreateArgs = {
      data: {
        visitor_id: input.visitorId,
        session_id: input.sessionId,
        user_id: input.userId ?? null,
        action_type: input.actionType,
        path: input.path ?? null,
        page_kind: input.pageKind,
        target_type: input.targetType ?? null,
        target_id: input.targetId ?? null,
        display_mode: input.displayMode,
        occurred_at: input.occurredAt,
      },
    };

    return this.repository.create(args);
  }

  async linkActionsToUser(visitorId: string, userId: string): Promise<number> {
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
    return linkVisitorSessionsToUser(visitorId, userId);
  }

  async upsertSession(
    visitorId: string,
    sessionId: string,
    userId?: string | null,
  ): Promise<visitor_session | null> {
    return upsertOwnedVisitorSession({
      sessionId,
      userId,
      visitorId,
    });
  }
}
