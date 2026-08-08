type UnknownRecord = Record<string, unknown>;

const TECHNICAL_PATTERNS = [
  /request failed with status code/i,
  /network error/i,
  /internal server error/i,
  /econn(?:refused|reset|aborted)/i,
  /timeout of \d+ms exceeded/i,
  /\b(?:next_public|process\.env|database_url|jwt_secret|access_token)\b/i,
  /\b(?:typeerror|referenceerror|syntaxerror)\b/i,
  /\b(?:prisma|postgres(?:ql)?|sqlstate|redis)\b/i,
  /\bP[12]\d{3}\b/,
  /\b(?:eai_again|enotfound|etimedout|socket hang up)\b/i,
  /\bat\s+[\w$.<>]+\s*\(/i,
  /https?:\/\//i,
  /(?:\/Users\/|\/app\/|node_modules|\/(?:api|src|dist)\/)/i,
  /\.(?:c|m)?tsx?:\d+(?::\d+)?/i,
  /<!doctype|<(?:html|body|pre|script)\b/i,
  /[A-Z][A-Z0-9]+(?:_[A-Z0-9]+){2,}/,
];

const asRecord = (value: unknown): UnknownRecord | null =>
  typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as UnknownRecord)
    : null;

const statusMessage = (status: number | undefined, fallback: string) => {
  if (status === 401) return "Sua sessão expirou. Entre novamente.";
  if (status === 403) return "Você não tem permissão para realizar esta ação.";
  if (status === 404) return "O registro solicitado não foi encontrado.";
  if (status === 429) return "Muitas tentativas. Aguarde e tente novamente.";
  if (status && status >= 500) return "Serviço temporariamente indisponível. Tente novamente.";

  return fallback;
};

const readStatus = (error: unknown) => {
  const errorRecord = asRecord(error);
  const response = asRecord(errorRecord?.response);
  const payload = asRecord(response?.data) ?? asRecord(errorRecord?.data) ?? errorRecord;
  const status = Number(response?.status ?? payload?.status);

  return Number.isInteger(status) ? status : undefined;
};

export const isRetryableAdminApiError = (error: unknown) => {
  const status = readStatus(error);

  return status === undefined || status === 408 || status === 429 || status >= 500;
};

export const getSafeAdminApiError = (
  error: unknown,
  fallback = "Não foi possível concluir a operação.",
) => {
  const errorRecord = asRecord(error);
  const response = asRecord(errorRecord?.response);
  const payload = asRecord(response?.data) ?? asRecord(errorRecord?.data) ?? errorRecord;
  const candidates = [payload?.error, payload?.message, errorRecord?.message];

  for (const candidate of candidates) {
    if (typeof candidate !== "string") continue;

    const normalized = candidate.replace(/\s+/g, " ").trim();
    if (
      normalized &&
      normalized.length <= 320 &&
      !TECHNICAL_PATTERNS.some((pattern) => pattern.test(normalized))
    ) {
      return normalized;
    }
  }

  return statusMessage(readStatus(error), fallback);
};
