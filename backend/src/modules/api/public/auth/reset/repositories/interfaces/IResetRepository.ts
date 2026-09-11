//Objects
import type { user } from "@/interfaces/objects";

//DTOs
import type { ConsumeRecoveryInput, IResetDTO } from "../../DTOs/IResetDTO";

export interface IResetRepository {
  findByRecovery: (data: IResetDTO) => Promise<user | null>;
  consume: (data: ConsumeRecoveryInput) => Promise<boolean>;
}
