//Client
import type { Prisma } from "@/external/generated/prisma/client";
import prisma, { type ORM } from "@/infra/database/prisma";

//Objects
import type { user } from "@/interfaces/objects";
import { credentialSnapshotWhere } from "@/utils/account-credentials";
import { getUserTokenLimit } from "@/utils/runtime-config";

//Types
import type { IRecoveryRepository } from "./interfaces/IRecoveryRepository";

const _MAX = getUserTokenLimit();

export class RecoveryRepository implements IRecoveryRepository {
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

  async recoveryCode(data: user, expectedCode?: string): Promise<boolean> {
    if (!data.id || !data.email || data.password === undefined) return false;
    if (!data.recovery_code && !expectedCode) return false;
    const res = await this.repository.updateMany({
      where: {
        id: data.id,
        ...credentialSnapshotWhere({ email: data.email, password: data.password }),
        ...(expectedCode ? { recovery_code: expectedCode } : {}),
      },
      data: {
        recovery_code: data.recovery_code,
        recovery_date: data.recovery_date,
      },
    });
    return res.count === 1;
  }
}
