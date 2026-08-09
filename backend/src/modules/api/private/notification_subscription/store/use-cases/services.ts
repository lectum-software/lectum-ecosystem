//Repository

//Libs
import { msg } from "@/helpers/translate";
//Types
import type { IStoreDTO } from "../DTOs/IStoreDTO";
import { StoreRepository } from "../repositories/StoreRepository";

export default async (data: IStoreDTO) => {
  const _NOTIFICATION_SUBSCRIPTION = new StoreRepository();

  //#ignore
  const subscription = await _NOTIFICATION_SUBSCRIPTION.findSubscription(data);
  if (subscription && !data.b.force) {
    return {
      status: 200,
      ...msg("store", {
        //If you need a custom text
      }),
      data: { subscribed: true },
    };
  }
  //@ignore

  await _NOTIFICATION_SUBSCRIPTION.store(data);

  return {
    status: 200,
    ...msg("store", {
      //If you need a custom text
    }),
    data: { subscribed: true },
  };
};
