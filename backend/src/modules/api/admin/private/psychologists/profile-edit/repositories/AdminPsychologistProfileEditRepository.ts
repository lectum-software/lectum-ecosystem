import type { Prisma } from "@/external/generated/prisma/client";
import prisma from "@/infra/database/prisma";

const catalogSelect = {
  active: true,
  id: true,
  name: true,
  slug: true,
} satisfies Prisma.specialtySelect;

const optionSelect = {
  active: true,
  id: true,
  name: true,
  slug: true,
  type: true,
} satisfies Prisma.profile_catalog_optionSelect;

const profileEditSelect = {
  birthdate: true,
  cfp_verified_at: true,
  cpf: true,
  crp_status: true,
  gender: true,
  id: true,
  languages: true,
  modality: true,
  professional_address_city: true,
  professional_address_complement: true,
  professional_address_district: true,
  professional_address_number: true,
  professional_address_state: true,
  professional_address_street: true,
  professional_address_zip: true,
  race_color: true,
  religion: true,
  target_audience: true,
  user: {
    select: {
      active: true,
      email: true,
      id: true,
      name: true,
      psychologist_approaches: {
        where: { deleted: false },
        select: {
          approach_id: true,
          approach: { select: catalogSelect },
        },
      },
      psychologist_services: {
        where: { deleted: false },
        select: {
          service_id: true,
          service: { select: catalogSelect },
        },
      },
      psychologist_specialties: {
        where: { deleted: false },
        select: {
          specialty_id: true,
          specialty: { select: catalogSelect },
        },
      },
      role: true,
    },
  },
  user_id: true,
  whatsapp: true,
} satisfies Prisma.psychologist_profileSelect;

export type AdminPsychologistProfileEditRecord = Prisma.psychologist_profileGetPayload<{
  select: typeof profileEditSelect;
}>;

export type AdminPsychologistProfileEditCatalog = Prisma.specialtyGetPayload<{
  select: typeof catalogSelect;
}>;

export type AdminPsychologistProfileEditCatalogOption = Prisma.profile_catalog_optionGetPayload<{
  select: typeof optionSelect;
}>;

export type AdminPsychologistProfileEditAudit = {
  action: "psychologist_personal_data_updated" | "psychologist_professional_data_updated";
  adminId: string;
  changedFields: string[];
  metadata: Prisma.InputJsonObject;
  reason: string | null;
  safeAfter: Prisma.InputJsonObject;
  safeBefore: Prisma.InputJsonObject;
  targetId: string;
};

export type AdminPsychologistPersonalProfileUpdate = Pick<
  Prisma.psychologist_profileUpdateInput,
  | "birthdate"
  | "cpf"
  | "gender"
  | "professional_address_city"
  | "professional_address_complement"
  | "professional_address_district"
  | "professional_address_number"
  | "professional_address_state"
  | "professional_address_street"
  | "professional_address_zip"
  | "race_color"
  | "religion"
  | "whatsapp"
>;

export type AdminPsychologistProfessionalProfileUpdate = Pick<
  Prisma.psychologist_profileUpdateInput,
  "languages" | "modality" | "target_audience"
>;

