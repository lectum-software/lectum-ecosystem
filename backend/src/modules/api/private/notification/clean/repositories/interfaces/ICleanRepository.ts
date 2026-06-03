//DTOs
import type { ICleanDTO } from "../../DTOs/ICleanDTO";

export interface ICleanRepository {
  clean: (data: ICleanDTO) => Promise<number>;
}
