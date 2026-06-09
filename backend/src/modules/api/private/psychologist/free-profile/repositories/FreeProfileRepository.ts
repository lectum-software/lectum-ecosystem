import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { PUBLIC_BUCKET, S3 } from "@/config/multer/s3";
import type { Prisma } from "@/external/generated/prisma/client";
import prisma from "@/infra/database/prisma";
import { activeSubscriptionPeriodWhere } from "@/utils/subscription-entitlement";
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

const normalizeAcademicFormations = (
  value: unknown,
  fallback: FreeProfessionalProfileUpdateBody["academic"],
) => {
  const normalize = (item: unknown): NonNullable<FreeProfessionalProfileUpdateBody["academic"]> => {
    if (!item || typeof item !== "object") {
      return { title: null, institution: null, graduation_year: null };
    }

    const academic = item as Record<string, unknown>;

    return {
      title: typeof academic.title === "string" ? academic.title : null,
      institution: typeof academic.institution === "string" ? academic.institution : null,
      graduation_year:
        typeof academic.graduation_year === "string" ? academic.graduation_year : null,
    };
  };

  const hasContent = (item: NonNullable<FreeProfessionalProfileUpdateBody["academic"]>) =>
    Boolean(item.title || item.institution || item.graduation_year);

  if (Array.isArray(value)) {
    return value.map(normalize).filter(hasContent);
  }

  return fallback && hasContent(fallback) ? [fallback] : [];
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

const publicProfileMediaKeyFromUrl = (value?: string | null) => {
  if (!value) return null;

  try {
    const url = new URL(value, process.env.BASE || "http://localhost");
    const prefix = "/public/files/";

    if (!url.pathname.startsWith(prefix)) return null;

    const key = decodeURIComponent(url.pathname.slice(prefix.length));
    return key.startsWith("psychologist/avatar/") ||
      key.startsWith("psychologist/video/") ||
      key.startsWith("psychologist/video-cover/")
      ? key
      : null;
  } catch (_err) {
    return null;
  }
};

const deletePublicProfileMedia = async (value?: string | null) => {
  const key = publicProfileMediaKeyFromUrl(value);
  if (!key) return;

  try {
    await S3.send(
      new DeleteObjectCommand({
        Bucket: PUBLIC_BUCKET,
        Key: key,
      }),
    );
  } catch (_err) {
    // A troca de foto não deve falhar por limpeza assíncrona de arquivo anterior.
  }
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
          gender: true,
          race_color: true,
          religion: true,
          video_url: true,
          video_cover_url: true,
          target_audience: true,
          discount_first_session: true,
          social_value: true,
          accepts_insurance: true,
          show_experience_tag: true,
          academic_title: true,
          academic_institution: true,
          academic_graduation_year: true,
          academic_formations: true,
          available_days: true,
          professional_address_street: true,
          professional_address_number: true,
          professional_address_complement: true,
          professional_address_district: true,
          professional_address_zip: true,
          professional_address_city: true,
          professional_address_state: true,
          whatsapp: true,
          published: true,
          crp: true,
          crp_status: true,
          cfp_verified_at: true,
          subscriptions: {
            where: activeSubscriptionPeriodWhere(),
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
  const catalogs = await getCatalogs();
  const isFree = planSlug === "gratuito" || !planSlug;
  const canUseProfessionalFeatures = !isFree;
  const specialtyLimit = isFree ? 3 : 10;
  const serviceLimit = isFree ? 1 : Math.max(catalogs.services.length, 1);
  const approachLimit = isFree ? 1 : Math.max(catalogs.approaches.length, 1);
  const crp = parseCrp(profile.crp);
  const academic = {
    title: profile.academic_title,
    institution: profile.academic_institution,
    graduation_year: profile.academic_graduation_year,
  };

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
      gender: profile.gender,
      race_color: profile.race_color,
      religion: profile.religion,
      whatsapp: profile.whatsapp,
      whatsapp_url: buildWhatsappUrl(profile.whatsapp),
      video_url: profile.video_url,
      video_cover_url: profile.video_cover_url,
      target_audience: normalizeStringArray(profile.target_audience),
      discount_first_session: profile.discount_first_session,
      social_value: profile.social_value,
      accepts_insurance: profile.accepts_insurance,
      show_experience_tag: profile.show_experience_tag,
      academic,
      academic_formations: normalizeAcademicFormations(profile.academic_formations, academic),
      available_days: normalizeStringArray(profile.available_days),
      address: {
        street: profile.professional_address_street,
        number: profile.professional_address_number,
        complement: profile.professional_address_complement,
        district: profile.professional_address_district,
        zip: profile.professional_address_zip,
        city: profile.professional_address_city,
        state: profile.professional_address_state,
      },
      published: profile.published,
      crp: profile.crp,
      crp_region: crp.crp_region,
      crp_number: crp.crp_number,
      crp_status: profile.crp_status,
      cfp_verified_at: profile.cfp_verified_at,
    },
    plan: {
      approach_limit: approachLimit,
      can_upload_video: canUseProfessionalFeatures,
      current_period_end: current?.current_period_end ?? null,
      is_courtesy: current?.source === "admin_grant",
      slug: planSlug,
      is_free: isFree,
      service_limit: serviceLimit,
      source: current?.source ?? null,
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
    options: { canUseProfessionalFeatures: boolean },
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
          gender: body.gender,
          race_color: body.race_color,
          religion: body.religion,
          crp: buildCrp(body.crp_region, body.crp_number),
          whatsapp: body.whatsapp,
          languages: body.languages as Prisma.InputJsonValue,
          video_url: options.canUseProfessionalFeatures ? undefined : null,
          video_cover_url: options.canUseProfessionalFeatures ? undefined : null,
          target_audience: body.target_audience as Prisma.InputJsonValue,
          discount_first_session: body.discount_first_session,
          social_value: body.social_value,
          accepts_insurance: body.accepts_insurance,
          show_experience_tag: body.show_experience_tag,
          academic_title: body.academic.title,
          academic_institution: body.academic.institution,
          academic_graduation_year: body.academic.graduation_year,
          academic_formations: body.academic_formations as Prisma.InputJsonValue,
          available_days: body.available_days as Prisma.InputJsonValue,
          professional_address_street: body.address.street,
          professional_address_number: body.address.number,
          professional_address_complement: body.address.complement,
          professional_address_district: body.address.district,
          professional_address_zip: body.address.zip,
          professional_address_city: body.address.city,
          professional_address_state: body.address.state,
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

    if (!options.canUseProfessionalFeatures) {
      await deletePublicProfileMedia(profile.video_url);
      await deletePublicProfileMedia(profile.video_cover_url);
    }

    return this.show(userId);
  }

  async updateAvatar(
    userId: string,
    avatarUrl: string,
  ): Promise<FreeProfessionalProfileResponse | null> {
    const existing = await getUserWithProfile(userId);
    if (!existing?.psychologist_profile) return null;

    await prisma.user.update({
      where: { id: userId },
      data: { avatar: avatarUrl },
    });

    await deletePublicProfileMedia(existing.avatar);

    return this.show(userId);
  }

  async removeAvatar(userId: string): Promise<FreeProfessionalProfileResponse | null> {
    const existing = await getUserWithProfile(userId);
    if (!existing?.psychologist_profile) return null;

    await prisma.user.update({
      where: { id: userId },
      data: { avatar: null },
    });

    await deletePublicProfileMedia(existing.avatar);

    return this.show(userId);
  }

  async updateVideo(
    userId: string,
    videoUrl: string,
  ): Promise<FreeProfessionalProfileResponse | null> {
    const existing = await getUserWithProfile(userId);
    const profile = existing?.psychologist_profile;
    if (!profile) return null;

    await prisma.psychologist_profile.update({
      where: { id: profile.id },
      data: { video_url: videoUrl, video_cover_url: null },
    });

    await deletePublicProfileMedia(profile.video_url);
    await deletePublicProfileMedia(profile.video_cover_url);

    return this.show(userId);
  }

  async updateVideoCover(
    userId: string,
    videoCoverUrl: string,
  ): Promise<FreeProfessionalProfileResponse | null> {
    const existing = await getUserWithProfile(userId);
    const profile = existing?.psychologist_profile;
    if (!profile) return null;

    await prisma.psychologist_profile.update({
      where: { id: profile.id },
      data: { video_cover_url: videoCoverUrl },
    });

    await deletePublicProfileMedia(profile.video_cover_url);

    return this.show(userId);
  }

  async removeVideo(userId: string): Promise<FreeProfessionalProfileResponse | null> {
    const existing = await getUserWithProfile(userId);
    const profile = existing?.psychologist_profile;
    if (!profile) return null;

    await prisma.psychologist_profile.update({
      where: { id: profile.id },
      data: { video_url: null, video_cover_url: null },
    });

    await deletePublicProfileMedia(profile.video_url);
    await deletePublicProfileMedia(profile.video_cover_url);

    return this.show(userId);
  }
}
