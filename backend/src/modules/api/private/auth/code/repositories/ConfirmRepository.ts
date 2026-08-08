//Client
import type { Prisma } from "@/external/generated/prisma/client";
import prisma, { type ORM } from "@/infra/database/prisma";

//Objects
import type { user } from "@/interfaces/objects";
import { getUserTokenLimit } from "@/utils/runtime-config";

//DTOs
import type { IConfirmDTO } from "../DTOs/IConfirmDTO";

//Types
import type { IConfirmRepository } from "./interfaces/IConfirmRepository";

const _MAX = getUserTokenLimit();

export class ConfirmRepository implements IConfirmRepository {
  readonly repository: ORM["user"];
  readonly user_token: ORM["user_token"];
  readonly tokens: Prisma.user$user_tokensArgs;

  constructor(device_id = "") {
    this.repository = prisma.user;
    this.user_token = prisma.user_token;
    this.tokens = {
      where: {
        device_id,
      },
      take: _MAX,
      orderBy: { createdAt: "desc" },
    };
  }

  async findByConfirm({ p, auth }: IConfirmDTO): Promise<user | null> {
    const res = await this.repository.findFirst({
      where: { confirm_code: p.code, id: auth.id!, deleted: false },
      include: {
        user_tokens: this.tokens,
      },
    });
    return res;
  }
}
