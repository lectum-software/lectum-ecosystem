import { randomUUID } from "node:crypto";
import { error, msg } from "@/helpers/translate";
import type { professional_registry_check } from "@/interfaces/objects";
import type {
  CfpResult,
  CfpSearchAttempts,
  ICfpConfirmDTO,
  ICfpSearchDTO,
  StoredRegistryCheckRaw,
} from "../DTOs/ICfpDTO";
import {
  InfoSimplesCfpProvider,
  InfoSimplesCfpProviderError,
  normalizeCfpResults,
} from "../providers/InfoSimplesCfpProvider";
import { CfpRepository } from "../repositories/CfpRepository";

const CPF_SEARCH_ATTEMPT_LIMIT = 3;

const normalizeDigits = (value?: string | null) => (value || "").replace(/\D/g, "");
const normalizeText = (value?: string | null) => {
  const normalized = value?.trim();
  return normalized || undefined;
};
const normalizeUf = (value?: string | null) => normalizeText(value)?.toUpperCase();

const isProviderConfigError = (code: number | null) => code === 601 || code === 602 || code === 603;
const isProviderValidationError = (code: number | null) => code === 606;
const isProviderNotFound = (code: number | null) => code === 612;
const isProviderUnavailable = (code: number | null) => code === 609;
const isProviderRateLimit = (code: number | null, message: string | null) => {
  const text = (message || "").toLowerCase();
  if (isProviderUnavailable(code)) return false;

  return code === 610 || text.includes("limite") || text.includes("saldo");
};

const isCfpLogEnabled = () => process.env.CFP_PROVIDER_LOGS !== "false";

const toAttempts = (used: number): CfpSearchAttempts => ({
  limit: CPF_SEARCH_ATTEMPT_LIMIT,
  remaining: Math.max(CPF_SEARCH_ATTEMPT_LIMIT - used, 0),
  used,
});

const withAttempts = <T extends Record<string, unknown>>(
  data: T,
  attempts: CfpSearchAttempts | null,
) => (attempts ? { ...data, attempts } : data);

const logCfpSearch = (event: string, data: Record<string, unknown>) => {
  if (!isCfpLogEnabled()) return;

  console.info(`[${event}]`, data);
};

const logCfpSearchError = (event: string, data: Record<string, unknown>) => {
  if (!isCfpLogEnabled()) return;

  console.error(`[${event}]`, data);
};

const summarizeSearchRequest = (request: {
  cpf?: string;
  nome?: string;
  registro?: string;
  uf?: string;
}) => {
  return {
    cpfDigits: request.cpf?.length ?? 0,
    hasCpf: Boolean(request.cpf),
    hasNome: Boolean(request.nome),
    hasRegistro: Boolean(request.registro),
    hasUf: Boolean(request.uf),
  };
};

const summarizeProviderResponse = (
  response: Awaited<ReturnType<InfoSimplesCfpProvider["search"]>>,
) => {
  return {
    elapsedMs: response.elapsed_ms,
    httpStatus: response.http_status,
    providerCode: response.code,
    providerMessage: response.code_message,
    resultsCount: response.results.length,
  };
};

