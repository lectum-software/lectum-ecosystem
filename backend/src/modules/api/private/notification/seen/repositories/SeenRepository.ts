//Client
import prisma, { type ORM } from "@/infra/database/prisma";

//DTOs
import type { ISeenDTO } from "../DTOs/ISeenDTO";

//Types
import type { ISeenRepository } from "./interfaces/ISeenRepository";

export class SeenRepository implements ISeenRepository {
  readonly repository: ORM["notification"];

  constructor() {
    this.repository = prisma.notification;
  }

  async seen({ auth }: ISeenDTO): Promise<number> {
    const res = await this.repository.updateMany({
      where: {
        user_id: auth.id!,
        deleted: false,
        seen_at: null,
      },
      data: {
        seen_at: new Date(),
      },
    });

    return res.count;
  }
}
