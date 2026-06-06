import type { CfpResult, CfpSearchBody } from "../DTOs/ICfpDTO";

const INFOSIMPLES_CFP_ENDPOINT = "https://api.infosimples.com/api/v2/consultas/cfp/cadastro";
const REQUEST_TIMEOUT_MS = 20_000;

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

export type InfoSimplesCfpResponse = {
  code: number | null;
  code_message: string | null;
  raw: InfoSimplesPayload;
  results: CfpResult[];
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
  async search(params: InfoSimplesSearchParams): Promise<InfoSimplesCfpResponse> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(INFOSIMPLES_CFP_ENDPOINT, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(params),
        signal: controller.signal,
      });

      const raw = (await response.json()) as InfoSimplesPayload;

      return {
        code: typeof raw.code === "number" ? raw.code : null,
        code_message: typeof raw.code_message === "string" ? raw.code_message : null,
        raw,
        results: normalizeCfpResults(raw),
      };
    } finally {
      clearTimeout(timer);
    }
  }
}
