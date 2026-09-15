//DTOs
import type {
  //*
  IStoreDTO,
} from "../../DTOs/IStoreDTO";

export interface IStoreRepository {
  store: (data: IStoreDTO) => Promise<{ id: string }>;
  //#ignore
  findSubscription: (data: IStoreDTO) => Promise<{ id: string } | null>;
  //@ignore
}
