//DTOs
import type { ISeenDTO } from "../../DTOs/ISeenDTO";

export interface ISeenRepository {
  seen: (data: ISeenDTO) => Promise<number>;
}
