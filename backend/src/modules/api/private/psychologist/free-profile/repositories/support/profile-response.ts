import { UPLOAD_LIMITS } from "@/config/multer/limits";
import type { Prisma } from "@/external/generated/prisma/client";
import prisma from "@/infra/database/prisma";

export {
  deletePublicProfileMedia,
  publicProfileMediaKeyFromUrl,
} from "@/modules/profile-media/public-storage";

import { resolveProfessionalExperienceTagVisibility } from "@/utils/professional-experience-tag";
import {
  buildProfessionalFullDisplayName,
  getProfessionalWhatsappDisplayName,
} from "@/utils/professional-name";
import { parseStoredCrp, resolveCrpFromRegistryChecks } from "@/utils/professional-registry";
import { activeSubscriptionPeriodWhere } from "@/utils/subscription-entitlement";
import { buildLectumWhatsappUrl } from "@/utils/whatsapp-contact";
import type {
  FreeProfessionalProfileActivationPendingField,
  FreeProfessionalProfileResponse,
  FreeProfessionalProfileUpdateBody,
  FreeProfileCatalogItem,
} from "../../DTOs/IFreeProfileDTO";

export const categorySelect = {
  active: true,
  id: true,
  name: true,
  position: true,
  slug: true,
} satisfies Prisma.specialty_categorySelect;

export const specialtyCatalogSelect = {
  active: true,
  category: {
    select: categorySelect,
  },
  category_id: true,
  id: true,
  name: true,
  position: true,
  slug: true,
} satisfies Prisma.specialtySelect;

export const catalogSelect = {
  active: true,
  id: true,
  name: true,
  position: true,
  slug: true,
};

export const catalogOrderBy = () => [{ position: "asc" as const }, { name: "asc" as const }];

export type UserWithProfile = NonNullable<Awaited<ReturnType<typeof getUserWithProfile>>>;

export const normalizeStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
};

export const normalizeAcademicFormations = (
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

export const onlyDigits = (value?: string | null) => String(value ?? "").replace(/\D/g, "");

export const buildWhatsappUrl = (
  value?: string | null,
  psychologistName?: string | null,
  psychologistWhatsappName?: string | null,
) =>
  buildLectumWhatsappUrl({
    phone: value,
    psychologistName,
    psychologistWhatsappName,
    source: "profile",
  });

export const buildCrp = (region?: string | null, number?: string | null) => {
  const normalizedRegion = region?.trim();
  const normalizedNumber = number?.trim();

  if (normalizedRegion && normalizedNumber) return `${normalizedRegion}/${normalizedNumber}`;
  return normalizedRegion || normalizedNumber || null;
};

export const hasText = (value?: string | null) => Boolean(value?.trim());

export const isProfessionalIdentityLocked = ({
  cfpVerifiedAt,
  cpf,
  crp,
  crpStatus,
  isFree,
  source,
}: {
  cfpVerifiedAt?: Date | null;
  cpf?: string | null;
  crp?: string | null;
  crpStatus?: string | null;
  isFree: boolean;
  source?: string | null;
}) => {
  const hasAdministrativeCourtesy = !isFree && source === "admin_grant";
  const hasVerifiedRegistryIdentity =
    !isFree &&
    (Boolean(cfpVerifiedAt) || crpStatus === "aprovado") &&
    onlyDigits(cpf).length === 11 &&
    hasText(crp);

  return hasAdministrativeCourtesy || hasVerifiedRegistryIdentity;
};

export const buildActivationPendingFields = ({
  address,
  approaches,
  crp,
  languages,
  name,
  profile,
  services,
  specialties,
  targetAudience,
}: {
  address: { city?: string | null; state?: string | null };
  approaches: FreeProfileCatalogItem[];
  crp: { crp_region: string | null; crp_number: string | null };
  languages: string[];
  name?: string | null;
  profile: NonNullable<UserWithProfile["psychologist_profile"]>;
  services: FreeProfileCatalogItem[];
  specialties: FreeProfileCatalogItem[];
  targetAudience: string[];
}): FreeProfessionalProfileActivationPendingField[] => {
  const pending: FreeProfessionalProfileActivationPendingField[] = [];

  if (!hasText(name)) pending.push({ key: "name", label: "Nome profissional" });
  if (!hasText(profile.video_url)) {
    pending.push({ key: "video", label: "Vídeo de apresentação" });
  }
  if (!hasText(profile.modality)) pending.push({ key: "modality", label: "Modalidade" });
  if (languages.length === 0) pending.push({ key: "languages", label: "Idiomas" });
  if (specialties.length === 0) pending.push({ key: "specialties", label: "Especialidades" });
  if (services.length === 0) pending.push({ key: "services", label: "Serviços" });
  if (approaches.length === 0) pending.push({ key: "approaches", label: "Abordagens" });
  if (targetAudience.length === 0) {
    pending.push({ key: "target_audience", label: "Público atendido" });
  }
  if (!hasText(profile.gender)) pending.push({ key: "gender", label: "Gênero" });
  if (!hasText(profile.cpf)) pending.push({ key: "cpf", label: "CPF" });
  if (!profile.birthdate) {
    pending.push({ key: "birthdate", label: "Data de nascimento" });
  }
  if (!hasText(crp.crp_region) || !hasText(crp.crp_number)) {
    pending.push({ key: "crp", label: "CRP" });
  }
  if (!hasText(address.state) || !hasText(address.city)) {
    pending.push({ key: "address", label: "Estado e cidade" });
  }
  return pending;
};

export const isCatalogItem = (
  value: FreeProfileCatalogItem | null,
): value is FreeProfileCatalogItem => {
  return Boolean(value?.id && value.name && value.slug);
};

export const getUserWithProfile = (userId: string) => {
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
          updatedAt: true,
          professional_first_name: true,
          professional_last_name: true,
          headline: true,
          bio: true,
          modality: true,
          languages: true,
          cpf: true,
          birthdate: true,
          gender: true,
          race_color: true,
          religion: true,
          cover_image_url: true,
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
          registry_checks: {
            where: {
              deleted: false,
              found: true,
            },
            orderBy: {
              checked_at: "desc",
            },
            take: 5,
            select: {
              raw: true,
            },
          },
        },
      },
      psychologist_specialties: {
        where: { deleted: false, specialty: { deleted: false } },
        select: { specialty: { select: specialtyCatalogSelect } },
      },
      psychologist_services: {
        where: { deleted: false, service: { deleted: false } },
        select: { service: { select: catalogSelect } },
      },
      psychologist_approaches: {
        where: { deleted: false, approach: { deleted: false } },
        select: { approach: { select: catalogSelect } },
      },
    },
  });
};

