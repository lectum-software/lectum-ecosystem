import type { important_action_event, visitor_session } from "@/interfaces/objects";
import type { CreateImportantActionInput } from "../../DTOs/IImportantActionDTO";

export interface IImportantActionRepository {
  create(input: CreateImportantActionInput): Promise<important_action_event>;
  linkActionsToUser(visitorId: string, userId: string): Promise<number>;
  linkSessionsToUser(visitorId: string, userId: string): Promise<number>;
  upsertSession(
    visitorId: string,
    sessionId: string,
    userId?: string | null,
  ): Promise<visitor_session>;
}
