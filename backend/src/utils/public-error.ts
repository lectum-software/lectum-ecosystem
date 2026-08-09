const DEFAULT_PUBLIC_ERROR = "Não foi possível concluir a solicitação agora.";

const TECHNICAL_ERROR_DATA_KEYS = new Set([
  "cause",
  "column",
  "details",
  "model",
  "operation",
  "provider",
  "providererror",
  "query",
  "raw",
  "response",
  "sql",
  "stack",
  "table",
]);

const normalizeDataKey = (key: string) => key.toLowerCase().replace(/[^a-z0-9]/g, "");

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
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i,
  /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/,
  /(?:\+?55\s*)?\(?\d{2}\)?[\s.-]*\d{4,5}[\s.-]*\d{4}\b/,
  /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/,
  /\b(?:bearer|basic)\s+[A-Za-z0-9+/_.=-]{8,}\b/i,
  /\b(?:api[_ -]?key|authorization|client[_ -]?secret|password|private[_ -]?key|refresh[_ -]?token|secret|token)\b\s*[:=]\s*\S+/i,
  /\bsk-(?:proj-)?[A-Za-z0-9_-]{12,}\b/i,
  /\b(?:gh[pousr]_[A-Za-z0-9_]{20,}|github_pat_[A-Za-z0-9_]{20,})\b/i,
  /\bxox[a-z]-[A-Za-z0-9-]{12,}\b/i,
  /\bAKIA[A-Z0-9]{16}\b/,
  /\bAIza[A-Za-z0-9_-]{20,}\b/,
  /\b(?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?):\/\/[^\s]+/i,
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
  if (isSafePublicErrorMessage(normalized)) return normalized;

  const normalizedFallback = normalizeMessage(fallback);
  return isSafePublicErrorMessage(normalizedFallback) ? normalizedFallback : DEFAULT_PUBLIC_ERROR;
};

export const sanitizePublicErrorData = <T = unknown>(value: T, fallback = "Valor inválido."): T => {
  const seen = new WeakSet<object>();

  const visit = (entry: unknown): unknown => {
    if (typeof entry === "string") return sanitizePublicErrorMessage(entry, fallback);
    if (entry === null || entry === undefined) return entry;
    if (typeof entry !== "object") return entry;
    if (entry instanceof Buffer || entry instanceof Date) return "[REDACTED]";
    if (seen.has(entry)) return "[REDACTED]";
    seen.add(entry);

    if (Array.isArray(entry)) return entry.map(visit);

    const prototype = Object.getPrototypeOf(entry);
    if (prototype !== Object.prototype && prototype !== null) return "[REDACTED]";

    const sanitized: Record<string, unknown> = {};
    for (const [key, entryValue] of Object.entries(entry)) {
      if (TECHNICAL_ERROR_DATA_KEYS.has(normalizeDataKey(key))) continue;
      sanitized[key] = visit(entryValue);
    }

    return sanitized;
  };

  return visit(value) as T;
};
