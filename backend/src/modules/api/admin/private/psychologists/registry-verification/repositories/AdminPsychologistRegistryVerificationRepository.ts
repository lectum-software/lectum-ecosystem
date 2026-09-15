import type { Prisma } from "@/external/generated/prisma/client";
import prisma from "@/infra/database/prisma";
import { withSerializableTransaction } from "@/utils/prisma-transaction";
import {
  activeProfessionalCourtesyEntitlementWhere,
  activeProfessionalEntitlementWhere,
  activeSubscriptionPeriodWhere,
} from "@/utils/subscription-entitlement";

const registryCheckSelect = {
  checked_at: true,
  createdAt: true,
  cpf: true,
  found: true,
  id: true,
  provider: true,
  raw: true,
  registro: true,
  uf: true,
} satisfies Prisma.professional_registry_checkSelect;

const profileSelect = () =>
  ({
    cfp_verified_at: true,
    cpf: true,
    crp: true,
    crp_registration_date: true,
    crp_status: true,
    id: true,
    registry_checks: {
      orderBy: [{ checked_at: "desc" as const }, { createdAt: "desc" as const }],
      select: registryCheckSelect,
      take: 8,
      where: {
        deleted: false,
      },
    },
    subscriptions: {
      orderBy: {
        createdAt: "desc" as const,
      },
      where: {
        ...activeSubscriptionPeriodWhere(),
        plan: {
          active: true,
          deleted: false,
        },
      },
      select: {
        createdAt: true,
        current_period_end: true,
        grant_notes: true,
        grant_reason: true,
        grant_started_at: true,
        granted_by: true,
        id: true,
        plan: {
          select: {
            name: true,
            slug: true,
          },
        },
        source: true,
        status: true,
      },
      take: 5,
    },
    user: {
      select: {
        active: true,
        email: true,
        id: true,
        name: true,
        role: true,
      },
    },
    user_id: true,
    updatedAt: true,
  }) satisfies Prisma.psychologist_profileSelect;

const previousProfileSelect = {
  cfp_verified_at: true,
  cpf: true,
  crp: true,
  crp_registration_date: true,
  crp_status: true,
  id: true,
  user_id: true,
  updatedAt: true,
} satisfies Prisma.psychologist_profileSelect;

export type AdminPsychologistRegistryVerificationRecord = Prisma.psychologist_profileGetPayload<{
  select: ReturnType<typeof profileSelect>;
}>;

export type AdminPsychologistRegistryVerificationCheck =
  AdminPsychologistRegistryVerificationRecord["registry_checks"][number];

export type AdminPsychologistRegistryVerificationPreviousRecord =
  Prisma.psychologist_profileGetPayload<{
    select: typeof previousProfileSelect;
  }>;

export type AdminRegistryVerificationManualAudit = Prisma.InputJsonObject;

export type ApproveManualRegistryVerificationArgs = {
  checkedAt: Date;
  expectedProfile: AdminPsychologistRegistryVerificationPreviousRecord;
  cpf: string;
  crp: string;
  raw: AdminRegistryVerificationManualAudit;
  registrationDate: Date;
  registrationNumber: string;
  regionalCrp: string;
};

export type RejectManualRegistryVerificationArgs = {
  checkedAt: Date;
  expectedProfile: AdminPsychologistRegistryVerificationPreviousRecord;
  cpf: string | null;
  raw: AdminRegistryVerificationManualAudit;
  registrationNumber: string | null;
  regionalCrp: string | null;
};

export type UpdateRegistryIdentityArgs = {
  crp: string;
  registrationDate: Date;
};

// A decision is valid only for the snapshot reviewed by the administrator.
// Comparing the identity as well as updatedAt also protects sub-millisecond races.
const unchangedProfileWhere = (
  id: string,
  previous: AdminPsychologistRegistryVerificationPreviousRecord,
): Prisma.psychologist_profileWhereInput => ({
  id,
  deleted: false,
  updatedAt: previous.updatedAt,
  cpf: previous.cpf,
  crp: previous.crp,
  crp_registration_date: previous.crp_registration_date,
  crp_status: previous.crp_status,
  cfp_verified_at: previous.cfp_verified_at,
  user: { active: true, deleted: false, role: "psicologo" },
  subscriptions: { some: activeProfessionalEntitlementWhere() },
  NOT: { subscriptions: { some: activeProfessionalCourtesyEntitlementWhere() } },
});

export class AdminPsychologistRegistryVerificationRepository {
  async findPsychologist(id: string): Promise<AdminPsychologistRegistryVerificationRecord | null> {
    return prisma.psychologist_profile.findFirst({
      where: {
        deleted: false,
        OR: [{ id }, { user_id: id }],
        user: {
          active: true,
          deleted: false,
          role: "psicologo",
        },
      },
      select: profileSelect(),
    });
  }

  async getPreviousProfile(
    profileId: string,
  ): Promise<AdminPsychologistRegistryVerificationPreviousRecord | null> {
    return prisma.psychologist_profile.findFirst({
      where: {
        deleted: false,
        id: profileId,
      },
      select: previousProfileSelect,
    });
  }

  async approveManual(profileId: string, args: ApproveManualRegistryVerificationArgs) {
    return withSerializableTransaction(async (tx) => {
      const updated = await tx.psychologist_profile.updateMany({
        where: unchangedProfileWhere(profileId, args.expectedProfile),
        data: {
          cpf: args.cpf,
          crp: args.crp,
          crp_registration_date: args.registrationDate,
          crp_status: "aprovado",
        },
      });

      if (updated.count === 0) return null;

      return tx.professional_registry_check.create({
        data: {
          checked_at: args.checkedAt,
          cpf: args.cpf,
          found: true,
          provider: "manual_admin",
          psychologist_id: profileId,
          raw: args.raw,
          registro: args.registrationNumber,
          uf: args.regionalCrp,
        },
        select: registryCheckSelect,
      });
    });
  }

  async rejectManual(profileId: string, args: RejectManualRegistryVerificationArgs) {
    return withSerializableTransaction(async (tx) => {
      const updated = await tx.psychologist_profile.updateMany({
        where: unchangedProfileWhere(profileId, args.expectedProfile),
        data: {
          crp_status: "rejeitado",
        },
      });

      if (updated.count === 0) return null;

      return tx.professional_registry_check.create({
        data: {
          checked_at: args.checkedAt,
          cpf: args.cpf,
          found: false,
          provider: "manual_admin",
          psychologist_id: profileId,
          raw: args.raw,
          registro: args.registrationNumber,
          uf: args.regionalCrp,
        },
        select: registryCheckSelect,
      });
    });
  }

  async updateIdentity(profileId: string, args: UpdateRegistryIdentityArgs) {
    return prisma.psychologist_profile.update({
      where: {
        id: profileId,
      },
      data: {
        crp: args.crp,
        crp_registration_date: args.registrationDate,
      },
      select: {
        id: true,
      },
    });
  }
}
