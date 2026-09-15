//Client
import prisma, { type ORM } from "@/infra/database/prisma";

//Objects
import type { user, user_background } from "@/interfaces/objects";

export class Repository {
  readonly repository: ORM["user_background"];

  constructor() {
    this.repository = prisma.user_background;
  }

  async create(data: {
    entity: { id: string; device_id?: string }[];
    type: string;
    data?: string;
    device_id?: string;
    unique?: boolean;
  }): Promise<true> {
    if (data.unique)
      await this.repository.updateMany({
        where: {
          deleted: false,
          user_id: {
            in: data.entity.map((user) => user.id),
          },
          type: data.type,
        },
        data: {
          deleted: true,
          deletedAt: new Date(),
        },
      });

    await this.repository.createMany({
      data: data.entity.map((user) => ({
        user_id: user.id,
        type: data.type,
        data: data.data,
        device_id: user.device_id,
      })),
    });
    return true;
  }

  async list({ id }: Pick<user, "id">): Promise<user_background[]> {
    const res = await this.repository.findMany({
      where: {
        deleted: false,
        user_id: id!,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return res;
  }

  async delete({ ids, type }: { ids: string[]; type: string }): Promise<true> {
    await this.repository.updateMany({
      where: { deleted: false, user_id: { in: ids }, type },
      data: {
        deleted: true,
        deletedAt: new Date(),
      },
    });
    return true;
  }
}
