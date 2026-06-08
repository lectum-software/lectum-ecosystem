export const include = {
  patient_profile: true,
  psychologist_profile: {
    include: {
      subscriptions: {
        where: {
          deleted: false,
          status: "ativa",
        },
        include: {
          plan: true,
        },
        orderBy: {
          createdAt: "desc" as const,
        },
        take: 1,
      },
    },
  },
};
