import type { Prisma } from "@/external/generated/prisma/client";
import prisma from "@/infra/database/prisma";

const latestLocationSelect = {
  city: true,
  country: true,
  createdAt: true,
  id: true,
  state: true,
  user_id: true,
} satisfies Prisma.visitor_locationSelect;

const patientListSelect = {
  active: true,
  avatar: true,
  createdAt: true,
  email: true,
  id: true,
  name: true,
  provider: true,
  patient_profile: {
    select: {
      gender: true,
      onboarding_completed_at: true,
    },
  },
  visitor_locations: {
    orderBy: {
      createdAt: "desc" as const,
    },
    take: 1,
    where: {
      deleted: false,
    },
    select: latestLocationSelect,
  },
} satisfies Prisma.userSelect;

export type AdminPatientListRecord = Prisma.userGetPayload<{
  select: typeof patientListSelect;
}>;

export class AdminPatientsListRepository {
  async listPatients(): Promise<AdminPatientListRecord[]> {
    return prisma.user.findMany({
      orderBy: {
        createdAt: "desc",
      },
      select: patientListSelect,
      where: {
        deleted: false,
        role: "paciente",
      },
    });
  }
}
