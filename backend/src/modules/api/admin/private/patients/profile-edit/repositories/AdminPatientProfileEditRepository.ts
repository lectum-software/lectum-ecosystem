import type { Prisma } from "@/external/generated/prisma/client";
import prisma from "@/infra/database/prisma";

const patientProfileSelect = {
  deleted: true,
  gender: true,
  id: true,
} satisfies Prisma.patient_profileSelect;

const patientEditSelect = {
  email: true,
  id: true,
  name: true,
  patient_profile: {
    select: patientProfileSelect,
  },
  role: true,
} satisfies Prisma.userSelect;

export type AdminPatientProfileEditRecord = Prisma.userGetPayload<{
  select: typeof patientEditSelect;
}>;

export type AdminPatientProfileEditAudit = {
  adminId: string;
  changedFields: string[];
  metadata: Prisma.InputJsonObject;
  reason: string | null;
  safeAfter: Prisma.InputJsonObject;
  safeBefore: Prisma.InputJsonObject;
  targetId: string;
};

export type AdminPatientPersonalProfileUpdate = {
  gender: string | null;
};

export class AdminPatientProfileEditRepository {
  async findPatient(id: string): Promise<AdminPatientProfileEditRecord | null> {
    return prisma.user.findFirst({
      select: patientEditSelect,
      where: {
        deleted: false,
        id,
        role: "paciente",
      },
    });
  }

  async updatePersonalData(
    patient: AdminPatientProfileEditRecord,
    input: {
      audit: AdminPatientProfileEditAudit | null;
      profile: AdminPatientPersonalProfileUpdate;
    },
  ) {
    return prisma.$transaction(async (tx) => {
      const profile = await tx.patient_profile.upsert({
        create: {
          gender: input.profile.gender,
          user_id: patient.id,
        },
        select: { id: true },
        update: {
          deleted: false,
          deletedAt: null,
          gender: input.profile.gender,
        },
        where: { user_id: patient.id },
      });

      if (input.audit) {
        await tx.admin_activity_log.create({
          data: {
            action: "patient_personal_data_updated",
            admin_id: input.audit.adminId,
            area: "perfil_e_cadastro",
            changed_fields: input.audit.changedFields as Prisma.InputJsonValue,
            domain: "patient_profile",
            metadata: {
              ...input.audit.metadata,
              profile_id: profile.id,
            },
            reason: input.audit.reason,
            safe_after: input.audit.safeAfter,
            safe_before: input.audit.safeBefore,
            source: "admin_panel",
            target_id: input.audit.targetId,
            target_type: "patient",
          },
          select: { id: true },
        });
      }
    });
  }
}
