import type { page_view_event, visitor_session } from "@/interfaces/objects";
import type {
  CreatePageViewInput,
  PageViewDurationInput,
  PageViewEntry,
} from "../../DTOs/IPageViewTrackingDTO";

export interface IPageViewTrackingRepository {
  create(input: CreatePageViewInput): Promise<page_view_event>;
  findSessionEntry(visitorId: string, sessionId: string): Promise<PageViewEntry>;
  linkPageViewsToUser(visitorId: string, userId: string): Promise<number>;
  linkSessionsToUser(visitorId: string, userId: string): Promise<number>;
  updateDuration(input: PageViewDurationInput): Promise<page_view_event | null>;
  upsertSession(
    visitorId: string,
    sessionId: string,
    userId?: string | null,
  ): Promise<visitor_session>;
}