export class AdminPsychologistProfileEditRepository {
  async findPsychologist(id: string): Promise<AdminPsychologistProfileEditRecord | null> {
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
      select: profileEditSelect,
    });
  }

  async listActiveSpecialties(ids: string[]): Promise<AdminPsychologistProfileEditCatalog[]> {
    if (ids.length === 0) return [];

    return prisma.specialty.findMany({
      orderBy: [{ position: "asc" }, { name: "asc" }],
      select: catalogSelect,
      where: {
        active: true,
        deleted: false,
        id: { in: ids },
        OR: [
          { category_id: null },
          {
            category: {
              active: true,
              deleted: false,
            },
          },
        ],
      },
    });
  }

  async listActiveServices(ids: string[]): Promise<AdminPsychologistProfileEditCatalog[]> {
    if (ids.length === 0) return [];

    return prisma.service.findMany({
      orderBy: [{ position: "asc" }, { name: "asc" }],
      select: catalogSelect,
      where: {
        active: true,
        deleted: false,
        id: { in: ids },
      },
    });
  }

  async listActiveApproaches(ids: string[]): Promise<AdminPsychologistProfileEditCatalog[]> {
    if (ids.length === 0) return [];

    return prisma.approach.findMany({
      orderBy: [{ position: "asc" }, { name: "asc" }],
      select: catalogSelect,
      where: {
        active: true,
        deleted: false,
        id: { in: ids },
      },
    });
  }

  async listActiveProfileOptions(
    type: "language" | "target_audience",
    values: string[],
  ): Promise<AdminPsychologistProfileEditCatalogOption[]> {
    if (values.length === 0) return [];

    const normalized = values.map((value) => value.trim()).filter(Boolean);

    return prisma.profile_catalog_option.findMany({
      orderBy: [{ position: "asc" }, { name: "asc" }],
      select: optionSelect,
      where: {
        active: true,
        deleted: false,
        type,
        OR: [
          { name: { in: normalized } },
          { slug: { in: normalized } },
          { id: { in: normalized } },
        ],
      },
    });
  }

  async updatePersonalData(
    profileId: string,
    input: {
      audit: AdminPsychologistProfileEditAudit | null;
      profile: AdminPsychologistPersonalProfileUpdate;
    },
  ) {
    return prisma.$transaction(async (tx) => {
      await tx.psychologist_profile.update({
        data: input.profile,
        select: { id: true },
        where: { id: profileId },
      });

      if (input.audit) {
        await tx.admin_activity_log.create({
          data: {
            action: input.audit.action,
            admin_id: input.audit.adminId,
            area: "perfil_e_cadastro",
            changed_fields: input.audit.changedFields as Prisma.InputJsonValue,
            domain: "psychologist_profile",
            metadata: input.audit.metadata,
            reason: input.audit.reason,
            safe_after: input.audit.safeAfter,
            safe_before: input.audit.safeBefore,
            source: "admin_panel",
            target_id: input.audit.targetId,
            target_type: "psychologist",
          },
          select: { id: true },
        });
      }
    });
  }

  async updateProfessionalData(
    profile: AdminPsychologistProfileEditRecord,
    input: {
      approachIds: string[];
      audit: AdminPsychologistProfileEditAudit | null;
      profile: AdminPsychologistProfessionalProfileUpdate;
      serviceIds: string[];
      specialtyIds: string[];
    },
  ) {
    return prisma.$transaction(async (tx) => {
      await tx.psychologist_profile.update({
        data: input.profile,
        select: { id: true },
        where: { id: profile.id },
      });

      const relationDeletedAt = new Date();

      await tx.psychologist_specialty.updateMany({
        data: { deleted: true, deletedAt: relationDeletedAt },
        where: {
          deleted: false,
          psychologist_id: profile.user_id,
          ...(input.specialtyIds.length > 0 ? { specialty_id: { notIn: input.specialtyIds } } : {}),
        },
      });
      for (const specialty_id of input.specialtyIds) {
        await tx.psychologist_specialty.upsert({
          create: { psychologist_id: profile.user_id, specialty_id },
          update: { deleted: false, deletedAt: null },
          where: {
            psychologist_id_specialty_id: {
              psychologist_id: profile.user_id,
              specialty_id,
            },
          },
        });
      }

      await tx.psychologist_service.updateMany({
        data: { deleted: true, deletedAt: relationDeletedAt },
        where: {
          deleted: false,
          psychologist_id: profile.user_id,
          ...(input.serviceIds.length > 0 ? { service_id: { notIn: input.serviceIds } } : {}),
        },
      });
      for (const service_id of input.serviceIds) {
        await tx.psychologist_service.upsert({
          create: { psychologist_id: profile.user_id, service_id },
          update: { deleted: false, deletedAt: null },
          where: {
            psychologist_id_service_id: {
              psychologist_id: profile.user_id,
              service_id,
            },
          },
        });
      }

      await tx.psychologist_approach.updateMany({
        data: { deleted: true, deletedAt: relationDeletedAt },
        where: {
          approach_id: input.approachIds.length > 0 ? { notIn: input.approachIds } : undefined,
          deleted: false,
          psychologist_id: profile.user_id,
        },
      });
      for (const approach_id of input.approachIds) {
        await tx.psychologist_approach.upsert({
          create: { approach_id, psychologist_id: profile.user_id },
          update: { deleted: false, deletedAt: null },
          where: {
            psychologist_id_approach_id: {
              approach_id,
              psychologist_id: profile.user_id,
            },
          },
        });
      }

      if (input.audit) {
        await tx.admin_activity_log.create({
          data: {
            action: input.audit.action,
            admin_id: input.audit.adminId,
            area: "perfil_e_cadastro",
            changed_fields: input.audit.changedFields as Prisma.InputJsonValue,
            domain: "psychologist_profile",
            metadata: input.audit.metadata,
            reason: input.audit.reason,
            safe_after: input.audit.safeAfter,
            safe_before: input.audit.safeBefore,
            source: "admin_panel",
            target_id: input.audit.targetId,
            target_type: "psychologist",
          },
          select: { id: true },
        });
      }
    });
  }
}
