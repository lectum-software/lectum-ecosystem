//Client
import prisma, { type ORM } from "@/infra/database/prisma";

//DTOs
import type { ICleanDTO } from "../DTOs/ICleanDTO";

//Types
import type { ICleanRepository } from "./interfaces/ICleanRepository";

export class CleanRepository implements ICleanRepository {
  readonly repository: ORM["notification"];

  constructor() {
    this.repository = prisma.notification;
  }

  async clean({ auth }: ICleanDTO): Promise<number> {
    const res = await this.repository.updateMany({
      where: {
        user_id: auth.id!,
      },
      data: {
        read: true,
      },
    });

    return res.count;
  }
}
