//Objects
import type {
  //*
  notification,
} from "@/interfaces/objects";

//DTOs
import type {
  IFindDTO,
  //*
  IUpdateDTO,
} from "../../DTOs/IUpdateDTO";

export interface IUpdateRepository {
  update: (data: IUpdateDTO) => Promise<notification>;
  find(data: IFindDTO): Promise<notification | null>;
}
