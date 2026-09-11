import type { Prisma } from "@/external/generated/prisma/client";

// Suspensão/desativação não ocultam o histórico dos administradores autenticados.
export const activitiesProfileWhere = (id: string) =>
  ({
    deleted: false,
    OR: [{ id }, { user_id: id }],
    user: {
      deleted: false,
      role: "psicologo",
    },
  }) satisfies Prisma.psychologist_profileWhereInput;
