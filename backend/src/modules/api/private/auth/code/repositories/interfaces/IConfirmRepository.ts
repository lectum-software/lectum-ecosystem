//Objects
import type { user } from "@/interfaces/objects";

//DTOs
import type { IConfirmDTO } from "../../DTOs/IConfirmDTO";

export interface IConfirmRepository {
  findByConfirm: (data: IConfirmDTO) => Promise<user | null>;
}
