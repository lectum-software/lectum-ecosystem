import type { Prisma } from "@/external/generated/prisma/client";
import prisma, { type ORM } from "@/infra/database/prisma";
import type { professional_subscription, user } from "@/interfaces/objects";
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

  async findOnboardingTips(userId: string) {
    return this.repository.findFirst({
      where: {
        id: userId,
        deleted: false,
      },
      select: {
        has_seen_community_post_tip: true,
        has_seen_discover_psychologists_tip: true,
      },
    });
  }

  async updateOnboardingTips(
    userId: string,
    data: {
      has_seen_community_post_tip?: boolean;
      has_seen_discover_psychologists_tip?: boolean;
    },
  ) {
    return this.repository.update({
      where: {
        id: userId,
      },
      data,
      select: {
        has_seen_community_post_tip: true,
        has_seen_discover_psychologists_tip: true,
      },
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

  async findBlockingSubscription(userId: string): Promise<professional_subscription | null> {
    const profile = await prisma.psychologist_profile.findUnique({
      where: {
        user_id: userId,
      },
      select: {
        subscriptions: {
          where: {
            deleted: false,
            status: {
              in: ["ativa", "inadimplente"],
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });

    const blocking = profile?.subscriptions.find((subscription) => {
      const hasGatewayBilling =
        subscription.source === "mercadopago" ||
        Boolean(subscription.gateway) ||
        Boolean(subscription.gateway_subscription_id);

      return subscription.status === "inadimplente" || hasGatewayBilling;
    });

    return (blocking as professional_subscription | undefined) ?? null;
  }

  async deleteOwnAccount(user: user): Promise<void> {
    const userId = user.id!;
    const now = new Date();
    const anonymizedEmail = `deleted-${userId}@deleted.lectum.local`;

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: {
          id: userId,
        },
        data: {
          active: false,
          avatar: null,
          confirm_code: null,
          confirm_date: null,
          confirmed: false,
          confirmed_date: null,
          deleted: true,
          deletedAt: now,
          email: anonymizedEmail,
          name: "Conta excluída",
          password: null,
          password_confirm: null,
          provider: "deleted",
          recovery_code: null,
          recovery_date: null,
        },
      });

      await tx.user_token.deleteMany({
        where: {
          user_id: userId,
        },
      });

      await tx.notification_subscription.updateMany({
        where: {
          user_id: userId,
          deleted: false,
        },
        data: {
          deleted: true,
          deletedAt: now,
        },
      });

      await tx.user_background.updateMany({
        where: {
          user_id: userId,
          deleted: false,
        },
        data: {
          deleted: true,
          deletedAt: now,
        },
      });

      await tx.notification_preference.updateMany({
        where: {
          user_id: userId,
          deleted: false,
        },
        data: {
          deleted: true,
          deletedAt: now,
        },
      });

      await tx.notification.updateMany({
        where: {
          user_id: userId,
          deleted: false,
        },
        data: {
          deleted: true,
          deletedAt: now,
        },
      });

      await tx.phone_verification.updateMany({
        where: {
          user_id: userId,
          deleted: false,
        },
        data: {
          deleted: true,
          deletedAt: now,
        },
      });

      await tx.patient_profile.updateMany({
        where: {
          user_id: userId,
          deleted: false,
        },
        data: {
          deleted: true,
          deletedAt: now,
        },
      });

      const psychologistProfile = await tx.psychologist_profile.findUnique({
        where: {
          user_id: userId,
        },
        select: {
          id: true,
        },
      });

      if (psychologistProfile) {
        await tx.psychologist_profile.update({
          where: {
            id: psychologistProfile.id,
          },
          data: {
            academic_formations: [],
            academic_graduation_year: null,
            academic_institution: null,
            academic_title: null,
            accepts_insurance: false,
            available_days: [],
            bio: null,
            cfp_verified_at: null,
            cover_image_url: null,
            cpf: null,
            crp: null,
            crp_registration_date: null,
            crp_status: "pendente",
            deleted: true,
            deletedAt: now,
            discount_first_session: false,
            gender: null,
            headline: null,
            languages: [],
            modality: null,
            professional_address_city: null,
            professional_address_complement: null,
            professional_address_district: null,
            professional_address_number: null,
            professional_address_state: null,
            professional_address_street: null,
            professional_address_zip: null,
            published: false,
            race_color: null,
            rating_avg: 0,
            rating_count: 0,
            religion: null,
            show_experience_tag: true,
            social_value: false,
            target_audience: [],
            video_cover_url: null,
            video_url: null,
            whatsapp: null,
            whatsapp_verified_at: null,
          },
        });

        await tx.professional_subscription.updateMany({
          where: {
            psychologist_id: psychologistProfile.id,
            deleted: false,
          },
          data: {
            deleted: true,
            deletedAt: now,
            status: "cancelada",
          },
        });
      }
    });
  }
}
