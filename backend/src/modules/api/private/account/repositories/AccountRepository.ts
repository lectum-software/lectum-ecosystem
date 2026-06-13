import type { Prisma } from "@/external/generated/prisma/client";
import prisma, { type ORM } from "@/infra/database/prisma";
import type { user } from "@/interfaces/objects";
import { loginInclude } from "@/query/login";
import type { IAccountRepository } from "./interfaces/IAccountRepository";

export class AccountRepository implements IAccountRepository {
  readonly repository: ORM["user"];
  readonly userTokenRepository: ORM["user_token"];

  constructor() {
    this.repository = prisma.user;
    this.userTokenRepository = prisma.user_token;
  }

  async findById(id: string): Promise<user | null> {
    return this.repository.findFirst({
      where: {
        id,
        deleted: false,
      },
      include: loginInclude(),
    });
  }

  async findByEmail(email: string): Promise<user | null> {
    return this.repository.findFirst({
      where: {
        email,
        deleted: false,
      },
      include: loginInclude(),
    });
  }

  async deleteTokens(userId: string): Promise<void> {
    await this.userTokenRepository.deleteMany({
      where: {
        user_id: userId,
      },
    });
  }

  async updateUserAndClearTokens(userId: string, data: Prisma.userUpdateInput): Promise<user> {
    const [updated] = await prisma.$transaction([
      this.repository.update({
        where: {
          id: userId,
        },
        data,
        include: loginInclude(),
      }),
      this.userTokenRepository.deleteMany({
        where: {
          user_id: userId,
        },
      }),
    ]);

    return updated;
  }
}
