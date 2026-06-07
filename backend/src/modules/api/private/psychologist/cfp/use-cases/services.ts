import { error, msg } from "@/helpers/translate";
import type { professional_registry_check } from "@/interfaces/objects";
import type {
  CfpResult,
  ICfpConfirmDTO,
  ICfpSearchDTO,
  StoredRegistryCheckRaw,
} from "../DTOs/ICfpDTO";
import { InfoSimplesCfpProvider, normalizeCfpResults } from "../providers/InfoSimplesCfpProvider";
import { CfpRepository } from "../repositories/CfpRepository";

const normalizeDigits = (value?: string | null) => (value || "").replace(/\D/g, "");
const normalizeText = (value?: string | null) => {
  const normalized = value?.trim();
  return normalized || undefined;
};
const normalizeUf = (value?: string | null) => normalizeText(value)?.toUpperCase();

const isProviderConfigError = (code: number | null) => code === 601 || code === 602;
const isProviderValidationError = (code: number | null) => code === 606;
const isProviderNotFound = (code: number | null) => code === 612;
const isProviderRateLimit = (code: number | null, message: string | null) => {
  const text = (message || "").toLowerCase();
  return code === 609 || code === 610 || text.includes("limite") || text.includes("saldo");
};

const asStoredRaw = (value: unknown): StoredRegistryCheckRaw | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;

  const raw = value as Partial<StoredRegistryCheckRaw>;
  if (raw.provider !== "infosimples") return null;

  return raw as StoredRegistryCheckRaw;
};

const extractStoredResults = (check: professional_registry_check): CfpResult[] => {
  const raw = asStoredRaw(check.raw);
  if (Array.isArray(raw?.normalized_results)) return raw.normalized_results;

  if (raw?.response && typeof raw.response === "object") {
    return normalizeCfpResults(raw.response as Parameters<typeof normalizeCfpResults>[0]);
  }

  return [];
};

export const search = async (data: ICfpSearchDTO) => {
  if (data.auth.role !== "psicologo") {
    return {
      status: 403,
      ...error("role_not_authorized", {}),
    };
  }

  const token = process.env.DOCUMENT_TOKEN;
  if (!token) {
    return {
      status: 503,
      ...error("cfp_provider_config_error", {}),
    };
  }

  const request = {
    cpf: normalizeDigits(data.b.cpf) || undefined,
    nome: normalizeText(data.b.nome),
    registro: normalizeText(data.b.registro),
    uf: normalizeUf(data.b.uf),
  };

  if (request.cpf && request.cpf.length !== 11) {
    return {
      status: 400,
      ...error("invalid_cpf", {}),
    };
  }

  if (!request.cpf && !request.nome && !request.registro) {
    return {
      status: 400,
      ...error("cfp_query_required", {}),
    };
  }

  const repository = new CfpRepository();
  const profile = await repository.getProfile(data.auth.id!);

  if (!profile) {
    return {
      status: 404,
      ...error("not_found", {
        model: "psychologist_profile",
      }),
    };
  }

  const provider = new InfoSimplesCfpProvider();
  let response: Awaited<ReturnType<InfoSimplesCfpProvider["search"]>>;

  try {
    response = await provider.search({
      token,
      ...request,
    });
  } catch (_err) {
    return {
      status: 502,
      ...error("cfp_provider_unavailable", {}),
    };
  }

  if (isProviderConfigError(response.code)) {
    return {
      status: 503,
      ...error("cfp_provider_config_error", {}),
    };
  }

  if (isProviderValidationError(response.code)) {
    return {
      status: 400,
      ...error("cfp_provider_validation_error", {}),
    };
  }

  if (isProviderRateLimit(response.code, response.code_message)) {
    return {
      status: 429,
      ...error("cfp_provider_rate_limited", {}),
    };
  }

  const shouldPersistResult = response.code === 200 || isProviderNotFound(response.code);

  if (!shouldPersistResult) {
    return {
      status: 502,
      ...error("cfp_provider_error", {
        provider_code: response.code || "unknown",
      }),
    };
  }

  const check = await repository.createCheck({
    psychologistId: profile.id!,
    request,
    found: response.results.length > 0,
    raw: {
      provider: "infosimples",
      request,
      response: response.raw,
      normalized_results: response.results,
    },
  });

  return {
    status: 200,
    ...msg(response.results.length > 0 ? "cfp_search_success" : "cfp_search_empty", {}),
    data: {
      check_id: check.id,
      found: response.results.length > 0,
      results: response.results,
    },
  };
};

export const confirm = async (data: ICfpConfirmDTO) => {
  if (data.auth.role !== "psicologo") {
    return {
      status: 403,
      ...error("role_not_authorized", {}),
    };
  }

  const repository = new CfpRepository();
  const profile = await repository.getProfile(data.auth.id!);

  if (!profile) {
    return {
      status: 404,
      ...error("not_found", {
        model: "psychologist_profile",
      }),
    };
  }

  const check = await repository.getCheckById(data.b.check_id, profile.id!);

  if (!check) {
    return {
      status: 404,
      ...error("not_found", {
        model: "professional_registry_check",
      }),
    };
  }

  const results = extractStoredResults(check);
  const selected = results.find((result) => result.key === data.b.result_key);

  if (!selected) {
    return {
      status: 404,
      ...error("cfp_result_not_found", {}),
    };
  }

  if (!selected.active) {
    return {
      status: 400,
      ...error("cfp_result_not_active", {}),
    };
  }

  const updatedProfile = await repository.confirmResult({
    check,
    result: selected,
  });

  return {
    status: 200,
    ...msg("cfp_confirm_success", {}),
    data: {
      result: selected,
      profile: updatedProfile,
    },
  };
};
