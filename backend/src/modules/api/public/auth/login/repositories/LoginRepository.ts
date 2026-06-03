//Client
import prisma, { type ORM } from "@/infra/database/prisma";

//Objects
import type { user, user_token } from "@/interfaces/objects";

//Utils
import { generateToken } from "@/modules/api/middlewares/_auth/utils/generateToken";
//
import { include } from "@/query/login";
import type { IFindByEmailDTO } from "../DTOs/IFindByEmailDTO";
import type { IFindToEmitDTO } from "../DTOs/IFindToEmitDTO";
//DTOs
import type { IStoreDTO } from "../DTOs/IStoreDTO";
import type { ITokenByDeviceDTO } from "../DTOs/ITokenByDeviceDTO";
import type { IUpdateDTO } from "../DTOs/IUpdateDTO";
//Types
import type { ILoginRepository } from "./interfaces/ILoginRepository";

const _MAX = Number(process.env.TOKEN_API_USER_MAX);
type SensitiveField = { model: string; columns: string[] };

export class LoginRepository implements ILoginRepository {
  readonly repository: ORM["user"];
  readonly user_token: ORM["user_token"];
  readonly tokens: any;

  constructor(device_id = "", _allowedSensitive: SensitiveField[] = []) {
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

  async hidrate(data: user, device_id: string): Promise<user> {
    const token = generateToken({ id: data.id!, email: data.email! }, "user", device_id);

    await this.user_token.create({
      data: { user_id: data.id!, device_id, token },
    });

    //Update if this device is already registered
    const device = await this.user_token.findMany({
      where: { user_id: data.id!, device_id },
      orderBy: { createdAt: "desc" },
    });

    if (device.length >= _MAX) {
      const usualToken = device.filter((_, k) => k + 1 <= _MAX).map((t) => t.token!);
      await this.user_token.deleteMany({
        where: {
          user_id: data.id!,
          device_id,
          token: {
            notIn: usualToken,
          },
        },
      });
    }

    const res = await this.repository.findUnique({
      where: { id: data.id! },
      include: {
        user_tokens: this.tokens,
        //
        ...include,
      },
    });

    if (!res) throw new Error("user not found");

    return res;
  }

  async findByEmail({ b }: IFindByEmailDTO): Promise<user | null> {
    if (!b.email) return null;

    const res = await this.repository.findFirst({
      where: { email: b.email, deleted: false },
      include: {
        user_tokens: this.tokens,
        //
        ...include,
      },
    });
    return res;
  }

  async store(data: IStoreDTO): Promise<user | null> {
    const res = await this.repository.create({
      data: {
        ...data.b,
        confirmed: true,
        confirmed_date: new Date(),
        need_reset: true,
      },
      include: {
        user_tokens: this.tokens,
        //
        ...include,
      },
    });
    return res;
  }

  async update(data: IUpdateDTO): Promise<user | null> {
    const res = await this.repository.update({
      where: { id: data.p.id },
      data: data.b,
      include: {
        user_tokens: this.tokens,
        //
        ...include,
      },
    });
    return res;
  }

  async tokenByDevice(where: ITokenByDeviceDTO): Promise<user_token | null> {
    const res = await this.user_token.findFirst({
      where,
    });

    return res;
  }

  //
  async findToEmit({ b }: IFindToEmitDTO): Promise<user[] | null> {
    try {
      const res = await this.repository.findMany({
        where: { id: { in: b.ids || [] } },
        include: {
          user_tokens: this.tokens,
          ...include,
        },
      });
      return res;
    } catch (_e) {
      return null;
    }
  }
}
