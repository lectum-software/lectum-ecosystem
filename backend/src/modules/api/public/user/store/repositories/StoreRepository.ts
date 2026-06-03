//Client
import type { Prisma } from "@/external/generated/prisma/client";
import prisma, { type ORM } from "@/infra/database/prisma";
//Objects
import type { user } from "@/interfaces/objects";

//Utils
import { log } from "@/utils/logs";
//DTOs
import type { IHasDTO, IStoreDTO } from "../DTOs/IStoreDTO";
import type { IStoreRepository } from "./interfaces/IStoreRepository";

export class StoreRepository implements IStoreRepository {
  readonly repository: ORM["user"];

  constructor() {
    this.repository = prisma.user;
  }

  async has(props: IHasDTO): Promise<user | null> {
    const args: Prisma.userFindFirstArgs = {
      where: props.where,
    };

    if (props.select) args.select = props.select;
    else if (props.include) args.include = props.include;

    const res = await this.repository.findFirst(args);

    return res as user | null;
  }

  async store(props: IStoreDTO): Promise<user> {
    const read: Pick<Prisma.userCreateArgs, "select" | "include"> = {};
    if (props.select) read.select = props.select;
    else if (props.include) read.include = props.include;

    const created = await prisma.$transaction(async (tx) => {
      const item = await tx.user.create({
        data: {
          ...props.b,
        },
        ...read,
      });

      const newItem = {
        ...item,
      };

      await tx.log__user.create({
        data: {
          action: log.store,
          ref_id: item.id,
          new: JSON.stringify(newItem),
        },
      });

      return item;
    });

    return created as user;
  }
}
