import type { CSSProperties } from "react";
import { getSafeApiErrorMessage } from "@/api/errors";
import type {
  FreeProfessionalProfile,
  FreeProfessionalProfilePayload,
  FreeProfileCatalogCategory,
  FreeProfileCatalogItem,
} from "@/api/generator/types/free-profile";
import type { FreeProfileForm } from "../use-form";
import { getLanguages, toWhatsappPhoneE164 } from "../use-form";

export const PROFESSIONAL_PROFILE_MENU_HREF = "/app/perfil";

export const PSYCHOLOGIST_PROFILE_VIDEO_TIP_SELECTOR =
  '[data-psychologist-tip-target="profile-video"]';

export const resolveApiError = (error: unknown) =>
  getSafeApiErrorMessage(error, "Não foi possível salvar o perfil agora.");

export type CatalogTagGroup = {
  title: string;
  items: FreeProfileCatalogItem[];
};

export const catalogCollator = new Intl.Collator("pt-BR", { sensitivity: "base" });

export const compareCatalogItems = (
  left: FreeProfileCatalogItem,
  right: FreeProfileCatalogItem,
) => {
  const leftPosition = left.position ?? Number.POSITIVE_INFINITY;
  const rightPosition = right.position ?? Number.POSITIVE_INFINITY;

  if (leftPosition !== rightPosition) return leftPosition - rightPosition;

  return catalogCollator.compare(left.name, right.name);
};

export const compareCatalogCategories = (
  left: FreeProfileCatalogCategory,
  right: FreeProfileCatalogCategory,
) => {
  const leftPosition = left.position ?? Number.POSITIVE_INFINITY;
  const rightPosition = right.position ?? Number.POSITIVE_INFINITY;

  if (leftPosition !== rightPosition) return leftPosition - rightPosition;

  return catalogCollator.compare(left.name, right.name);
};

export const createOrderedSpecialtyGroups = (profile?: FreeProfessionalProfile) => {
  const groups = new Map<
    string,
    {
      items: FreeProfileCatalogItem[];
      order: number;
      position: number;
      title: string;
    }
  >();
  const categories = [...(profile?.catalogs.specialty_categories ?? [])].sort(
    compareCatalogCategories,
  );

  for (const [order, category] of categories.entries()) {
    if (!category.active) continue;
    groups.set(category.id, {
      items: [],
      order,
      position: category.position ?? Number.POSITIVE_INFINITY,
      title: category.name,
    });
  }

  for (const item of profile?.catalogs.specialties ?? []) {
    const key = item.category?.id || "uncategorized";
    const current = groups.get(key) ?? {
      items: [],
      order: groups.size,
      position: item.category?.position ?? Number.POSITIVE_INFINITY,
      title: item.category?.name || "Outras especialidades",
    };

    current.items.push(item);
    groups.set(key, current);
  }

  return Array.from(groups.values())
    .filter((group) => group.items.length > 0)
    .sort((left, right) => {
      if (left.order !== right.order) return left.order - right.order;
      if (left.position !== right.position) return left.position - right.position;
      return catalogCollator.compare(left.title, right.title);
    })
    .map((group) => ({
      items: group.items.sort(compareCatalogItems),
      title: group.title,
    }));
};

export const toFreeProfessionalProfilePayload = (
  values: FreeProfileForm,
  profile: FreeProfessionalProfile | undefined,
  lockProfessionalIdentity: boolean,
): FreeProfessionalProfilePayload => {
  const lockedIdentityProfile = lockProfessionalIdentity ? profile?.profile : null;
  const professionalFirstName = values.professional_first_name.trim();
  const professionalLastName = values.professional_last_name.trim();

  return {
    name: [professionalFirstName, professionalLastName].filter(Boolean).join(" "),
    professional_first_name: professionalFirstName,
    professional_last_name: professionalLastName,
    cpf: lockedIdentityProfile ? lockedIdentityProfile.cpf : values.cpf || null,
    birthdate: values.birthdate || null,
    gender: values.gender || null,
    race_color: values.race_color || null,
    religion: values.religion || null,
    crp_region: lockedIdentityProfile
      ? lockedIdentityProfile.crp_region
      : values.crp_region || null,
    crp_number: lockedIdentityProfile
      ? lockedIdentityProfile.crp_number
      : values.crp_number || null,
    whatsapp: toWhatsappPhoneE164(values.whatsapp, values.countryCode),
    headline: values.headline || null,
    bio: values.bio || null,
    modality: values.modality || null,
    languages: getLanguages(values.language),
    target_audience: values.target_audience,
    discount_first_session: values.discount_first_session,
    social_value: values.social_value,
    accepts_insurance: values.accepts_insurance,
    show_experience_tag: profile?.plan.is_free ? false : values.show_experience_tag,
    academic: values.academic_formations[0]
      ? {
          title: values.academic_formations[0].title || null,
          institution: values.academic_formations[0].institution || null,
          graduation_year: values.academic_formations[0].graduation_year || null,
        }
      : { title: null, institution: null, graduation_year: null },
    academic_formations: values.academic_formations.map((item) => ({
      title: item.title || null,
      institution: item.institution || null,
      graduation_year: item.graduation_year || null,
    })),
    available_days: values.available_days,
    address: {
      street: values.address_street || null,
      number: values.address_number || null,
      complement: values.address_complement || null,
      district: values.address_district || null,
      zip: values.address_zip || null,
      city: values.address_city || null,
      state: values.address_state || null,
    },
    specialty_ids: values.specialty_ids,
    service_ids: values.service_ids,
    approach_ids: values.approach_ids,
    published: values.published,
  };
};

export const toggleValue = (values: string[], id: string) => {
  return values.includes(id) ? values.filter((item) => item !== id) : [...values, id];
};

export const profileSetupSelectableChip =
  "inline-flex h-auto min-h-9 items-center justify-center rounded-[14px] border border-border/90 bg-surface px-3.5 py-2 text-xs font-semibold leading-4 text-foreground shadow-lectum-soft transition hover:border-primary/45 hover:bg-primary-soft/70 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 dark:border-border dark:bg-surface";

export const profileSetupSelectableChipStyle: CSSProperties = {
  fontSize: "12px",
  lineHeight: "16px",
  fontWeight: 600,
  padding: "8px 14px",
  minHeight: "36px",
  height: "auto",
  borderRadius: "14px",
  borderWidth: "1.25px",
};

export const profileSetupButtonGroup =
  "m-0 flex w-full min-w-0 flex-wrap items-center gap-2 border-0 bg-transparent p-0";
