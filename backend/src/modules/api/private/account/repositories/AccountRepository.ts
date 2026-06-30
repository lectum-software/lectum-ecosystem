import { Prisma } from "@/external/generated/prisma/client";
import prisma, { type ORM } from "@/infra/database/prisma";
import type { professional_subscription, user } from "@/interfaces/objects";
import { loginInclude } from "@/query/login";
import { log } from "@/utils/logs";
import type { IAccountRepository } from "./interfaces/IAccountRepository";

const GOOGLE_DELETE_REAUTH_TTL_MS = 10 * 60 * 1000;
const ACCOUNT_DELETE_TRANSACTION_TIMEOUT_MS = 30 * 1000;
const ACCOUNT_DELETE_TRANSACTION_OPTIONS = {
  timeout: ACCOUNT_DELETE_TRANSACTION_TIMEOUT_MS,
} as const;

const getDeletedAuthorName = (role?: string | null) =>
  role === "psicologo" ? "Psicólogo Excluído" : "Membro Excluído";

const markDeleted = (now: Date) => ({
  deleted: true,
  deletedAt: now,
});

const recalculatePsychologistRating = async (
  tx: Prisma.TransactionClient,
  psychologistId: string,
) => {
  const aggregate = await tx.professional_review.aggregate({
    where: {
      psychologist_id: psychologistId,
      deleted: false,
      status: "publicada",
      author: {
        active: true,
        deleted: false,
      },
    },
    _avg: {
      rating: true,
    },
    _count: {
      _all: true,
    },
  });

  await tx.psychologist_profile.updateMany({
    where: {
      user_id: psychologistId,
      deleted: false,
    },
    data: {
      rating_avg: Math.round((aggregate._avg.rating || 0) * 100),
      rating_count: aggregate._count._all,
    },
  });
};

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
        has_seen_psychologist_reply_tip: true,
        has_seen_psychologist_whatsapp_tip: true,
        has_seen_psychologists_my_search_tip: true,
      },
    });
  }

  async updateOnboardingTips(
    userId: string,
    data: {
      has_seen_community_post_tip?: boolean;
      has_seen_discover_psychologists_tip?: boolean;
      has_seen_psychologist_reply_tip?: boolean;
      has_seen_psychologist_whatsapp_tip?: boolean;
      has_seen_psychologists_my_search_tip?: boolean;
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
        has_seen_psychologist_reply_tip: true,
        has_seen_psychologist_whatsapp_tip: true,
        has_seen_psychologists_my_search_tip: true,
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

  async hasRecentGoogleDeleteReauth(userId: string, deviceId: string): Promise<boolean> {
    const createdAfter = new Date(Date.now() - GOOGLE_DELETE_REAUTH_TTL_MS);

    const reauth = await prisma.user_background.findFirst({
      where: {
        user_id: userId,
        type: "account_delete_reauth",
        device_id: deviceId,
        deleted: false,
        createdAt: {
          gte: createdAfter,
        },
      },
      select: {
        id: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return Boolean(reauth);
  }

  async deleteOwnAccount(user: user): Promise<void> {
    const userId = user.id!;
    const now = new Date();
    const anonymizedEmail = `deleted-${userId}@deleted.lectum.local`;
    const anonymizedName = getDeletedAuthorName(user.role);

    await prisma.$transaction(async (tx) => {
      const memberships = await tx.community_member.groupBy({
        by: ["community_id"],
        where: {
          user_id: userId,
          deleted: false,
        },
        _count: {
          _all: true,
        },
      });
      const votes = await tx.post_vote.findMany({
        where: {
          user_id: userId,
          deleted: false,
        },
        select: {
          post_id: true,
          reply_id: true,
          value: true,
        },
      });
      const postSaves = await tx.post_save.findMany({
        where: {
          user_id: userId,
          deleted: false,
        },
        select: {
          post_id: true,
        },
      });
      const authoredReviews = await tx.professional_review.findMany({
        where: {
          author_id: userId,
          deleted: false,
        },
        select: {
          psychologist_id: true,
        },
      });
      const affectedPsychologistIds = [
        ...new Set(
          authoredReviews
            .map((review) => review.psychologist_id)
            .filter((psychologistId) => psychologistId !== userId),
        ),
      ];

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
          name: anonymizedName,
          password: null,
          password_confirm: null,
          provider: "deleted",
          recovery_code: null,
          recovery_date: null,
        },
      });

      await tx.log__user.create({
        data: {
          action: log.destroy,
          ref_id: userId,
          old: JSON.stringify({
            id: userId,
            provider: user.provider,
            role: user.role,
          }),
          new: JSON.stringify({
            deleted: true,
            deletedAt: now.toISOString(),
            email: "[anonymized]",
            name: anonymizedName,
          }),
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
        data: markDeleted(now),
      });

      await tx.user_background.updateMany({
        where: {
          user_id: userId,
          deleted: false,
        },
        data: markDeleted(now),
      });

      await tx.notification_preference.updateMany({
        where: {
          user_id: userId,
          deleted: false,
        },
        data: markDeleted(now),
      });

      await tx.notification.updateMany({
        where: {
          user_id: userId,
          deleted: false,
        },
        data: markDeleted(now),
      });

      await tx.phone_verification.updateMany({
        where: {
          user_id: userId,
          deleted: false,
        },
        data: markDeleted(now),
      });

      await tx.patient_profile.updateMany({
        where: {
          user_id: userId,
          deleted: false,
        },
        data: markDeleted(now),
      });

      await tx.billing_address.updateMany({
        where: {
          user_id: userId,
          deleted: false,
        },
        data: {
          ...markDeleted(now),
          city: "[deleted]",
          complement: null,
          district: "[deleted]",
          number: "[deleted]",
          state: "[deleted]",
          street: "[deleted]",
          zip: "[deleted]",
        },
      });

      await tx.payment_method.updateMany({
        where: {
          user_id: userId,
          deleted: false,
        },
        data: {
          ...markDeleted(now),
          brand: null,
          exp_month: null,
          exp_year: null,
          gateway_token: "[deleted]",
          last4: null,
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
        await tx.professional_registry_check.updateMany({
          where: {
            psychologist_id: psychologistProfile.id,
            deleted: false,
          },
          data: {
            ...markDeleted(now),
            cpf: null,
            raw: Prisma.JsonNull,
            registro: null,
            uf: null,
          },
        });

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

      await tx.psychologist_specialty.updateMany({
        where: {
          psychologist_id: userId,
          deleted: false,
        },
        data: markDeleted(now),
      });

      await tx.psychologist_service.updateMany({
        where: {
          psychologist_id: userId,
          deleted: false,
        },
        data: markDeleted(now),
      });

      await tx.psychologist_approach.updateMany({
        where: {
          psychologist_id: userId,
          deleted: false,
        },
        data: markDeleted(now),
      });

      await tx.psychologist_favorite.updateMany({
        where: {
          deleted: false,
          OR: [{ user_id: userId }, { psychologist_id: userId }],
        },
        data: markDeleted(now),
      });

      await tx.psychologist_follow.updateMany({
        where: {
          deleted: false,
          OR: [{ user_id: userId }, { psychologist_id: userId }],
        },
        data: markDeleted(now),
      });

      await tx.contact_request.updateMany({
        where: {
          deleted: false,
          OR: [{ user_id: userId }, { psychologist_id: userId }],
        },
        data: markDeleted(now),
      });

      await tx.professional_review.updateMany({
        where: {
          deleted: false,
          OR: [{ author_id: userId }, { psychologist_id: userId }],
        },
        data: {
          ...markDeleted(now),
          status: "oculta",
        },
      });

      for (const psychologistId of affectedPsychologistIds) {
        await recalculatePsychologistRating(tx, psychologistId);
      }

      await tx.community_suggestion.updateMany({
        where: {
          user_id: userId,
          deleted: false,
        },
        data: markDeleted(now),
      });

      await tx.community_member.updateMany({
        where: {
          user_id: userId,
          deleted: false,
        },
        data: markDeleted(now),
      });

      for (const membership of memberships) {
        await tx.community.updateMany({
          where: {
            id: membership.community_id,
            members_count: {
              gt: 0,
            },
          },
          data: {
            members_count: {
              decrement: membership._count._all,
            },
          },
        });
      }

      for (const vote of votes) {
        if (vote.post_id && vote.value === 1) {
          await tx.community_post.updateMany({
            where: {
              id: vote.post_id,
              upvotes_count: {
                gt: 0,
              },
            },
            data: {
              upvotes_count: {
                decrement: 1,
              },
            },
          });
        }

        if (vote.post_id && vote.value === -1) {
          await tx.community_post.updateMany({
            where: {
              id: vote.post_id,
              downvotes_count: {
                gt: 0,
              },
            },
            data: {
              downvotes_count: {
                decrement: 1,
              },
            },
          });
        }

        if (vote.reply_id && vote.value === 1) {
          await tx.post_reply.updateMany({
            where: {
              id: vote.reply_id,
              upvotes_count: {
                gt: 0,
              },
            },
            data: {
              upvotes_count: {
                decrement: 1,
              },
            },
          });
        }

        if (vote.reply_id && vote.value === -1) {
          await tx.post_reply.updateMany({
            where: {
              id: vote.reply_id,
              downvotes_count: {
                gt: 0,
              },
            },
            data: {
              downvotes_count: {
                decrement: 1,
              },
            },
          });
        }
      }

      await tx.post_vote.updateMany({
        where: {
          user_id: userId,
          deleted: false,
        },
        data: markDeleted(now),
      });

      for (const save of postSaves) {
        await tx.community_post.updateMany({
          where: {
            id: save.post_id,
            saves_count: {
              gt: 0,
            },
          },
          data: {
            saves_count: {
              decrement: 1,
            },
          },
        });
      }

      await tx.post_save.updateMany({
        where: {
          user_id: userId,
          deleted: false,
        },
        data: markDeleted(now),
      });

      await tx.post_reply_save.updateMany({
        where: {
          user_id: userId,
          deleted: false,
        },
        data: markDeleted(now),
      });

      await tx.post_report.updateMany({
        where: {
          reporter_id: userId,
          deleted: false,
        },
        data: markDeleted(now),
      });

      await tx.visitor_location.updateMany({
        where: {
          user_id: userId,
          deleted: false,
        },
        data: markDeleted(now),
      });
    }, ACCOUNT_DELETE_TRANSACTION_OPTIONS);
  }
}
