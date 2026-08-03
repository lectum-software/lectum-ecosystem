import type { Prisma } from "@/external/generated/prisma/client";
import prisma from "@/infra/database/prisma";

const accountTokenSelect = {
  createdAt: true,
  device_id: true,
  updatedAt: true,
} satisfies Prisma.user_tokenSelect;

const accountUserSelect = {
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
    orderBy: [{ updatedAt: "desc" as const }, { createdAt: "desc" as const }],
    select: accountTokenSelect,
    where: {
      deleted: false,
      token: {
        not: null,
      },
    },
  },
} satisfies Prisma.userSelect;

const accountProfileSelect = {
  id: true,
  user_id: true,
  user: {
    select: accountUserSelect,
  },
} satisfies Prisma.patient_profileSelect;

const existingUserSelect = {
  id: true,
} satisfies Prisma.userSelect;

type AdminPatientAccountUserRecord = Prisma.userGetPayload<{
  select: typeof accountUserSelect;
}>;

export type AdminPatientAccountRecord = {
  id: string;
  user: AdminPatientAccountUserRecord;
  user_id: string;
};

export type AdminPatientAccountAudit = {
  action:
    | "patient_account_email_changed"
    | "patient_account_email_confirmation_sent"
    | "patient_account_deactivated"
    | "patient_account_deleted"
    | "patient_account_password_reset_sent"
    | "patient_account_temporary_password_set"
    | "patient_account_suspended"
    | "patient_account_sessions_revoked"
    | "patient_account_view_as_started";
  adminId: string;
  changedFields: string[];
  metadata: Prisma.InputJsonObject;
  reason: string;
  safeAfter: Prisma.InputJsonObject;
  safeBefore: Prisma.InputJsonObject;
  targetId: string;
};

export class AdminPatientAccountRepository {
  async findPatient(id: string): Promise<AdminPatientAccountRecord | null> {
    const profile = await prisma.patient_profile.findFirst({
      where: {
        deleted: false,
        OR: [{ id }, { user_id: id }],
        user: {
          deleted: false,
          role: "paciente",
        },
      },
      select: accountProfileSelect,
    });

    if (profile) return profile;

    const user = await prisma.user.findFirst({
      where: {
        deleted: false,
        id,
        role: "paciente",
      },
      select: accountUserSelect,
    });

    if (!user) return null;

    return {
      id: user.id,
      user,
      user_id: user.id,
    };
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
    audit: AdminPatientAccountAudit;
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
    audit: AdminPatientAccountAudit;
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
    audit: AdminPatientAccountAudit;
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
    audit: AdminPatientAccountAudit;
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

  async revokeSessions(input: { audit: AdminPatientAccountAudit; userId: string }) {
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
    audit: AdminPatientAccountAudit;
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
    audit: AdminPatientAccountAudit;
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

  private async createAuditLog(tx: Prisma.TransactionClient, audit: AdminPatientAccountAudit) {
    await tx.admin_activity_log.create({
      data: {
        action: audit.action,
        admin_id: audit.adminId,
        area: "conta_e_acesso",
        changed_fields: audit.changedFields as Prisma.InputJsonValue,
        domain: "patient_account",
        metadata: audit.metadata,
        reason: audit.reason,
        safe_after: audit.safeAfter,
        safe_before: audit.safeBefore,
        source: "admin_panel",
        target_id: audit.targetId,
        target_type: "patient",
      },
      select: { id: true },
    });
  }
}