export const getCatalogs = async () => {
  const [
    specialty_categories,
    specialties,
    services,
    approaches,
    languages,
    target_audiences,
    genders,
    race_colors,
    religions,
  ] = await Promise.all([
    prisma.specialty_category.findMany({
      where: { active: true, deleted: false },
      orderBy: catalogOrderBy(),
      select: categorySelect,
    }),
    prisma.specialty.findMany({
      where: {
        active: true,
        deleted: false,
        category: {
          active: true,
          deleted: false,
        },
      },
      orderBy: [{ category: { position: "asc" } }, { position: "asc" }, { name: "asc" }],
      select: specialtyCatalogSelect,
    }),
    prisma.service.findMany({
      where: { active: true, deleted: false },
      orderBy: catalogOrderBy(),
      select: catalogSelect,
    }),
    prisma.approach.findMany({
      where: { active: true, deleted: false },
      orderBy: catalogOrderBy(),
      select: catalogSelect,
    }),
    prisma.profile_catalog_option.findMany({
      where: { active: true, deleted: false, type: "language" },
      orderBy: catalogOrderBy(),
      select: catalogSelect,
    }),
    prisma.profile_catalog_option.findMany({
      where: { active: true, deleted: false, type: "target_audience" },
      orderBy: catalogOrderBy(),
      select: catalogSelect,
    }),
    prisma.profile_catalog_option.findMany({
      where: { active: true, deleted: false, type: "gender" },
      orderBy: catalogOrderBy(),
      select: catalogSelect,
    }),
    prisma.profile_catalog_option.findMany({
      where: { active: true, deleted: false, type: "race_color" },
      orderBy: catalogOrderBy(),
      select: catalogSelect,
    }),
    prisma.profile_catalog_option.findMany({
      where: { active: true, deleted: false, type: "religion" },
      orderBy: catalogOrderBy(),
      select: catalogSelect,
    }),
  ]);

  return {
    genders,
    specialty_categories,
    specialties,
    services,
    approaches,
    languages,
    race_colors,
    religions,
    target_audiences,
  };
};

