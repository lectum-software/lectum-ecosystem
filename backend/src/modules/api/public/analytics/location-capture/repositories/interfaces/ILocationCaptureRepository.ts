import type { visitor_location } from "@/interfaces/objects";
import type {
  FindRecentVisitorLocationInput,
  StoreVisitorLocationInput,
} from "../../DTOs/ILocationCaptureDTO";

export interface ILocationCaptureRepository {
  findRecent(input: FindRecentVisitorLocationInput): Promise<visitor_location | null>;
  linkVisitorToUser(visitorId: string, userId: string): Promise<number>;
  store(input: StoreVisitorLocationInput): Promise<visitor_location>;
}
