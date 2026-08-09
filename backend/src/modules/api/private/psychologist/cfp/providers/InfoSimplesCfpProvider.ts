import type { CfpResult, CfpSearchBody } from "../DTOs/ICfpDTO";

const INFOSIMPLES_CFP_ENDPOINT = "https://api.infosimples.com/api/v2/consultas/cfp/cadastro";
const DEFAULT_REQUEST_TIMEOUT_MS = 90_000;
const MIN_REQUEST_TIMEOUT_MS = 30_000;
const MAX_REQUEST_TIMEOUT_MS = 180_000;

type InfoSimplesPayload = {
  code?: number;
  code_message?: string;
  data?: unknown;
  errors?: unknown;
  header?: unknown;
  resultados?: unknown;
};

type InfoSimplesSearchParams = CfpSearchBody & {
  token: string;
};

type InfoSimplesSearchOptions = {
  traceId?: string;
};

export type InfoSimplesCfpResponse = {
  code: number | null;
  code_message: string | null;
  content_type: string | null;
  elapsed_ms: number;
  http_status: number;
  raw: InfoSimplesPayload;
  results: CfpResult[];
};

export type InfoSimplesCfpProviderErrorReason = "invalid_json" | "network" | "timeout";

type InfoSimplesCfpProviderErrorContext = {
  contentType?: string | null;
  elapsedMs?: number;
  httpStatus?: number;
  timeoutMs?: number;
};

export class InfoSimplesCfpProviderError extends Error {
  readonly context: InfoSimplesCfpProviderErrorContext;
  readonly reason: InfoSimplesCfpProviderErrorReason;

  constructor(
    reason: InfoSimplesCfpProviderErrorReason,
    message: string,
    context: InfoSimplesCfpProviderErrorContext = {},
  ) {
    super(message);
    this.name = "InfoSimplesCfpProviderError";
    this.reason = reason;
    this.context = context;
  }
}

const resolveRequestTimeoutMs = () => {
  const configured = Number(process.env.DOCUMENT_REQUEST_TIMEOUT_MS);

  if (!Number.isFinite(configured) || configured <= 0) return DEFAULT_REQUEST_TIMEOUT_MS;

  return Math.min(Math.max(Math.trunc(configured), MIN_REQUEST_TIMEOUT_MS), MAX_REQUEST_TIMEOUT_MS);
};

const isCfpLogEnabled = () => process.env.CFP_PROVIDER_LOGS !== "false";

const logCfpProvider = (event: string, data: Record<string, unknown>) => {
  if (!isCfpLogEnabled()) return;

  console.info(`[${event}]`, data);
};

const summarizeRequest = (params: InfoSimplesSearchParams) => {
  return {
    hasCpf: Boolean(params.cpf),
    hasNome: Boolean(params.nome),
    hasRegistro: Boolean(params.registro),
    hasUf: Boolean(params.uf),
    cpfDigits: params.cpf?.length ?? 0,
  };
};

const toText = (value: unknown): string | null => {
  if (typeof value === "string") {
    const normalized = value.trim();
    return normalized || null;
  }

  if (typeof value === "number") return String(value);

  return null;
};

