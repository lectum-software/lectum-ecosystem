import { randomUUID } from "node:crypto";
import { error, msg } from "@/helpers/translate";
import type {
  CfpSearchAttempts,
  ICfpConfirmDTO,
  ICfpSearchDTO,
  StoredRegistryCheckRaw,
} from "../DTOs/ICfpDTO";
import { toAttempts } from "../domain/search-attempts";
import { extractStoredResults } from "../domain/stored-results";
import {
  InfoSimplesCfpProvider,
  InfoSimplesCfpProviderError,
} from "../providers/InfoSimplesCfpProvider";
import { CfpRepository } from "../repositories/CfpRepository";

const PROVIDER_UNAVAILABLE_CODES = new Set([609, 615]);

const normalizeDigits = (value?: string | null) => (value || "").replace(/\D/g, "");
const normalizeText = (value?: string | null) => {
  const normalized = value?.trim();
  return normalized || undefined;
};
const normalizeUf = (value?: string | null) => normalizeText(value)?.toUpperCase();

const isProviderConfigError = (code: number | null) => code === 601 || code === 602 || code === 603;
const isProviderValidationError = (code: number | null) => code === 606;
const isProviderNotFound = (code: number | null) => code === 612;
const isProviderUnavailable = (code: number | null) =>
  code !== null && PROVIDER_UNAVAILABLE_CODES.has(code);
const isProviderRateLimit = (code: number | null, message: string | null) => {
  const text = (message || "").toLowerCase();
  if (isProviderUnavailable(code)) return false;

  return code === 610 || text.includes("limite") || text.includes("saldo");
};

const isCfpLogEnabled = () => process.env.CFP_PROVIDER_LOGS !== "false";

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
    resultsCount: response.results.length,
  };
};

const logProviderUnavailable = (err: unknown, traceId: string) => {
  if (err instanceof InfoSimplesCfpProviderError) {
    logCfpSearchError("CFP_PROVIDER_UNAVAILABLE", {
      elapsedMs: err.context.elapsedMs,
      httpStatus: err.context.httpStatus,
      reason: err.reason,
      traceId,
    });
    return;
  }

  logCfpSearchError("CFP_PROVIDER_UNAVAILABLE", {
    reason: "unknown",
    traceId,
  });
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
  // Os resultados normalizados são suficientes para confirmação. O payload cru do
  // provedor pode conter detalhes técnicos e não deve ser persistido em novas consultas.
  response: null,
  normalized_results: props.response?.results ?? [],
  attempt_finished_at: new Date().toISOString(),
  attempt_status: props.status,
  ...(props.providerError ? { provider_error: props.providerError } : {}),
});

const createProviderErrorRaw = (err: unknown): Pick<StoredRegistryCheckRaw, "provider_error"> => {
  if (err instanceof InfoSimplesCfpProviderError) {
    return {
      provider_error: {
        classification: "provider_unavailable",
        elapsed_ms: err.context.elapsedMs,
        http_status: err.context.httpStatus,
        reason: err.reason,
      },
    };
  }

  return {
    provider_error: {
      classification: "provider_unavailable",
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

  const reservation = await repository.reserveSearch({ psychologistId: profile.id!, request });
  if (!reservation.ok && reservation.reason === "profile_not_found") {
    return { status: 404, ...error("not_found", { model: "psychologist_profile" }) };
  }
  if (!reservation.ok) {
    const attempts = toAttempts(reservation.used);

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

  const attempts = reservation.used === null ? null : toAttempts(reservation.used);
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

    await repository.completeSearch({
      checkId: reservation.check.id!,
      found: false,
      psychologistId: profile.id!,
      raw: createStoredRaw({
        ...createProviderErrorRaw(err),
        request,
        response: null,
        status: "provider_unavailable",
      }),
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

    await repository.completeSearch({
      checkId: reservation.check.id!,
      found: false,
      psychologistId: profile.id!,
      raw: createStoredRaw({
        request,
        response,
        status: "provider_config_error",
      }),
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

    await repository.completeSearch({
      checkId: reservation.check.id!,
      found: false,
      psychologistId: profile.id!,
      raw: createStoredRaw({
        request,
        response,
        status: "provider_validation_error",
      }),
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

    await repository.completeSearch({
      checkId: reservation.check.id!,
      found: false,
      psychologistId: profile.id!,
      raw: createStoredRaw({
        request,
        response,
        status: "provider_unavailable",
      }),
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

    await repository.completeSearch({
      checkId: reservation.check.id!,
      found: false,
      psychologistId: profile.id!,
      raw: createStoredRaw({
        request,
        response,
        status: "provider_rate_limited",
      }),
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

    await repository.completeSearch({
      checkId: reservation.check.id!,
      found: false,
      psychologistId: profile.id!,
      raw: createStoredRaw({
        request,
        response,
        status: "provider_error",
      }),
    });

    return {
      status: 502,
      ...error("cfp_provider_error", {
        ...(attempts ? { attempts } : {}),
      }),
    };
  }

  const check = await repository.completeSearch({
    checkId: reservation.check.id!,
    psychologistId: profile.id!,
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

  const outcome = await repository.confirmResult({
    check,
    result: selected,
  });

  if (!outcome.ok) {
    const code =
      outcome.reason === "profile_locked"
        ? "cfp_confirmation_locked"
        : outcome.reason === "result_not_active"
          ? "cfp_result_not_active"
          : "cfp_result_not_found";
    return {
      status:
        outcome.reason === "profile_locked"
          ? 409
          : outcome.reason === "result_not_active"
            ? 400
            : 404,
      ...error(code, {}),
    };
  }

  return { status: 200, ...msg("cfp_confirm_success", {}), data: outcome.data };
};
