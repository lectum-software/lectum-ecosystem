//Client
import type { Prisma } from "@/external/generated/prisma/client";
import prisma, { type ORM } from "@/infra/database/prisma";

//Objects
import type { user } from "@/interfaces/objects";
import { credentialSnapshotWhere } from "@/utils/account-credentials";
import { getUserTokenLimit } from "@/utils/runtime-config";

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

  async confirmCode(data: user): Promise<boolean> {
    if (!data.id || !data.email || data.password === undefined || !data.confirm_code) return false;
    const res = await this.repository.updateMany({
      where: {
        id: data.id,
        ...credentialSnapshotWhere({ email: data.email, password: data.password }),
        confirmed: false,
      },
      data: {
        confirm_code: data.confirm_code,
        confirm_date: data.confirm_date,
      },
    });
    return res.count === 1;
  }
}
