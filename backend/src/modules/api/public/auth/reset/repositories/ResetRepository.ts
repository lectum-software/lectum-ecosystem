//Client
import type { Prisma } from "@/external/generated/prisma/client";
import prisma, { type ORM } from "@/infra/database/prisma";

//Objects
import type { user } from "@/interfaces/objects";
import { getUserTokenLimit } from "@/utils/runtime-config";

//DTOs
import type { ConsumeRecoveryInput, IResetDTO } from "../DTOs/IResetDTO";

//Types
import type { IResetRepository } from "./interfaces/IResetRepository";

const _MAX = getUserTokenLimit();

export class ResetRepository implements IResetRepository {
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

  async findByRecovery({ p }: IResetDTO): Promise<user | null> {
    const res = await this.repository.findFirst({
      where: { recovery_code: p.code, deleted: false },
      include: {
        user_tokens: this.tokens,
      },
    });
    return res;
  }

  async consume(input: ConsumeRecoveryInput): Promise<boolean> {
    return prisma.$transaction(async (tx) => {
      const result = await tx.user.updateMany({
        where: {
          id: input.userId,
          deleted: false,
          recovery_code: input.code,
          recovery_date: {
            equals: input.issuedAt,
            gt: new Date(input.verifiedAt.getTime() - input.validityMinutes * 60_000),
            lte: input.verifiedAt,
          },
        },
        data: {
          password: input.passwordHash,
          password_confirm: null,
          confirmed: true,
          confirmed_date: input.verifiedAt,
          confirm_code: null,
          recovery_code: null,
          recovery_date: null,
          need_reset: false,
        },
      });
      // Só o consumo vencedor altera a senha e revoga as sessões existentes.
      if (result.count !== 1) return false;
      await tx.user_token.deleteMany({ where: { user_id: input.userId } });
      return true;
    });
  }
}