export const toResponse = async (
  item: UserWithProfile,
): Promise<FreeProfessionalProfileResponse | null> => {
  const profile = item.psychologist_profile;
  if (!profile) return null;
  const displayName = buildProfessionalFullDisplayName({
    fallbackName: item.name,
    firstName: profile.professional_first_name,
    lastName: profile.professional_last_name,
  });
  const whatsappDisplayName = getProfessionalWhatsappDisplayName({
    fallbackName: displayName,
    firstName: profile.professional_first_name,
  });

  const current = profile.subscriptions[0] || null;
  const planSlug = current?.plan?.slug || null;
  const catalogs = await getCatalogs();
  const isFree = planSlug === "gratuito" || !planSlug;
  const showExperienceTag = resolveProfessionalExperienceTagVisibility({
    profile,
    subscription: current,
    hasProfessionalEntitlement: !isFree,
  });
  const canUploadVideo = true;
  const specialtyLimit = isFree ? 3 : 10;
  const serviceLimit = isFree ? 1 : Math.max(catalogs.services.length, 1);
  const approachLimit = isFree ? 1 : Math.max(catalogs.approaches.length, 1);
  const displayCrp = resolveCrpFromRegistryChecks(profile.registry_checks) || profile.crp;
  const crp = parseStoredCrp(displayCrp);
  const identityFieldsLocked = isProfessionalIdentityLocked({
    cfpVerifiedAt: profile.cfp_verified_at,
    cpf: profile.cpf,
    crp: displayCrp,
    crpStatus: profile.crp_status,
    isFree,
    source: current?.source ?? null,
  });
  const academic = {
    title: profile.academic_title,
    institution: profile.academic_institution,
    graduation_year: profile.academic_graduation_year,
  };
  const storedLanguages = normalizeStringArray(profile.languages);
  const languages = storedLanguages.length > 0 ? storedLanguages : ["Português"];
  const targetAudience = normalizeStringArray(profile.target_audience);
  const academicFormations = normalizeAcademicFormations(profile.academic_formations, academic);
  const address = {
    street: profile.professional_address_street,
    number: profile.professional_address_number,
    complement: profile.professional_address_complement,
    district: profile.professional_address_district,
    zip: profile.professional_address_zip,
    city: profile.professional_address_city,
    state: profile.professional_address_state,
  };
  const selected = {
    specialties: item.psychologist_specialties
      .map(({ specialty }) => specialty)
      .filter(isCatalogItem),
    services: item.psychologist_services.map(({ service }) => service).filter(isCatalogItem),
    approaches: item.psychologist_approaches.map(({ approach }) => approach).filter(isCatalogItem),
  };
  const pendingFields = buildActivationPendingFields({
    address,
    approaches: selected.approaches,
    crp,
    languages,
    name: displayName,
    profile,
    services: selected.services,
    specialties: selected.specialties,
    targetAudience,
  });

  return {
    user: {
      id: item.id,
      name: displayName,
      avatar: item.avatar,
    },
    profile: {
      id: profile.id,
      professional_first_name: profile.professional_first_name,
      professional_last_name: profile.professional_last_name,
      headline: profile.headline,
      bio: profile.bio,
      modality: profile.modality,
      languages,
      cpf: profile.cpf,
      birthdate: profile.birthdate,
      gender: profile.gender,
      race_color: profile.race_color,
      religion: profile.religion,
      whatsapp: profile.whatsapp,
      whatsapp_url: buildWhatsappUrl(profile.whatsapp, displayName, whatsappDisplayName),
      cover_image_url: profile.cover_image_url,
      video_url: profile.video_url,
      video_cover_url: profile.video_cover_url,
      target_audience: targetAudience,
      discount_first_session: profile.discount_first_session,
      social_value: profile.social_value,
      accepts_insurance: profile.accepts_insurance,
      show_experience_tag: showExperienceTag,
      academic,
      academic_formations: academicFormations,
      available_days: normalizeStringArray(profile.available_days),
      address,
      published: profile.published,
      crp: displayCrp,
      crp_region: crp.crp_region,
      crp_number: crp.crp_number,
      crp_status: profile.crp_status,
      cfp_verified_at: profile.cfp_verified_at,
      identity_fields_locked: identityFieldsLocked,
    },
    plan: {
      approach_limit: approachLimit,
      can_upload_video: canUploadVideo,
      current_period_end: current?.current_period_end ?? null,
      is_courtesy: current?.source === "admin_grant",
      slug: planSlug,
      is_free: isFree,
      service_limit: serviceLimit,
      source: current?.source ?? null,
      specialty_limit: specialtyLimit,
    },
    selected,
    activation: {
      active: profile.published && pendingFields.length === 0,
      pending_fields: pendingFields,
    },
    upload_limits: {
      presentation_video_mb: UPLOAD_LIMITS.psychologist.videoMultipartTotalMb,
    },
    catalogs,
  };
};
