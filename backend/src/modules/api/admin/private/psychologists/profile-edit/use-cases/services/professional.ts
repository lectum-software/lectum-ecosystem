import type { Prisma } from "@/external/generated/prisma/client";
import { error } from "@/helpers/translate";
import type { AdminPsychologistProfessionalDataInput } from "../../DTOs/IAdminPsychologistProfileEditDTO";
import type {
  AdminPsychologistProfileEditAudit,
  AdminPsychologistProfileEditCatalog,
  AdminPsychologistProfileEditCatalogOption,
  AdminPsychologistProfileEditRecord,
} from "../../repositories/AdminPsychologistProfileEditRepository";

import { ADMIN_SOURCE, normalizeList, PROFESSIONAL_FIELD_LABELS, trimToNull } from "./personal";

export const currentRelationIds = (profile: AdminPsychologistProfileEditRecord) => ({
  approach_ids: normalizeList(profile.user.psychologist_approaches.map((item) => item.approach_id)),
  service_ids: normalizeList(profile.user.psychologist_services.map((item) => item.service_id)),
  specialty_ids: normalizeList(
    profile.user.psychologist_specialties.map((item) => item.specialty_id),
  ),
});

export const currentRelationNames = (profile: AdminPsychologistProfileEditRecord) => ({
  approach_ids: new Map(
    profile.user.psychologist_approaches.map((item) => [item.approach_id, item.approach.name]),
  ),
  service_ids: new Map(
    profile.user.psychologist_services.map((item) => [item.service_id, item.service.name]),
  ),
  specialty_ids: new Map(
    profile.user.psychologist_specialties.map((item) => [item.specialty_id, item.specialty.name]),
  ),
});

export const assertCatalogSelection = (
  selected: string[],
  activeItems: AdminPsychologistProfileEditCatalog[],
  currentIds: string[],
  catalog: string,
) => {
  const valid = new Set([...activeItems.map((item) => item.id), ...currentIds]);
  const invalid = selected.filter((id) => !valid.has(id));

  return invalid.length > 0
    ? { status: 400, ...error("invalid_catalog_selection", { catalog }) }
    : null;
};

export const canonicalizeOptions = ({
  currentValues,
  options,
  selected,
  storeAs,
}: {
  currentValues: string[];
  options: AdminPsychologistProfileEditCatalogOption[];
  selected: string[];
  storeAs: "name" | "slug";
}) => {
  const current = new Set(currentValues);
  const byAnyValue = new Map<string, AdminPsychologistProfileEditCatalogOption>();
  for (const option of options) {
    byAnyValue.set(option.id, option);
    byAnyValue.set(option.name, option);
    byAnyValue.set(option.slug, option);
  }

  const invalid: string[] = [];
  const canonical = selected.map((value) => {
    const option = byAnyValue.get(value);
    if (option) return storeAs === "slug" ? option.slug : option.name;
    if (current.has(value)) return value;
    invalid.push(value);
    return value;
  });

  return { canonical: normalizeList(canonical), invalid };
};

export const labelsFromIds = (
  ids: string[],
  activeItems: AdminPsychologistProfileEditCatalog[],
  currentNames: Map<string, string>,
) => {
  const names = new Map(activeItems.map((item) => [item.id, item.name]));

  return ids.map((id) => names.get(id) ?? currentNames.get(id) ?? "Item indisponível");
};

export const labelsFromOptions = (
  values: string[],
  options: AdminPsychologistProfileEditCatalogOption[],
) => {
  const names = new Map<string, string>();
  for (const option of options) {
    names.set(option.id, option.name);
    names.set(option.name, option.name);
    names.set(option.slug, option.name);
  }

  return values.map((value) => names.get(value) ?? value);
};

export const modalityLabel = (value?: string | null) => {
  const labels: Record<string, string> = {
    hibrido: "Híbrido",
    online: "Online",
    presencial: "Presencial",
  };

  return value ? (labels[value] ?? value) : null;
};

