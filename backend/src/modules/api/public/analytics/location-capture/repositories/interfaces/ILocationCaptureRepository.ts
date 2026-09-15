import type { visitor_location, visitor_session } from "@/interfaces/objects";
import type {
  FindRecentVisitorLocationInput,
  StoreVisitorLocationInput,
  UpsertVisitorSessionInput,
} from "../../DTOs/ILocationCaptureDTO";

export interface ILocationCaptureRepository {
  findRecent(input: FindRecentVisitorLocationInput): Promise<visitor_location | null>;
  linkSessionsToUser(visitorId: string, userId: string): Promise<number>;
  linkVisitorToUser(visitorId: string, userId: string): Promise<number>;
  store(input: StoreVisitorLocationInput): Promise<visitor_location>;
  upsertSession(input: UpsertVisitorSessionInput): Promise<visitor_session | null>;
}
