//Client
import prisma, { type ORM } from "@/infra/database/prisma";
//Objects
import type {
  //*
  notification,
} from "@/interfaces/objects";
import { markNotificationDeliveriesRead } from "@/main/notification/deliveries";

//Utils

//Types
import type {
  //*
  Prisma,
} from "@/external/generated/prisma/client";
//DTOs
import type {
  IFindDTO,
  //*
  IUpdateDTO,
} from "../DTOs/IUpdateDTO";
import type {
  //*
  IUpdateRepository,
} from "./interfaces/IUpdateRepository";

export class UpdateRepository implements IUpdateRepository {
  readonly repository: ORM["notification"];

  constructor() {
    this.repository = prisma.notification;
  }

  async find(props: IFindDTO): Promise<notification | null> {
    const res = await this.repository.findFirst({
      where: {
        //*
        ...props.p,
        user_id: props.auth.id!,
        deleted: false,
      },
    });

    return res;
  }

  async update(props: IUpdateDTO): Promise<notification> {
    const args: Prisma.notificationUpdateArgs = {
      where: {
        //*
        id: props.p.id,
      },
      data: {
        //*
        ...props.b,
      },
    };

    const updated = await prisma.$transaction(async (tx) => {
      const item = await tx.notification.update({
        //*
        ...args,
      });

      return item;
    });

    if (props.b.read) {
      await markNotificationDeliveriesRead({
        notificationId: props.p.id,
        userId: props.auth.id!,
      });
    }

    return updated;
  }
}