export const addProfessionalDiff = ({
  after,
  before,
  changedFields,
  key,
  next,
  previous,
}: {
  after: Record<string, string | null>;
  before: Record<string, string | null>;
  changedFields: string[];
  key: string;
  next: string[] | string | null;
  previous: string[] | string | null;
}) => {
  const label = PROFESSIONAL_FIELD_LABELS[key] ?? key;
  changedFields.push(label);
  before[label] = Array.isArray(previous) ? previous.join(", ") || null : previous;
  after[label] = Array.isArray(next) ? next.join(", ") || null : next;
};

export const buildProfessionalAudit = ({
  activeApproaches,
  activeLanguages,
  activeServices,
  activeSpecialties,
  activeTargetAudience,
  adminId,
  changedFieldKeys,
  currentNames,
  input,
  next,
  previous,
  profile,
}: {
  activeApproaches: AdminPsychologistProfileEditCatalog[];
  activeLanguages: AdminPsychologistProfileEditCatalogOption[];
  activeServices: AdminPsychologistProfileEditCatalog[];
  activeSpecialties: AdminPsychologistProfileEditCatalog[];
  activeTargetAudience: AdminPsychologistProfileEditCatalogOption[];
  adminId: string;
  changedFieldKeys: string[];
  currentNames: ReturnType<typeof currentRelationNames>;
  input: AdminPsychologistProfessionalDataInput;
  next: {
    approach_ids: string[];
    languages: string[];
    modality: string | null;
    service_ids: string[];
    specialty_ids: string[];
    target_audience: string[];
  };
  previous: {
    approach_ids: string[];
    languages: string[];
    modality: string | null;
    service_ids: string[];
    specialty_ids: string[];
    target_audience: string[];
  };
  profile: AdminPsychologistProfileEditRecord;
}): AdminPsychologistProfileEditAudit | null => {
  if (changedFieldKeys.length === 0) return null;

  const changedFields: string[] = [];
  const safeBefore: Record<string, string | null> = {};
  const safeAfter: Record<string, string | null> = {};

  for (const key of changedFieldKeys) {
    if (key === "specialty_ids") {
      addProfessionalDiff({
        after: safeAfter,
        before: safeBefore,
        changedFields,
        key,
        next: labelsFromIds(next.specialty_ids, activeSpecialties, currentNames.specialty_ids),
        previous: labelsFromIds(
          previous.specialty_ids,
          activeSpecialties,
          currentNames.specialty_ids,
        ),
      });
      continue;
    }

    if (key === "service_ids") {
      addProfessionalDiff({
        after: safeAfter,
        before: safeBefore,
        changedFields,
        key,
        next: labelsFromIds(next.service_ids, activeServices, currentNames.service_ids),
        previous: labelsFromIds(previous.service_ids, activeServices, currentNames.service_ids),
      });
      continue;
    }

    if (key === "approach_ids") {
      addProfessionalDiff({
        after: safeAfter,
        before: safeBefore,
        changedFields,
        key,
        next: labelsFromIds(next.approach_ids, activeApproaches, currentNames.approach_ids),
        previous: labelsFromIds(previous.approach_ids, activeApproaches, currentNames.approach_ids),
      });
      continue;
    }

    if (key === "languages") {
      addProfessionalDiff({
        after: safeAfter,
        before: safeBefore,
        changedFields,
        key,
        next: labelsFromOptions(next.languages, activeLanguages),
        previous: labelsFromOptions(previous.languages, activeLanguages),
      });
      continue;
    }

    if (key === "target_audience") {
      addProfessionalDiff({
        after: safeAfter,
        before: safeBefore,
        changedFields,
        key,
        next: labelsFromOptions(next.target_audience, activeTargetAudience),
        previous: labelsFromOptions(previous.target_audience, activeTargetAudience),
      });
      continue;
    }

    addProfessionalDiff({
      after: safeAfter,
      before: safeBefore,
      changedFields,
      key,
      next: modalityLabel(next.modality),
      previous: modalityLabel(previous.modality),
    });
  }

  return {
    action: "psychologist_professional_data_updated",
    adminId,
    changedFields,
    metadata: {
      changed_field_keys: changedFieldKeys,
      profile_id: profile.id,
      source: ADMIN_SOURCE,
    },
    reason: trimToNull(input.reason),
    safeAfter: safeAfter as Prisma.InputJsonObject,
    safeBefore: safeBefore as Prisma.InputJsonObject,
    targetId: profile.user_id,
  };
};
