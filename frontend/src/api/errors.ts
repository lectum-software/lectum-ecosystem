type UnknownRecord = Record<string, unknown>;

const DEFAULT_MESSAGE = "Não foi possível concluir a operação. Tente novamente.";
const TECHNICAL_MESSAGE_PATTERNS = [
  /request failed with status code/i,
  /network error/i,
  /internal server error/i,
  /econn(?:refused|reset|aborted)/i,
  /timeout of \d+ms exceeded/i,
  /\b(?:next_public|process\.env|database_url|jwt_secret|access_token)\b/i,
  /\b(?:payload|webhook|endpoint|schema|stack|trace|policyagent|mercadopago|preapproval|gateway)\b/i,
  /\b(?:cannot|failed|failure|unexpected|missing|required|not found|does not exist|unauthorized|forbidden)\b/i,
  /\b(?:template|resource) with id\b/i,
  /\b[0-9a-f]{24,}\b/i,
  /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/i,
  /\b(?:typeerror|referenceerror|syntaxerror)\b/i,
  /\b(?:prisma|postgres(?:ql)?|sqlstate|redis)\b/i,
  /\bP[12]\d{3}\b/,
  /\b(?:eai_again|enotfound|etimedout|socket hang up)\b/i,
  /\bat\s+[\w$.<>]+\s*\(/i,
  /https?:\/\//i,
  /(?:\/Users\/|\/app\/|node_modules|\/(?:api|src|dist|users?)\/)/i,
  /\.(?:c|m)?tsx?:\d+(?::\d+)?/i,
  /<!doctype|<(?:html|body|pre|script)\b/i,
  /[A-Z][A-Z0-9]+(?:_[A-Z0-9]+){2,}/,
];

const asRecord = (value: unknown): UnknownRecord | null =>
  typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as UnknownRecord)
    : null;

const readPayload = (error: unknown) => {
  const record = asRecord(error);
  const response = asRecord(record?.response);
  const responseData = asRecord(response?.data);
  const directData = asRecord(record?.data);

  return responseData ?? directData ?? record;
};

const readStatus = (error: unknown, payload: UnknownRecord | null) => {
  const record = asRecord(error);
  const response = asRecord(record?.response);
  const candidate = response?.status ?? payload?.status;
  const status = Number(candidate);

  return Number.isInteger(status) ? status : undefined;
};

export const getApiErrorStatus = (error: unknown) => readStatus(error, readPayload(error));

export const isRetryableApiError = (error: unknown) => {
  const payload = readPayload(error);
  const status = readStatus(error, payload);

  return status === undefined || status === 408 || status === 429 || status >= 500;
};

const normalizeCandidate = (value: unknown) =>
  typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";

const isSafePublicMessage = (value: string) =>
  value.length > 0 &&
  value.length <= 320 &&
  !TECHNICAL_MESSAGE_PATTERNS.some((pattern) => pattern.test(value));

const statusFallback = (status: number | undefined, fallback: string) => {
  if (status === 401) return "Sua sessão expirou. Entre novamente.";
  if (status === 403) return "Você não tem permissão para realizar esta ação.";
  if (status === 404) return "O conteúdo solicitado não foi encontrado.";
  if (status === 408) return "A solicitação demorou demais. Tente novamente.";
  if (status === 429) return "Muitas tentativas. Aguarde um pouco e tente novamente.";
  if (status && status >= 500) return "Serviço temporariamente indisponível. Tente novamente.";

  return fallback;
};

export const getSafeApiErrorMessage = (error: unknown, fallback = DEFAULT_MESSAGE) => {
  const payload = readPayload(error);
  const record = asRecord(error);
  const status = readStatus(error, payload);

  if (status === 401 || status === 403 || status === 404 || status === 408 || status === 429) {
    return statusFallback(status, fallback);
  }
  if (status && status >= 500) return statusFallback(status, fallback);

  const candidates = [payload?.error, payload?.message, record?.message];

  for (const candidate of candidates) {
    const normalized = normalizeCandidate(candidate);
    if (isSafePublicMessage(normalized)) return normalized;
  }

  return statusFallback(status, fallback);
};

export const getSafePublicErrorMessage = (
  value: string | null | undefined,
  fallback = DEFAULT_MESSAGE,
) => getSafeApiErrorMessage(value ? new Error(value) : null, fallback);

export const getSafePublicMessage = (
  value: string | null | undefined,
  fallback = DEFAULT_MESSAGE,
) => {
  const normalized = normalizeCandidate(value);

  return isSafePublicMessage(normalized) ? normalized : fallback;
};
