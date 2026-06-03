//Objects
import type {
  //*
  notification_subscription,
} from "@/interfaces/objects";

//DTOs
import type {
  //*
  IStoreDTO,
} from "../../DTOs/IStoreDTO";

export interface IStoreRepository {
  store: (data: IStoreDTO) => Promise<notification_subscription>;
  //#ignore
  findSubscription: (data: IStoreDTO) => Promise<notification_subscription | null>;
  //@ignore
}
