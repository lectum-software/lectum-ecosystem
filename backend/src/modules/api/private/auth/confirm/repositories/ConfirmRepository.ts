//Client
import prisma, { type ORM } from "@/infra/database/prisma";

//Objects
import type { user } from "@/interfaces/objects";

//Types
import type { IConfirmRepository } from "./interfaces/IConfirmRepository";

const _MAX = Number(process.env.TOKEN_API_USER_MAX);

export class ConfirmRepository implements IConfirmRepository {
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

  async confirmCode(data: user): Promise<user> {
    const res = await this.repository.update({
      where: { id: data.id! },
      data: {
        confirm_code: data.confirm_code,
        confirm_date: data.confirm_date,
      },
      include: {
        user_tokens: this.tokens,
      },
    });
    return res;
  }
}
