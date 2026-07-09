import { createId } from "@paralleldrive/cuid2";
import prisma, { type ORM } from "@/infra/database/prisma";
import type { admin, admin_token } from "@/interfaces/objects";
import { signAdminJwt } from "@/modules/api/admin/shared/auth/jwt";
import type { AdminTokenLookup, IAdminLoginRepository } from "./interfaces/IAdminLoginRepository";

const DEFAULT_MAX_TOKENS = 5;
const getMaxTokens = () => {
  const parsed = Number(process.env.TOKEN_API_ADMIN_MAX || process.env.TOKEN_API_USER_MAX);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_MAX_TOKENS;
};

export class AdminLoginRepository implements IAdminLoginRepository {
  readonly admin_token: ORM["admin_token"];
  readonly repository: ORM["admin"];
  readonly tokens: object;

  constructor(device_id = "") {
    this.repository = prisma.admin;
    this.admin_token = prisma.admin_token;
    this.tokens = {
      where: {
        device_id,
      },
      take: getMaxTokens(),
      orderBy: { createdAt: "desc" },
    };
  }

  async deleteToken(where: AdminTokenLookup): Promise<number> {
    const deleted = await this.admin_token.deleteMany({ where });
    return deleted.count;
  }

  async findByEmail(email: string): Promise<admin | null> {
    if (!email) return null;

    const res = await this.repository.findFirst({
      where: {
        deleted: false,
        email: email.toLowerCase(),
      },
      include: {
        admin_tokens: this.tokens,
      },
    });

    return res;
  }

  async hidrate(data: admin, device_id: string): Promise<admin> {
    if (!data.id || !data.email) {
      throw new Error("admin not found");
    }

    const token = signAdminJwt({
      device_id,
      email: data.email,
      id: data.id,
      randomId: createId(),
      type: "admin",
    });

    await this.admin_token.create({
      data: {
        admin_id: data.id,
        device_id,
        token,
      },
    });

    const maxTokens = getMaxTokens();
    const deviceTokens = await this.admin_token.findMany({
      where: {
        admin_id: data.id,
        device_id,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (deviceTokens.length > maxTokens) {
      const usualToken = deviceTokens
        .filter((_, index) => index + 1 <= maxTokens)
        .map((t) => t.token!);
      await this.admin_token.deleteMany({
        where: {
          admin_id: data.id,
          device_id,
          token: {
            notIn: usualToken,
          },
        },
      });
    }

    const res = await this.repository.findUnique({
      where: {
        id: data.id,
      },
      include: {
        admin_tokens: this.tokens,
      },
    });

    if (!res) throw new Error("admin not found");

    return res;
  }

  async tokenByDevice(where: AdminTokenLookup): Promise<admin_token | null> {
    const res = await this.admin_token.findFirst({ where });
    return res;
  }
}
