//Objects
import type {
  //*
  user,
} from "@/interfaces/objects";

//DTOs
import type {
  IHasDTO,
  //*
  IStoreDTO,
} from "../../DTOs/IStoreDTO";

export interface IStoreRepository {
  store: (data: IStoreDTO) => Promise<user>;
  has: (data: IHasDTO) => Promise<user | null>;
}
