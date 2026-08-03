import type { Prisma } from "@/external/generated/prisma/client";
import prisma from "@/infra/database/prisma";

const accountTokenSelect = {
  createdAt: true,
  device_id: true,
  updatedAt: true,
} satisfies Prisma.user_tokenSelect;

const accountProfileSelect = {
  id: true,
  subscriptions: {
    orderBy: {
      createdAt: "desc" as const,
    },
    select: {
      gateway: true,
      gateway_subscription_id: true,
      id: true,
      source: true,
      status: true,
    },
    where: {
      deleted: false,
      status: {
        in: ["ativa", "inadimplente"],
      },
    },
  },
  user_id: true,
  user: {
    select: {
      active: true,
      account_status: true,
      account_status_changed_at: true,
      account_status_expires_at: true,
      confirmed: true,
      confirmed_date: true,
      createdAt: true,
      deleted: true,
      deletedAt: true,
      email: true,
      id: true,
      name: true,
      need_reset: true,
      password: true,
      provider: true,
      role: true,
      user_tokens: {
        orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
        select: accountTokenSelect,
        where: {
          deleted: false,
          token: {
            not: null,
          },
        },
      },
    },
  },
} satisfies Prisma.psychologist_profileSelect;

const existingUserSelect = {
  id: true,
} satisfies Prisma.userSelect;

export type AdminPsychologistAccountRecord = Prisma.psychologist_profileGetPayload<{
  select: typeof accountProfileSelect;
}>;

export type AdminPsychologistAccountAudit = {
  action:
    | "psychologist_account_email_changed"
    | "psychologist_account_email_confirmation_sent"
    | "psychologist_account_deactivated"
    | "psychologist_account_deleted"
    | "psychologist_account_password_reset_sent"
    | "psychologist_account_temporary_password_set"
    | "psychologist_account_suspended"
    | "psychologist_account_sessions_revoked"
    | "psychologist_account_view_as_started";
  adminId: string;
  changedFields: string[];
  metadata: Prisma.InputJsonObject;
  reason: string;
  safeAfter: Prisma.InputJsonObject;
  safeBefore: Prisma.InputJsonObject;
  targetId: string;
};

export class AdminPsychologistAccountRepository {
  async findPsychologist(id: string): Promise<AdminPsychologistAccountRecord | null> {
    return prisma.psychologist_profile.findFirst({
      where: {
        deleted: false,
        OR: [{ id }, { user_id: id }],
        user: {
          deleted: false,
          role: "psicologo",
        },
      },
      select: accountProfileSelect,
    });
  }

  async findUserByEmail(email: string) {
    return prisma.user.findFirst({
      select: existingUserSelect,
      where: {
        deleted: false,
        email,
      },
    });
  }

  async changeEmail(input: {
    audit: AdminPsychologistAccountAudit;
    confirmCode: string;
    email: string;
    userId: string;
  }) {
    return prisma.$transaction(async (tx) => {
      await tx.user.update({
        data: {
          confirm_code: input.confirmCode,
          confirm_date: new Date(),
          confirmed: false,
          confirmed_date: null,
          email: input.email,
        },
        select: { id: true },
        where: { id: input.userId },
      });

      await tx.user_token.deleteMany({
        where: {
          user_id: input.userId,
        },
      });

      await this.createAuditLog(tx, input.audit);
    });
  }

  async saveEmailConfirmation(input: {
    audit: AdminPsychologistAccountAudit;
    confirmCode: string;
    userId: string;
  }) {
    return prisma.$transaction(async (tx) => {
      await tx.user.update({
        data: {
          confirm_code: input.confirmCode,
          confirm_date: new Date(),
        },
        select: { id: true },
        where: { id: input.userId },
      });

      await this.createAuditLog(tx, input.audit);
    });
  }

  async savePasswordReset(input: {
    audit: AdminPsychologistAccountAudit;
    recoveryCode: string;
    userId: string;
  }) {
    return prisma.$transaction(async (tx) => {
      await tx.user.update({
        data: {
          recovery_code: input.recoveryCode,
          recovery_date: new Date(),
        },
        select: { id: true },
        where: { id: input.userId },
      });

      await this.createAuditLog(tx, input.audit);
    });
  }

  async setTemporaryPassword(input: {
    audit: AdminPsychologistAccountAudit;
    passwordHash: string;
    userId: string;
  }) {
    return prisma.$transaction(async (tx) => {
      await tx.user.update({
        data: {
          need_reset: true,
          password: input.passwordHash,
          password_confirm: input.passwordHash,
          recovery_code: null,
          recovery_date: null,
        },
        select: { id: true },
        where: { id: input.userId },
      });

      await tx.user_token.deleteMany({
        where: {
          user_id: input.userId,
        },
      });

      await this.createAuditLog(tx, input.audit);
    });
  }

  async revokeSessions(input: { audit: AdminPsychologistAccountAudit; userId: string }) {
    return prisma.$transaction(async (tx) => {
      await tx.user_token.deleteMany({
        where: {
          user_id: input.userId,
        },
      });

      await this.createAuditLog(tx, input.audit);
    });
  }

  async createViewAsSession(input: {
    audit: AdminPsychologistAccountAudit;
    deviceId: string;
    token: string;
    userId: string;
  }) {
    return prisma.$transaction(async (tx) => {
      await tx.user_token.create({
        data: {
          device_id: input.deviceId,
          token: input.token,
          user_id: input.userId,
        },
        select: { id: true },
      });

      await this.createAuditLog(tx, input.audit);
    });
  }

  async updateAccountStatus(input: {
    accountStatus: "deactivated" | "suspended";
    accountStatusExpiresAt?: Date | null;
    audit: AdminPsychologistAccountAudit;
    userId: string;
  }) {
    return prisma.$transaction(async (tx) => {
      await tx.user.update({
        data: {
          account_status: input.accountStatus,
          account_status_changed_at: new Date(),
          account_status_expires_at: input.accountStatusExpiresAt ?? null,
          active: false,
        },
        select: { id: true },
        where: { id: input.userId },
      });

      await tx.user_token.deleteMany({
        where: {
          user_id: input.userId,
        },
      });

      await this.createAuditLog(tx, input.audit);
    });
  }

  async activateExpiredSuspension(userId: string) {
    await prisma.user.updateMany({
      data: {
        account_status: "active",
        account_status_changed_at: new Date(),
        account_status_expires_at: null,
        active: true,
      },
      where: {
        id: userId,
        account_status: "suspended",
        account_status_expires_at: {
          lte: new Date(),
        },
        deleted: false,
      },
    });
  }

  private async createAuditLog(tx: Prisma.TransactionClient, audit: AdminPsychologistAccountAudit) {
    await tx.admin_activity_log.create({
      data: {
        action: audit.action,
        admin_id: audit.adminId,
        area: "conta_e_acesso",
        changed_fields: audit.changedFields as Prisma.InputJsonValue,
        domain: "psychologist_account",
        metadata: audit.metadata,
        reason: audit.reason,
        safe_after: audit.safeAfter,
        safe_before: audit.safeBefore,
        source: "admin_panel",
        target_id: audit.targetId,
        target_type: "psychologist",
      },
      select: { id: true },
    });
  }
}
