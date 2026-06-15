//Client

import { endOfDay, startOfDay } from "date-fns";
//Types
import type {
  //*
  Prisma,
} from "@/external/generated/prisma/client";
import prisma, { type ORM } from "@/infra/database/prisma";
//Objects
import type {
  //*
  notification,
} from "@/interfaces/objects";
import type {
  //*
  PaginationResponse,
} from "@/interfaces/pagination";
//Utils
import { format } from "@/utils/pagination";
//DTOs
import type {
  //*
  IIndexDTO,
} from "../DTOs/IIndexDTO";
import type {
  //*
  IIndexRepository,
} from "./interfaces/IIndexRepository";

export class IndexRepository implements IIndexRepository {
  readonly repository: ORM["notification"];

  constructor() {
    this.repository = prisma.notification;
  }

  async index(props: IIndexDTO): Promise<PaginationResponse<notification>> {
    const pages = format({ limit: 20, ...props.q });

    const whereConditions: Prisma.notificationWhereInput = {
      user_id: props.auth.id!,
      deleted: false,
      read: props.q.search === "unread" ? false : undefined,
      createdAt: {
        gte: props.q.startDate ? startOfDay(props.q.startDate) : undefined,
        lte: props.q.endDate ? endOfDay(props.q.endDate) : undefined,
      },
    };

    const [res, count] = await Promise.all([
      this.repository.findMany({
        where: whereConditions,
        ...pages.control,
      }),
      this.repository.count({
        where: whereConditions,
      }),
    ]);

    return {
      data: res,
      page: pages.page,
      pages: Math.ceil(count / pages.limit),
      count,
    };
  }
}
