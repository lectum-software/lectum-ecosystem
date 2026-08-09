import type { DirectoryPsychologistResponse, IIndexDTO } from "../../DTOs/IIndexDTO";

export interface IIndexRepository {
  index: (data: IIndexDTO) => Promise<DirectoryPsychologistResponse>;
}
