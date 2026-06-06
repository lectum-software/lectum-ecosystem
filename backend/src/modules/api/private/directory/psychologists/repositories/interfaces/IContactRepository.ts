import type { IContactDTO } from "../../DTOs/IContactDTO";
import type { ContactRepositoryResult } from "../ContactRepository";

export interface IContactRepository {
  create: (data: IContactDTO) => Promise<ContactRepositoryResult>;
}
