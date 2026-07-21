import type { Prisma } from "@/external/generated/prisma/client";
import prisma from "@/infra/database/prisma";

const patientSelect = {
  active: true,
  createdAt: true,
  id: true,
  name: true,
  patient_profile: {
    select: {
      id: true,
    },
  },
  role: true,
} satisfies Prisma.userSelect;

const communitySelect = {
  deleted: true,
  id: true,
  name: true,
  slug: true,
} satisfies Prisma.communitySelect;

const reportAuthorSelect = {
  avatar: true,
  id: true,
  name: true,
  psychologist_profile: {
    select: {
      gender: true,
      professional_first_name: true,
      professional_last_name: true,
    },
  },
  role: true,
} satisfies Prisma.userSelect;

const reportSelect = {
  createdAt: true,
  deleted: true,
  deletedAt: true,
  description: true,
  id: true,
  post_id: true,
  reason: true,
  reply_id: true,
  status: true,
  target_id: true,
  target_type: true,
  post: {
    select: {
      author: {
        select: reportAuthorSelect,
      },
      author_id: true,
      content: true,
      createdAt: true,
      deleted: true,
      deletedAt: true,
      id: true,
      media_items: {
        orderBy: [{ position: "asc" }, { createdAt: "asc" }, { id: "asc" }],
        select: {
          id: true,
          media_type: true,
          media_url: true,
          position: true,
        },
        where: {
          deleted: false,
        },
      },
      media_type: true,
      media_url: true,
      status: true,
      title: true,
      community: {
        select: communitySelect,
      },
    },
  },
  reply: {
    select: {
      author: {
        select: reportAuthorSelect,
      },
      author_id: true,
      content: true,
      createdAt: true,
      deleted: true,
      deletedAt: true,
      id: true,
      media_type: true,
      media_url: true,
      parent_reply_id: true,
      post_id: true,
      title: true,
      post: {
        select: {
          deleted: true,
          deletedAt: true,
          id: true,
          status: true,
          title: true,
          community: {
            select: communitySelect,
          },
        },
      },
    },
  },
  reporter: {
    select: {
      name: true,
      role: true,
    },
  },
} satisfies Prisma.post_reportSelect;

export type AdminPatientReportsProfile = Prisma.userGetPayload<{
  select: typeof patientSelect;
}>;

export type AdminPatientReportRecord = Prisma.post_reportGetPayload<{
  select: typeof reportSelect;
}>;

const createdAtBetween = (from: Date | null, to: Date | null) =>
  from && to ? { createdAt: { gte: from, lte: to } } : {};

const patientReportTargetWhere = (patientId: string) => ({
  OR: [
    {
      reply_id: null,
      target_type: "post",
      post: {
        author_id: patientId,
      },
    },
    {
      reply_id: {
        not: null,
      },
      reply: {
        author_id: patientId,
      },
    },
  ],
});

export class AdminPatientReportsRepository {
  async findPatient(id: string): Promise<AdminPatientReportsProfile | null> {
    return prisma.user.findFirst({
      select: patientSelect,
      where: {
        deleted: false,
        id,
        role: "paciente",
      },
    });
  }

  async listReports(
    patientId: string,
    from: Date | null,
    to: Date | null,
  ): Promise<AdminPatientReportRecord[]> {
    return prisma.post_report.findMany({
      orderBy: {
        createdAt: "desc",
      },
      select: reportSelect,
      where: {
        ...createdAtBetween(from, to),
        deleted: false,
        ...patientReportTargetWhere(patientId),
      },
    });
  }
}
