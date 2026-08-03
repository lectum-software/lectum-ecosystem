import type { Prisma } from "@/external/generated/prisma/client";
import type { Resolve } from "@/helpers/return";
import { error, msg } from "@/helpers/translate";
import prisma from "@/infra/database/prisma";
import { buildProfessionalFullDisplayName } from "@/utils/professional-name";
import type { PublicPsychologistSeoDTO } from "../DTOs/IPublicPsychologistSeoDTO";

type PsychologistSeoParams = {
  id: string;
};

const TEXT_MAX_LENGTH = 180;

const normalizeSpaces = (value?: string | null) =>
  String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();

const truncate = (value: string, maxLength: number) => {
  if (value.length <= maxLength) return value;

  return `${value.slice(0, Math.max(0, maxLength - 3)).trim()}...`;
};

const compactDescription = (value?: string | null) =>
  truncate(normalizeSpaces(value), TEXT_MAX_LENGTH);

const publishedPsychologistWhere = (id: string): Prisma.userWhereInput => ({
  id,
  role: "psicologo",
  active: true,
  deleted: false,
  psychologist_specialties: {
    some: {
      deleted: false,
      specialty: {
        active: true,
        deleted: false,
      },
    },
  },
  psychologist_services: {
    some: {
      deleted: false,
      service: {
        active: true,
        deleted: false,
      },
    },
  },
  psychologist_approaches: {
    some: {
      deleted: false,
      approach: {
        active: true,
        deleted: false,
      },
    },
  },
  psychologist_profile: {
    is: {
      published: true,
      deleted: false,
      video_url: {
        not: null,
      },
      modality: {
        not: null,
      },
      gender: {
        not: null,
      },
      cpf: {
        not: null,
      },
      crp: {
        not: null,
      },
      professional_address_city: {
        not: null,
      },
      professional_address_state: {
        not: null,
      },
      target_audience: {
        not: [],
      },
      NOT: [
        { video_url: "" },
        { modality: "" },
        { gender: "" },
        { cpf: "" },
        { crp: "" },
        { professional_address_city: "" },
        { professional_address_state: "" },
      ],
    },
  },
});

const notFound = (): Resolve => ({
  status: 404,
  ...error("not_found", { model: "psychologist_profile" }),
});

export const show = async ({ id }: PsychologistSeoParams): Promise<Resolve> => {
  const psychologist = await prisma.user.findFirst({
    where: publishedPsychologistWhere(id),
    select: {
      avatar: true,
      id: true,
      name: true,
      updatedAt: true,
      psychologist_profile: {
        select: {
          bio: true,
          headline: true,
          professional_first_name: true,
          professional_last_name: true,
          updatedAt: true,
        },
      },
    },
  });

  if (!psychologist?.psychologist_profile) return notFound();

  const profile = psychologist.psychologist_profile;
  const name =
    buildProfessionalFullDisplayName({
      fallbackName: psychologist.name,
      firstName: profile.professional_first_name,
      lastName: profile.professional_last_name,
    }) ||
    normalizeSpaces(psychologist.name) ||
    "Psicólogo Lectum";
  const description =
    compactDescription(profile.headline || profile.bio) ||
    "Perfil público de psicólogo na Lectum, com informações profissionais e participação em comunidades.";
  const data: PublicPsychologistSeoDTO = {
    canonical_url: `/psicologos/${psychologist.id}`,
    description,
    name,
    og_description: description,
    og_image_height: psychologist.avatar ? 512 : null,
    og_image_url: psychologist.avatar,
    og_image_width: psychologist.avatar ? 512 : null,
    og_title: name,
    title: `${name} | Lectum`,
    updated_at:
      profile.updatedAt && profile.updatedAt > psychologist.updatedAt
        ? profile.updatedAt
        : psychologist.updatedAt,
  };

  return {
    status: 200,
    ...msg("index", {}),
    data,
  };
};
