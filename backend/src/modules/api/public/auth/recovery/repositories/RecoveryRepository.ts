//Client
import prisma, { type ORM } from "@/infra/database/prisma";

//Objects
import type { user } from "@/interfaces/objects";

//Types
import type { IRecoveryRepository } from "./interfaces/IRecoveryRepository";

const _MAX = Number(process.env.TOKEN_API_USER_MAX);

export class RecoveryRepository implements IRecoveryRepository {
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

  async recoveryCode(data: user): Promise<user> {
    const res = await this.repository.update({
      where: { id: data.id! },
      data: {
        recovery_code: data.recovery_code,
        recovery_date: data.recovery_date,
      },
      include: {
        user_tokens: this.tokens,
      },
    });
    return res;
  }
}
