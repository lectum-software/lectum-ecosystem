const DEFAULT_PUBLIC_ERROR = "Não foi possível concluir a solicitação agora.";

const TECHNICAL_ERROR_PATTERNS = [
  /request failed with status code/i,
  /network error|internal server error|socket hang up/i,
  /\b(?:econnrefused|econnreset|econnaborted|enotfound|etimedout|eai_again)\b/i,
  /\b(?:typeerror|referenceerror|syntaxerror|rangeerror)\b/i,
  /\bat\s+[\w$.<>]+\s*\(/i,
  /\b(?:prisma|postgres(?:ql)?|sqlstate|redis)\b/i,
  /\bP[12]\d{3}\b/,
  /\b(?:foreign key|unique constraint|database|datasource|relation|column|table)\b.*\b(?:failed|missing|not found|does not exist|violation|error)\b/i,
  /\b(?:next_public|process\.env|database_url|jwt_secret|access_token)\b/i,
  /\b(?:payload|webhook|endpoint|schema|stack|trace|policyagent|mercadopago|preapproval|gateway)\b/i,
  /\b(?:cannot|failed|failure|unexpected|missing|required|not found|does not exist|unauthorized|forbidden)\b/i,
  /\b(?:template|resource) with id\b/i,
  /\b[0-9a-f]{24,}\b/i,
  /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/i,
  /[A-Z][A-Z0-9]+(?:_[A-Z0-9]+){2,}/,
  /https?:\/\//i,
  /(?:\/Users\/|\/app\/|node_modules|\/(?:api|src|dist)\/)/i,
  /\.(?:c|m)?tsx?:\d+(?::\d+)?/i,
  /<!doctype|<(?:html|body|pre|script)\b/i,
];

const normalizeMessage = (value: unknown) =>
  typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";

export const isSafePublicErrorMessage = (value: unknown) => {
  const normalized = normalizeMessage(value);

  return (
    normalized.length > 0 &&
    normalized.length <= 320 &&
    !TECHNICAL_ERROR_PATTERNS.some((pattern) => pattern.test(normalized))
  );
};

export const sanitizePublicErrorMessage = (value: unknown, fallback = DEFAULT_PUBLIC_ERROR) => {
  const normalized = normalizeMessage(value);
  return isSafePublicErrorMessage(normalized) ? normalized : fallback;
};

export const sanitizePublicErrorData = <T = unknown>(value: T, fallback = "Valor inválido."): T => {
  if (typeof value === "string") return sanitizePublicErrorMessage(value, fallback) as T;
  if (value === null || value === undefined || value instanceof Date || value instanceof Buffer) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizePublicErrorData(item, fallback)) as T;
  }

  if (typeof value !== "object") return value;

  const sanitized: Record<string, unknown> = {};
  for (const [key, entryValue] of Object.entries(value)) {
    sanitized[key] = sanitizePublicErrorData(entryValue, fallback);
  }

  return sanitized as T;
};