const logProviderUnavailable = (err: unknown, traceId: string) => {
  if (err instanceof InfoSimplesCfpProviderError) {
    logCfpSearchError("CFP_PROVIDER_UNAVAILABLE", {
      context: err.context,
      reason: err.reason,
      traceId,
    });
    return;
  }

  logCfpSearchError("CFP_PROVIDER_UNAVAILABLE", {
    name: err instanceof Error ? err.name : typeof err,
    traceId,
  });
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

const createStoredRaw = (props: {
  request: {
    cpf?: string;
    nome?: string;
    registro?: string;
    uf?: string;
  };
  response: Awaited<ReturnType<InfoSimplesCfpProvider["search"]>> | null;
  status: NonNullable<StoredRegistryCheckRaw["attempt_status"]>;
  providerError?: StoredRegistryCheckRaw["provider_error"];
}): StoredRegistryCheckRaw => ({
  provider: "infosimples",
  request: props.request,
  response: props.response?.raw ?? null,
  normalized_results: props.response?.results ?? [],
  attempt_finished_at: new Date().toISOString(),
  attempt_status: props.status,
  ...(props.providerError ? { provider_error: props.providerError } : {}),
});

const createProviderErrorRaw = (err: unknown): Pick<StoredRegistryCheckRaw, "provider_error"> => {
  if (err instanceof InfoSimplesCfpProviderError) {
    return {
      provider_error: {
        context: { ...err.context },
        name: err.name,
        reason: err.reason,
      },
    };
  }

  return {
    provider_error: {
      name: err instanceof Error ? err.name : typeof err,
    },
  };
};

export const search = async (data: ICfpSearchDTO) => {
  const traceId = randomUUID();

  if (data.auth.role !== "psicologo") {
    logCfpSearchError("CFP_SEARCH_FORBIDDEN", {
      authRole: data.auth.role || null,
      traceId,
    });

    return {
      status: 403,
      ...error("role_not_authorized", {}),
    };
  }

  const request = {
    cpf: normalizeDigits(data.b.cpf) || undefined,
    nome: normalizeText(data.b.nome),
    registro: normalizeText(data.b.registro),
    uf: normalizeUf(data.b.uf),
  };

  if (request.cpf && request.cpf.length !== 11) {
    logCfpSearchError("CFP_SEARCH_INVALID_CPF", {
      request: summarizeSearchRequest(request),
      traceId,
    });

    return {
      status: 400,
      ...error("invalid_cpf", {}),
    };
  }

  if (!request.cpf && !request.nome && !request.registro) {
    logCfpSearchError("CFP_SEARCH_EMPTY_QUERY", {
      request: summarizeSearchRequest(request),
      traceId,
    });

    return {
      status: 400,
      ...error("cfp_query_required", {}),
    };
  }

  logCfpSearch("CFP_SEARCH_START", {
    request: summarizeSearchRequest(request),
    traceId,
  });

  const repository = new CfpRepository();
  const profile = await repository.getProfile(data.auth.id!);

  if (!profile) {
    logCfpSearchError("CFP_SEARCH_PROFILE_NOT_FOUND", {
      traceId,
    });

    return {
      status: 404,
      ...error("not_found", {
        model: "psychologist_profile",
      }),
    };
  }

  const usedAttempts = request.cpf ? await repository.countCpfSearchAttempts(profile.id!) : 0;

  if (request.cpf) {
    await repository.saveSubmittedCpf({
      cpf: request.cpf,
      psychologistId: profile.id!,
    });
  }

  const token = process.env.DOCUMENT_TOKEN?.trim();
  if (!token) {
    logCfpSearchError("CFP_SEARCH_PROVIDER_TOKEN_MISSING", {
      traceId,
    });

    return {
      status: 503,
      ...error("cfp_provider_config_error", {}),
    };
  }

  if (request.cpf && usedAttempts >= CPF_SEARCH_ATTEMPT_LIMIT) {
    const attempts = toAttempts(usedAttempts);

    logCfpSearchError("CFP_SEARCH_ATTEMPT_LIMIT_REACHED", {
      attempts,
      request: summarizeSearchRequest(request),
      traceId,
    });

    return {
      status: 429,
      ...error("cfp_search_attempts_exceeded", { attempts }),
    };
  }

  const attempts = request.cpf ? toAttempts(usedAttempts + 1) : null;
  const provider = new InfoSimplesCfpProvider();
  let response: Awaited<ReturnType<InfoSimplesCfpProvider["search"]>>;

  try {
    response = await provider.search(
      {
        token,
        ...request,
      },
      { traceId },
    );
  } catch (err) {
    logProviderUnavailable(err, traceId);

    await repository.createCheck({
      found: false,
      psychologistId: profile.id!,
      raw: createStoredRaw({
        ...createProviderErrorRaw(err),
        request,
        response: null,
        status: "provider_unavailable",
      }),
      request,
    });

    return {
      status: 502,
      ...error("cfp_provider_unavailable", withAttempts({}, attempts)),
    };
  }

  if (isProviderConfigError(response.code)) {
    logCfpSearchError("CFP_SEARCH_PROVIDER_CONFIG_ERROR", {
      response: summarizeProviderResponse(response),
      traceId,
    });

    await repository.createCheck({
      found: false,
      psychologistId: profile.id!,
      raw: createStoredRaw({
        request,
        response,
        status: "provider_config_error",
      }),
      request,
    });

    return {
      status: 503,
      ...error("cfp_provider_config_error", withAttempts({}, attempts)),
    };
  }

  if (isProviderValidationError(response.code)) {
    logCfpSearchError("CFP_SEARCH_PROVIDER_VALIDATION_ERROR", {
      response: summarizeProviderResponse(response),
      traceId,
    });

    await repository.createCheck({
      found: false,
      psychologistId: profile.id!,
      raw: createStoredRaw({
        request,
        response,
        status: "provider_validation_error",
      }),
      request,
    });

    return {
      status: 400,
      ...error("cfp_provider_validation_error", withAttempts({}, attempts)),
    };
  }

  if (isProviderUnavailable(response.code)) {
    logCfpSearchError("CFP_SEARCH_PROVIDER_UNAVAILABLE", {
      response: summarizeProviderResponse(response),
      traceId,
    });

    await repository.createCheck({
      found: false,
      psychologistId: profile.id!,
      raw: createStoredRaw({
        request,
        response,
        status: "provider_unavailable",
      }),
      request,
    });

    return {
      status: 502,
      ...error("cfp_provider_unavailable", withAttempts({}, attempts)),
    };
  }

  if (isProviderRateLimit(response.code, response.code_message)) {
    logCfpSearchError("CFP_SEARCH_PROVIDER_RATE_LIMITED", {
      response: summarizeProviderResponse(response),
      traceId,
    });

    await repository.createCheck({
      found: false,
      psychologistId: profile.id!,
      raw: createStoredRaw({
        request,
        response,
        status: "provider_rate_limited",
      }),
      request,
    });

    return {
      status: 429,
      ...error("cfp_provider_rate_limited", withAttempts({}, attempts)),
    };
  }

  const shouldPersistResult = response.code === 200 || isProviderNotFound(response.code);

  if (!shouldPersistResult) {
    logCfpSearchError("CFP_SEARCH_PROVIDER_UNEXPECTED_CODE", {
      response: summarizeProviderResponse(response),
      traceId,
    });

    await repository.createCheck({
      found: false,
      psychologistId: profile.id!,
      raw: createStoredRaw({
        request,
        response,
        status: "provider_error",
      }),
      request,
    });

    return {
      status: 502,
      ...error("cfp_provider_error", {
        ...(attempts ? { attempts } : {}),
      }),
    };
  }

  const check = await repository.createCheck({
    psychologistId: profile.id!,
    request,
    found: response.results.length > 0,
    raw: {
      ...createStoredRaw({
        request,
        response,
        status: response.results.length > 0 ? "success" : "empty",
      }),
    },
  });

  logCfpSearch("CFP_SEARCH_PERSISTED", {
    checkId: check.id,
    found: response.results.length > 0,
    response: summarizeProviderResponse(response),
    traceId,
  });

  return {
    status: 200,
    ...msg(response.results.length > 0 ? "cfp_search_success" : "cfp_search_empty", {}),
    data: {
      ...(attempts ? { attempts } : {}),
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
