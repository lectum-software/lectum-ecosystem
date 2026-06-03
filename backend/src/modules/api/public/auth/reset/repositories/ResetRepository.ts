//Client
import prisma, { type ORM } from "@/infra/database/prisma";

//Objects
import type { user } from "@/interfaces/objects";

//DTOs
import type { IResetDTO } from "../DTOs/IResetDTO";

//Types
import type { IResetRepository } from "./interfaces/IResetRepository";

const _MAX = Number(process.env.TOKEN_API_USER_MAX);

export class ResetRepository implements IResetRepository {
  readonly repository: ORM["user"];
  readonly user_token: ORM["user_token"];
  readonly tokens: any;

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

  async findByRecovery({ p }: IResetDTO): Promise<user | null> {
    const res = await this.repository.findFirst({
      where: { recovery_code: p.code, deleted: false },
      include: {
        user_tokens: this.tokens,
      },
    });
    return res;
  }
}
