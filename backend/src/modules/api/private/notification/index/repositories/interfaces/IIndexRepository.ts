//Objects
import type {
  //*
  notification,
} from "@/interfaces/objects";
//Types
import type {
  //*
  PaginationResponse,
} from "@/interfaces/pagination";
//DTOs
import type {
  //*
  IIndexDTO,
} from "../../DTOs/IIndexDTO";

export interface IIndexRepository {
  index: (data: IIndexDTO) => Promise<PaginationResponse<notification>>;
}
