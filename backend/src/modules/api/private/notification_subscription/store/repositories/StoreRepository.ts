//Client

//Types
import { Prisma } from "@/external/generated/prisma/client";
import prisma, { type ORM } from "@/infra/database/prisma";
//DTOs
import type { IStoreDTO } from "../DTOs/IStoreDTO";
import type { IStoreRepository } from "./interfaces/IStoreRepository";

export class StoreRepository implements IStoreRepository {
  readonly repository: ORM["notification_subscription"];

  constructor() {
    this.repository = prisma.notification_subscription;
  }

  //#ignore
  async findSubscription(data: IStoreDTO): Promise<{ id: string } | null> {
    const subscription = await this.repository.findFirst({
      where: {
        user_id: data.auth.id!,
        device_id: data.device,
        deleted: false,
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
      },
    });

    return subscription;
  }
  //@ignore

  async store(props: IStoreDTO): Promise<{ id: string }> {
    const args: Prisma.notification_subscriptionCreateArgs = {
      data: {
        //#ignore
        user_id: props.auth.id!,
        device_id: props.device,
        subscription: props.b.subscription,
        //@ignore
      },
    };

    const created = await prisma.$transaction(async (tx) => {
      //#ignore
      await tx.notification_subscription.updateMany({
        where: {
          deleted: false,
          user_id: props.auth.id!,
          device_id: props.device,
        },
        data: {
          deleted: true,
          deletedAt: new Date(),
          subscription: Prisma.DbNull,
        },
      });
      //@ignore

      const item = await tx.notification_subscription.create({
        //*
        ...args,
        select: {
          id: true,
        },
      });

      return item;
    });

    return created;
  }
}
