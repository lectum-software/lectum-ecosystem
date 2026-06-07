import type { Prisma } from "@/external/generated/prisma/client";
import prisma from "@/infra/database/prisma";
import type {
  FreeProfessionalProfileResponse,
  FreeProfessionalProfileUpdateBody,
  FreeProfileCatalogItem,
} from "../DTOs/IFreeProfileDTO";
import type { IFreeProfileRepository } from "./interfaces/IFreeProfileRepository";

const catalogSelect = {
  id: true,
  name: true,
  slug: true,
};

type UserWithProfile = NonNullable<Awaited<ReturnType<typeof getUserWithProfile>>>;

const normalizeStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
};

const onlyDigits = (value?: string | null) => String(value ?? "").replace(/\D/g, "");

const buildWhatsappUrl = (value?: string | null) => {
  const digits = onlyDigits(value);
  return digits ? `https://wa.me/${digits}` : null;
};

const parseCrp = (value?: string | null) => {
  const normalized = value?.trim();
  if (!normalized) {
    return {
      crp_region: null,
      crp_number: null,
    };
  }

  const [region, ...numberParts] = normalized.split("/");
  const crp_region = region?.trim() || null;
  const crp_number = numberParts.join("/").trim() || null;

  return { crp_region, crp_number };
};

const buildCrp = (region?: string | null, number?: string | null) => {
  const normalizedRegion = region?.trim();
  const normalizedNumber = number?.trim();

  if (normalizedRegion && normalizedNumber) return `${normalizedRegion}/${normalizedNumber}`;
  return normalizedRegion || normalizedNumber || null;
};

const isCatalogItem = (value: FreeProfileCatalogItem | null): value is FreeProfileCatalogItem => {
  return Boolean(value?.id && value.name && value.slug);
};

const getUserWithProfile = (userId: string) => {
  return prisma.user.findFirst({
    where: {
      id: userId,
      role: "psicologo",
      active: true,
      deleted: false,
    },
    select: {
      id: true,
      name: true,
      avatar: true,
      psychologist_profile: {
        select: {
          id: true,
          headline: true,
          bio: true,
          modality: true,
          languages: true,
          cpf: true,
          whatsapp: true,
          published: true,
          crp: true,
          crp_status: true,
          cfp_verified_at: true,
          subscriptions: {
            where: {
              deleted: false,
              status: "ativa",
            },
            include: {
              plan: true,
            },
            orderBy: {
              createdAt: "desc",
            },
            take: 1,
          },
        },
      },
      psychologist_specialties: {
        where: { deleted: false, specialty: { active: true, deleted: false } },
        select: { specialty: { select: catalogSelect } },
      },
      psychologist_services: {
        where: { deleted: false, service: { active: true, deleted: false } },
        select: { service: { select: catalogSelect } },
      },
      psychologist_approaches: {
        where: { deleted: false, approach: { active: true, deleted: false } },
        select: { approach: { select: catalogSelect } },
      },
    },
  });
};

const getCatalogs = async () => {
  const [specialties, services, approaches] = await Promise.all([
    prisma.specialty.findMany({
      where: { active: true, deleted: false },
      orderBy: { name: "asc" },
      select: catalogSelect,
    }),
    prisma.service.findMany({
      where: { active: true, deleted: false },
      orderBy: { name: "asc" },
      select: catalogSelect,
    }),
    prisma.approach.findMany({
      where: { active: true, deleted: false },
      orderBy: { name: "asc" },
      select: catalogSelect,
    }),
  ]);

  return { specialties, services, approaches };
};

const toResponse = async (
  item: UserWithProfile,
): Promise<FreeProfessionalProfileResponse | null> => {
  const profile = item.psychologist_profile;
  if (!profile) return null;

  const current = profile.subscriptions[0] || null;
  const planSlug = current?.plan?.slug || null;
  const isFree = planSlug === "gratuito" || !planSlug;
  const specialtyLimit = isFree ? 3 : 99;
  const catalogs = await getCatalogs();
  const crp = parseCrp(profile.crp);

  return {
    user: {
      id: item.id,
      name: item.name,
      avatar: item.avatar,
    },
    profile: {
      id: profile.id,
      headline: profile.headline,
      bio: profile.bio,
      modality: profile.modality,
      languages: normalizeStringArray(profile.languages),
      cpf: profile.cpf,
      whatsapp: profile.whatsapp,
      whatsapp_url: buildWhatsappUrl(profile.whatsapp),
      published: profile.published,
      crp: profile.crp,
      crp_region: crp.crp_region,
      crp_number: crp.crp_number,
      crp_status: profile.crp_status,
      cfp_verified_at: profile.cfp_verified_at,
    },
    plan: {
      slug: planSlug,
      is_free: isFree,
      specialty_limit: specialtyLimit,
    },
    selected: {
      specialties: item.psychologist_specialties
        .map(({ specialty }) => specialty)
        .filter(isCatalogItem),
      services: item.psychologist_services.map(({ service }) => service).filter(isCatalogItem),
      approaches: item.psychologist_approaches
        .map(({ approach }) => approach)
        .filter(isCatalogItem),
    },
    catalogs,
  };
};

export class FreeProfileRepository implements IFreeProfileRepository {
  async show(userId: string): Promise<FreeProfessionalProfileResponse | null> {
    const item = await getUserWithProfile(userId);
    if (!item) return null;
    return toResponse(item);
  }

  async update(
    userId: string,
    body: Required<FreeProfessionalProfileUpdateBody>,
  ): Promise<FreeProfessionalProfileResponse | null> {
    const existing = await getUserWithProfile(userId);
    const profile = existing?.psychologist_profile;
    if (!existing || !profile) return null;

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { name: body.name },
      });

      await tx.psychologist_profile.update({
        where: { id: profile.id },
        data: {
          headline: body.headline,
          bio: body.bio,
          modality: body.modality,
          cpf: body.cpf,
          crp: buildCrp(body.crp_region, body.crp_number),
          whatsapp: body.whatsapp,
          languages: body.languages as Prisma.InputJsonValue,
          video_url: null,
          published: body.published,
        },
      });

      await tx.psychologist_specialty.deleteMany({ where: { psychologist_id: userId } });
      if (body.specialty_ids.length > 0) {
        await tx.psychologist_specialty.createMany({
          data: body.specialty_ids.map((specialty_id) => ({
            psychologist_id: userId,
            specialty_id,
          })),
          skipDuplicates: true,
        });
      }

      await tx.psychologist_service.deleteMany({ where: { psychologist_id: userId } });
      if (body.service_ids.length > 0) {
        await tx.psychologist_service.createMany({
          data: body.service_ids.map((service_id) => ({ psychologist_id: userId, service_id })),
          skipDuplicates: true,
        });
      }

      await tx.psychologist_approach.deleteMany({ where: { psychologist_id: userId } });
      if (body.approach_ids.length > 0) {
        await tx.psychologist_approach.createMany({
          data: body.approach_ids.map((approach_id) => ({ psychologist_id: userId, approach_id })),
          skipDuplicates: true,
        });
      }
    });

    return this.show(userId);
  }
}
