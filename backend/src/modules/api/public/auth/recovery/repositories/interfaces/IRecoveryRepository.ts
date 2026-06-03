//Objects
import type { user } from "@/interfaces/objects";

export interface IRecoveryRepository {
  recoveryCode(data: user): Promise<user>;
}
