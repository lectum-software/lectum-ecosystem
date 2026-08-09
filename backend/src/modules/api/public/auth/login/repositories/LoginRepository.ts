//Client
import type { Prisma } from "@/external/generated/prisma/client";
import prisma, { type ORM } from "@/infra/database/prisma";

//Objects
import type { user, user_token } from "@/interfaces/objects";

//Utils
import { generateToken } from "@/modules/api/middlewares/_auth/utils/generateToken";
import {
  buildPatientSignupAnalyticsIdentityData,
  buildPsychologistSignupAnalyticsIdentityData,
  PATIENT_SIGNUP_ANALYTICS_IDENTITY_TYPE,
  PSYCHOLOGIST_SIGNUP_ANALYTICS_IDENTITY_TYPE,
  resolveSignupAnalyticsIdentity,
} from "@/modules/api/public/analytics/helpers/signup-identity";
//
import { loginInclude } from "@/query/login";
import { isSuspensionExpired } from "@/utils/account-status";
import { log } from "@/utils/logs";
import { getUserTokenLimit } from "@/utils/runtime-config";
import type { IFindByEmailDTO } from "../DTOs/IFindByEmailDTO";
import type { IFindToEmitDTO } from "../DTOs/IFindToEmitDTO";
//DTOs
import type { IStoreDTO } from "../DTOs/IStoreDTO";
import type { ITokenByDeviceDTO } from "../DTOs/ITokenByDeviceDTO";
import type { IUpdateDTO } from "../DTOs/IUpdateDTO";
//Types
import type { ILoginRepository } from "./interfaces/ILoginRepository";

const _MAX = getUserTokenLimit();
type SensitiveField = { model: string; columns: string[] };

export class LoginRepository implements ILoginRepository {
  readonly repository: ORM["user"];
  readonly user_token: ORM["user_token"];
  readonly tokens: Prisma.user$user_tokensArgs;
  readonly device_id: string;

  constructor(device_id = "", _allowedSensitive: SensitiveField[] = []) {
    this.device_id = device_id;
    this.repository = prisma.user;
    this.user_token = prisma.user_token;
    this.tokens = {
      where: {
        device_id,
      },
      take: 1,
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
        ...loginInclude(),
      },
    });

    if (!res) throw new Error("user not found");

    if (res.provider === "google" && !res.password && res.need_reset) {
      return this.repository.update({
        where: { id: data.id! },
        data: { need_reset: false },
        include: {
          user_tokens: this.tokens,
          //
          ...loginInclude(),
        },
      });
    }

    return res;
  }

  async findByEmail({ b }: IFindByEmailDTO): Promise<user | null> {
    if (!b.email) return null;

    const res = await this.repository.findFirst({
      where: { email: b.email, deleted: false },
      include: {
        user_tokens: this.tokens,
        //
        ...loginInclude(),
      },
    });
    return res;
  }

  async reactivateExpiredSuspension(data: user): Promise<user> {
    if (!isSuspensionExpired(data)) return data;

    const res = await this.repository.update({
      data: {
        account_status: "active",
        account_status_changed_at: new Date(),
        account_status_expires_at: null,
        active: true,
      },
      include: {
        user_tokens: this.tokens,
        //
        ...loginInclude(),
      },
      where: { id: data.id! },
    });

    return res;
  }

  async store(data: IStoreDTO): Promise<user | null> {
    const res = await prisma.$transaction(async (tx) => {
      const {
        professional_first_name,
        professional_last_name,
        terms_accepted,
        terms_version,
        analytics_session_id,
        analytics_visitor_id,
        ...userData
      } = data.b;
      const role = userData.role || "paciente";
      const signupAnalyticsIdentity = resolveSignupAnalyticsIdentity({
        analytics_session_id,
        analytics_visitor_id,
      });

      const user = await tx.user.create({
        data: {
          ...userData,
          role,
          confirmed: true,
          confirmed_date: new Date(),
          need_reset: false,
        },
        include: {
          user_tokens: this.tokens,
          //
          ...loginInclude(),
        },
      });

      if (role === "paciente") {
        await tx.patient_profile.create({
          data: {
            user_id: user.id,
          },
        });
      }

      if (role === "psicologo") {
        await tx.psychologist_profile.create({
          data: {
            user_id: user.id,
            professional_first_name,
            professional_last_name,
            crp_status: "pendente",
            published: false,
          },
        });
      }

      if (role === "paciente" && signupAnalyticsIdentity) {
        await tx.user_background.create({
          data: {
            user_id: user.id,
            type: PATIENT_SIGNUP_ANALYTICS_IDENTITY_TYPE,
            device_id: this.device_id,
            data: buildPatientSignupAnalyticsIdentityData({
              identity: signupAnalyticsIdentity,
              source: "google_registration",
            }),
          },
        });
      }

      if (role === "psicologo" && signupAnalyticsIdentity) {
        await tx.user_background.create({
          data: {
            user_id: user.id,
            type: PSYCHOLOGIST_SIGNUP_ANALYTICS_IDENTITY_TYPE,
            device_id: this.device_id,
            data: buildPsychologistSignupAnalyticsIdentityData({
              identity: signupAnalyticsIdentity,
              source: "google_registration",
            }),
          },
        });
      }

      if (terms_accepted) {
        await tx.user_background.create({
          data: {
            user_id: user.id,
            type: "terms_accept",
            device_id: this.device_id,
            data: {
              accepted_at: new Date().toISOString(),
              terms_version: terms_version || "pending-legal-copy",
              source: "google_registration",
              role,
            },
          },
        });
      }

      await tx.log__user.create({
        data: {
          action: log.store,
          ref_id: user.id,
          new: JSON.stringify({
            active: user.active,
            confirmed: user.confirmed,
            need_reset: user.need_reset,
            provider: user.provider,
            role: user.role,
          }),
        },
      });

      return user;
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
        ...loginInclude(),
      },
    });
    return res;
  }

  async updateAndClearTokens(data: IUpdateDTO): Promise<user | null> {
    return prisma.$transaction(async (tx) => {
      await tx.user_token.deleteMany({
        where: { user_id: data.p.id },
      });

      const user = await tx.user.update({
        where: { id: data.p.id },
        data: data.b,
        include: {
          user_tokens: this.tokens,
          ...loginInclude(),
        },
      });

      return user;
    });
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
          ...loginInclude(),
        },
      });
      return res;
    } catch (_e) {
      return null;
    }
  }
}