const normalizeSituation = (value: string | null) => {
  return (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
};

const isActiveSituation = (value: string | null) => {
  const normalized = normalizeSituation(value);

  if (!normalized) return false;
  if (/\binativ[ao]\b/.test(normalized)) return false;
  if (/\bcancelad[ao]\b/.test(normalized)) return false;
  if (/\bbaixad[ao]\b/.test(normalized)) return false;
  if (/\bsuspens[ao]\b/.test(normalized)) return false;

  return /\b(ativ[ao]|regular|regularizad[ao]|inscrit[ao])\b/.test(normalized);
};

const normalizeKeyPart = (value: string | null) => {
  return (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
};

const createResultKey = (result: Omit<CfpResult, "key" | "active">, index: number) => {
  const parts = [
    normalizeKeyPart(result.registro),
    normalizeKeyPart(result.nome_regional),
    normalizeKeyPart(result.data_inscricao),
    normalizeKeyPart(result.nome),
  ].filter(Boolean);

  return parts.length > 0 ? `${parts.join("_")}_${index}` : `resultado_${index}`;
};

const asRecord = (value: unknown): Record<string, unknown> | null => {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
};

const asArray = (value: unknown): unknown[] => {
  if (Array.isArray(value)) return value;
  return [];
};

const extractRawResults = (payload: InfoSimplesPayload) => {
  const direct = asArray(payload.resultados);
  if (direct.length > 0) return direct;

  const data = asArray(payload.data);
  return data.flatMap((item) => {
    const record = asRecord(item);
    return record ? asArray(record.resultados) : [];
  });
};

export const normalizeCfpResults = (payload: InfoSimplesPayload): CfpResult[] => {
  return extractRawResults(payload)
    .map((item, index) => {
      const record = asRecord(item);
      if (!record) return null;

      const partial = {
        nome: toText(record.nome),
        nome_regional: toText(record.nome_regional),
        registro: toText(record.registro),
        situacao: toText(record.situacao),
        data_inscricao: toText(record.data_inscricao),
      };

      return {
        key: createResultKey(partial, index),
        ...partial,
        active: isActiveSituation(partial.situacao),
      };
    })
    .filter((item): item is CfpResult => Boolean(item));
};

export class InfoSimplesCfpProvider {
  async search(
    params: InfoSimplesSearchParams,
    options: InfoSimplesSearchOptions = {},
  ): Promise<InfoSimplesCfpResponse> {
    const controller = new AbortController();
    const timeoutMs = resolveRequestTimeoutMs();
    const startedAt = Date.now();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const traceId = options.traceId || "no-trace";

    try {
      logCfpProvider("CFP_PROVIDER_REQUEST_START", {
        request: summarizeRequest(params),
        timeoutMs,
        traceId,
      });

      const response = await fetch(INFOSIMPLES_CFP_ENDPOINT, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(params),
        signal: controller.signal,
      });

      const contentType = response.headers.get("content-type");
      const responseText = await response.text();
      let raw: InfoSimplesPayload;

      try {
        raw = JSON.parse(responseText) as InfoSimplesPayload;
      } catch {
        logCfpProvider("CFP_PROVIDER_INVALID_JSON", {
          elapsedMs: Date.now() - startedAt,
          httpStatus: response.status,
          traceId,
        });

        throw new InfoSimplesCfpProviderError(
          "invalid_json",
          "InfoSimples CFP returned a non-JSON response.",
          {
            contentType,
            elapsedMs: Date.now() - startedAt,
            httpStatus: response.status,
          },
        );
      }

      const results = normalizeCfpResults(raw);
      const elapsedMs = Date.now() - startedAt;

      logCfpProvider("CFP_PROVIDER_RESPONSE", {
        elapsedMs,
        httpStatus: response.status,
        resultsCount: results.length,
        traceId,
      });

      return {
        code: typeof raw.code === "number" ? raw.code : null,
        code_message: typeof raw.code_message === "string" ? raw.code_message : null,
        content_type: contentType,
        elapsed_ms: elapsedMs,
        http_status: response.status,
        raw,
        results,
      };
    } catch (err) {
      if (err instanceof InfoSimplesCfpProviderError) throw err;

      if (err instanceof Error && err.name === "AbortError") {
        logCfpProvider("CFP_PROVIDER_TIMEOUT", {
          elapsedMs: Date.now() - startedAt,
          timeoutMs,
          traceId,
        });

        throw new InfoSimplesCfpProviderError("timeout", "InfoSimples CFP request timed out.", {
          elapsedMs: Date.now() - startedAt,
          timeoutMs,
        });
      }

      logCfpProvider("CFP_PROVIDER_NETWORK_ERROR", {
        elapsedMs: Date.now() - startedAt,
        traceId,
      });

      throw new InfoSimplesCfpProviderError("network", "InfoSimples CFP request failed.", {
        elapsedMs: Date.now() - startedAt,
      });
    } finally {
      clearTimeout(timer);
    }
  }
}
