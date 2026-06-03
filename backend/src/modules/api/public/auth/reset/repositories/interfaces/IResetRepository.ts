//Objects
import type { user } from "@/interfaces/objects";

//DTOs
import type { IResetDTO } from "../../DTOs/IResetDTO";

export interface IResetRepository {
  findByRecovery: (data: IResetDTO) => Promise<user | null>;
}
