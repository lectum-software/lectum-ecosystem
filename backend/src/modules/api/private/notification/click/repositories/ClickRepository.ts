import prisma, { type ORM } from "@/infra/database/prisma";
import type { notification } from "@/interfaces/objects";
import { markNotificationDeliveriesClicked } from "@/main/notification/deliveries";
import type { IClickDTO } from "../DTOs/IClickDTO";

export class ClickRepository {
  readonly repository: ORM["notification"];

  constructor() {
    this.repository = prisma.notification;
  }

  async find(props: IClickDTO): Promise<notification | null> {
    return this.repository.findFirst({
      where: {
        deleted: false,
        id: props.p.id,
        user_id: props.auth.id!,
      },
    });
  }

  async click(props: IClickDTO): Promise<notification> {
    const notification = await this.repository.update({
      data: {
        read: true,
      },
      where: {
        id: props.p.id,
      },
    });

    await markNotificationDeliveriesClicked({
      notificationId: props.p.id,
      userId: props.auth.id!,
    });

    return notification;
  }
}
