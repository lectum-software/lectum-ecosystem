import type { Resolve } from "@/helpers/return";
import { error, msg } from "@/helpers/translate";
import prisma from "@/infra/database/prisma";
import type { PublicCommunitySeoDTO } from "../DTOs/IPublicCommunitySeoDTO";

type CommunitySeoParams = {
  slug: string;
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

const notFound = (): Resolve => ({
  status: 404,
  ...error("not_found", { gender: "a", model: "community" }),
});

export const show = async ({ slug }: CommunitySeoParams): Promise<Resolve> => {
  const community = await prisma.community.findFirst({
    where: {
      active: true,
      deleted: false,
      slug,
    },
    select: {
      avatar_url: true,
      description: true,
      name: true,
      slug: true,
      updatedAt: true,
    },
  });

  if (!community) return notFound();

  const name = normalizeSpaces(community.name) || "Comunidade Lectum";
  const description =
    compactDescription(community.description) ||
    "Comunidade pública da Lectum com perguntas, relatos e respostas de psicólogos.";
  const data: PublicCommunitySeoDTO = {
    canonical_url: `/community/${community.slug}`,
    description,
    name,
    og_description: description,
    og_image_height: community.avatar_url ? 512 : null,
    og_image_url: community.avatar_url,
    og_image_width: community.avatar_url ? 512 : null,
    og_title: name,
    slug: community.slug,
    title: `${name} | Lectum`,
    updated_at: community.updatedAt,
  };

  return {
    status: 200,
    ...msg("index", {}),
    data,
  };
};
