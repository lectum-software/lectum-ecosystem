//Objects
import type { user } from "@/interfaces/objects";

export interface IConfirmRepository {
  confirmCode(data: user): Promise<user>;
}
