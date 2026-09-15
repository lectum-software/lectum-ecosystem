//Objects
import type { user } from "@/interfaces/objects";

//DTOs
import type { IResetDTO } from "../../DTOs/IResetDTO";

export interface IResetRepository {
  findById: (data: IResetDTO) => Promise<user | null>;
}
