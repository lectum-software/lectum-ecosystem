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

const patientIntentProfileViewSelect = {
  createdAt: true,
  id: true,
  psychologist_id: true,
  viewer_id: true,
} satisfies Prisma.profile_view_eventSelect;

const patientIntentFavoriteSelect = {
  createdAt: true,
  id: true,
  psychologist_id: true,
  user_id: true,
} satisfies Prisma.psychologist_favoriteSelect;

const patientIntentWhatsappClickSelect = {
  createdAt: true,
  id: true,
  psychologist_id: true,
  user_id: true,
} satisfies Prisma.contact_requestSelect;

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

  async listIntentSignals(patientIds: string[]) {
    if (patientIds.length === 0) {
      return {
        favorites: [],
        profileViews: [],
        whatsappClicks: [],
      };
    }

    const profileViews = await prisma.profile_view_event.findMany({
      orderBy: {
        createdAt: "asc",
      },
      select: patientIntentProfileViewSelect,
      where: {
        deleted: false,
        psychologist: {
          deleted: false,
          role: "psicologo",
        },
        source: "profile_page",
        viewer: {
          deleted: false,
          role: "paciente",
        },
        viewer_id: {
          in: patientIds,
        },
      },
    });
    const favorites = await prisma.psychologist_favorite.findMany({
      orderBy: {
        createdAt: "asc",
      },
      select: patientIntentFavoriteSelect,
      where: {
        deleted: false,
        psychologist: {
          deleted: false,
          role: "psicologo",
        },
        user: {
          deleted: false,
          role: "paciente",
        },
        user_id: {
          in: patientIds,
        },
      },
    });
    const whatsappClicks = await prisma.contact_request.findMany({
      orderBy: {
        createdAt: "asc",
      },
      select: patientIntentWhatsappClickSelect,
      where: {
        channel: "whatsapp",
        deleted: false,
        psychologist: {
          deleted: false,
          role: "psicologo",
        },
        user: {
          deleted: false,
          role: "paciente",
        },
        user_id: {
          in: patientIds,
        },
      },
    });

    return {
      favorites,
      profileViews,
      whatsappClicks,
    };
  }
}
