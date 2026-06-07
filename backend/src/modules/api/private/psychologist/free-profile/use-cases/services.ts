import { z } from "zod";
import { error, msg } from "@/helpers/translate";
import type {
  FreeProfessionalProfileUpdateBody,
  IFreeProfessionalProfileShowDTO,
  IFreeProfessionalProfileUpdateDTO,
} from "../DTOs/IFreeProfileDTO";
import { FreeProfileRepository } from "../repositories/FreeProfileRepository";

const trimToNull = (value?: string | null) => {
  const normalized = value?.trim();
  return normalized || null;
};

const onlyDigits = (value?: string | null) => String(value ?? "").replace(/\D/g, "");

const normalizeCpf = (value?: string | null) => {
  const digits = onlyDigits(value);
  return digits || null;
};

const normalizeWhatsapp = (value?: string | null) => {
  const digits = onlyDigits(value);
  if (!digits) return null;
  return `+${digits.slice(0, 15)}`;
};

const normalizeList = (value?: string[]) => {
  if (!Array.isArray(value)) return [];

  return Array.from(new Set(value.map((item) => item.trim()).filter(Boolean)));
};

const updateSchema = z.object({
  name: z.string().trim().min(2).max(120),
  cpf: z.string().nullable().optional(),
  crp_region: z.string().trim().max(20).nullable().optional(),
  crp_number: z.string().trim().max(40).nullable().optional(),
  whatsapp: z.string().nullable().optional(),
  headline: z.string().trim().min(3).max(160).nullable().optional(),
  bio: z.string().trim().min(20).max(2000).nullable().optional(),
  modality: z.enum(["online", "presencial", "hibrido"]).nullable().optional(),
  languages: z.array(z.string().trim().min(2).max(40)).max(8).optional(),
  specialty_ids: z.array(z.string().min(8).max(80)).max(3).optional(),
  service_ids: z.array(z.string().min(8).max(80)).max(10).optional(),
  approach_ids: z.array(z.string().min(8).max(80)).max(10).optional(),
  published: z.boolean().optional(),
});

const hasRequiredPublishingFields = (body: Required<FreeProfessionalProfileUpdateBody>) => {
  return Boolean(
    body.name &&
      body.headline &&
      body.bio &&
      body.modality &&
      body.languages.length > 0 &&
      body.specialty_ids.length > 0 &&
      body.service_ids.length > 0,
  );
};

const assertCatalogIds = (
  selectedIds: string[],
  validIds: string[],
  key: "specialty" | "service" | "approach",
) => {
  const valid = new Set(validIds);
  const invalid = selectedIds.filter((id) => !valid.has(id));

  if (invalid.length > 0) {
    return error("invalid_catalog_selection", { catalog: key });
  }

  return null;
};

export const show = async (data: IFreeProfessionalProfileShowDTO) => {
  if (data.auth.role !== "psicologo") {
    return {
      status: 403,
      ...error("role_not_authorized", {}),
    };
  }

  const repository = new FreeProfileRepository();
  const profile = await repository.show(data.auth.id!);

  if (!profile) {
    return {
      status: 404,
      ...error("not_found", { model: "psychologist_profile" }),
    };
  }

  return {
    status: 200,
    ...msg("show", {}),
    data: profile,
  };
};

export const update = async (data: IFreeProfessionalProfileUpdateDTO) => {
  if (data.auth.role !== "psicologo") {
    return {
      status: 403,
      ...error("role_not_authorized", {}),
    };
  }

  const parsed = updateSchema.safeParse(data.b || {});

  if (!parsed.success) {
    return {
      status: 400,
      ...error("invalid_structure", {}),
      data: parsed.error.flatten(),
    };
  }

  const repository = new FreeProfileRepository();
  const current = await repository.show(data.auth.id!);

  if (!current) {
    return {
      status: 404,
      ...error("not_found", { model: "psychologist_profile" }),
    };
  }

  if (!current.plan.is_free) {
    return {
      status: 403,
      ...error("free_profile_professional_plan", {}),
    };
  }

  const cpf = normalizeCpf(parsed.data.cpf);
  if (cpf && cpf.length !== 11) {
    return {
      status: 400,
      ...error("invalid_cpf", {}),
    };
  }

  const whatsapp = normalizeWhatsapp(parsed.data.whatsapp);
  const whatsappDigits = onlyDigits(whatsapp);
  if (whatsapp && (whatsappDigits.length < 8 || whatsappDigits.length > 15)) {
    return {
      status: 400,
      ...error("invalid_phone", {}),
    };
  }

  const body: Required<FreeProfessionalProfileUpdateBody> = {
    name: parsed.data.name,
    cpf,
    crp_region: trimToNull(parsed.data.crp_region),
    crp_number: trimToNull(parsed.data.crp_number),
    whatsapp,
    headline: trimToNull(parsed.data.headline),
    bio: trimToNull(parsed.data.bio),
    modality: parsed.data.modality || null,
    languages: normalizeList(parsed.data.languages),
    specialty_ids: normalizeList(parsed.data.specialty_ids),
    service_ids: normalizeList(parsed.data.service_ids),
    approach_ids: normalizeList(parsed.data.approach_ids),
    published: Boolean(parsed.data.published),
  };

  if (body.specialty_ids.length > current.plan.specialty_limit) {
    return {
      status: 400,
      ...error("free_specialty_limit", { limit: current.plan.specialty_limit }),
    };
  }

  const specialtyError = assertCatalogIds(
    body.specialty_ids,
    current.catalogs.specialties.map((item) => item.id),
    "specialty",
  );
  if (specialtyError) return { status: 400, ...specialtyError };

  const serviceError = assertCatalogIds(
    body.service_ids,
    current.catalogs.services.map((item) => item.id),
    "service",
  );
  if (serviceError) return { status: 400, ...serviceError };

  const approachError = assertCatalogIds(
    body.approach_ids,
    current.catalogs.approaches.map((item) => item.id),
    "approach",
  );
  if (approachError) return { status: 400, ...approachError };

  if (body.published && !hasRequiredPublishingFields(body)) {
    return {
      status: 400,
      ...error("free_profile_publish_requirements", {}),
    };
  }

  const updated = await repository.update(data.auth.id!, body);

  return {
    status: 200,
    ...msg("free_profile_updated", {}),
    data: updated,
  };
};
