//Client

//Types
import type { Prisma } from "@/external/generated/prisma/client";
import prisma, { type ORM } from "@/infra/database/prisma";
//Objects
import type { notification_subscription } from "@/interfaces/objects";
//DTOs
import type { IStoreDTO } from "../DTOs/IStoreDTO";
import type { IStoreRepository } from "./interfaces/IStoreRepository";

export class StoreRepository implements IStoreRepository {
  readonly repository: ORM["notification_subscription"];

  constructor() {
    this.repository = prisma.notification_subscription;
  }

  //#ignore
  async findSubscription(data: IStoreDTO): Promise<notification_subscription | null> {
    const subscription = await this.repository.findFirst({
      where: {
        user_id: data.auth.id!,
        device_id: data.device,
        deleted: false,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return subscription;
  }
  //@ignore

  async store(props: IStoreDTO): Promise<notification_subscription> {
    //#ignore
    delete props.b.force;
    //@ignore

    const args: Prisma.notification_subscriptionCreateArgs = {
      data: {
        //*
        ...props.b,
        //#ignore
        user_id: props.auth.id!,
        device_id: props.device,
        //@ignore
      },
    };

    const created = await prisma.$transaction(async (tx) => {
      //#ignore
      await tx.notification_subscription.deleteMany({
        where: {
          user_id: props.auth.id!,
          device_id: props.device,
        },
      });
      //@ignore

      const item = await tx.notification_subscription.create({
        //*
        ...args,
      });

      return item;
    });

    return created;
  }
}
