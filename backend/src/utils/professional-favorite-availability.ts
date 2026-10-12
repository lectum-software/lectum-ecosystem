import type { Prisma } from "@/external/generated/prisma/client";

type ProfessionalFavoriteAvailabilityAuthor = {
  active: boolean;
  deleted: boolean;
  role: string | null;
  psychologist_profile?: {
    deleted: boolean;
    published: boolean;
    video_url: string | null;
  } | null;
};

export const isProfessionalFavoriteAvailable = (author: ProfessionalFavoriteAvailabilityAuthor) => {
  const profile = author.psychologist_profile;

  return Boolean(
    author.role === "psicologo" &&
      author.active &&
      !author.deleted &&
      profile &&
      !profile.deleted &&
      profile.published &&
      profile.video_url?.trim(),
  );
};

export const professionalFavoriteAvailableProfileWhere =
  (): Prisma.psychologist_profileWhereInput => ({
    deleted: false,
    published: true,
    video_url: {
      not: null,
    },
    NOT: [
      {
        video_url: "",
      },
    ],
  });

export const professionalFavoriteAvailableUserWhere = (): Prisma.userWhereInput => ({
  active: true,
  deleted: false,
  role: "psicologo",
  psychologist_profile: {
    is: professionalFavoriteAvailableProfileWhere(),
  },
});
