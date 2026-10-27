// Provider text stays in memory; only these fixed categories may leave the adapter.
const MESSAGE_DIAGNOSTICS: Record<string, string> = {
  "payer and collector cannot be the same user": "payer_is_collector",
  "payer and collector must be different users": "payer_is_collector",
  "both payer and collector must be real or test users": "account_environment_mismatch",
  "card token was generated without cvv validation": "card_token_cvv_validation_missing",
  "card token not found": "card_token_not_found",
  "invalid card token": "card_token_invalid",
  "unauthorized access to resource": "resource_access_denied",
};

export const classifyGatewayMessage = (message: unknown): string | undefined => {
  if (typeof message !== "string") return undefined;
  const normalized = message.trim().toLowerCase().replace(/[.]$/, "");
  return Object.hasOwn(MESSAGE_DIAGNOSTICS, normalized)
    ? MESSAGE_DIAGNOSTICS[normalized]
    : undefined;
};

export const safeGatewayDiagnostic = (value: unknown): string | undefined =>
  typeof value === "string" &&
  (value === "provider_error_unclassified" || Object.values(MESSAGE_DIAGNOSTICS).includes(value))
    ? value
    : undefined;

// Hints indicate vocabulary present in the response, not a confirmed root cause.
const HINT_PATTERNS: Record<string, RegExp> = {
  card_token: /\bcard[ _-]?token\b/i,
  credentials: /\b(access[ _-]?token|credential|authorization|unauthorized|forbidden)\b/i,
  payer: /\b(payer|customer|buyer)\b/i,
  collector: /\b(collector|seller|merchant)\b/i,
  email: /\b(payer[ _-]?email|e-?mail)\b/i,
  subscription_plan: /\b(preapproval[ _-]?plan|plan[ _-]?id|subscription[ _-]?plan)\b/i,
  subscription: /\b(preapproval|subscription)\b/i,
  application: /\b(application|client[ _-]?id)\b/i,
  security_code: /\b(cvv|security[ _-]?code)\b/i,
  card_validation: /\b(card[ _-]?validation|validation)\b/i,
  payment: /\b(payment|transaction)\b/i,
  amount: /\b(amount|currency|price)\b/i,
  recurring_schedule: /\b(auto[ _-]?recurring|start[ _-]?date|frequency)\b/i,
  return_url: /\b(back[ _-]?url|return[ _-]?url)\b/i,
  invalid: /\b(invalid|incorrect|malformed)\b/i,
  missing: /\b(missing|required|not[ _-]?found|does not exist)\b/i,
  expired: /\b(expired|expiration)\b/i,
  rejected: /\b(rejected|declined|denied)\b/i,
  mismatch: /\b(mismatch|different|same|cannot be equal)\b/i,
  restricted: /\b(disabled|blocked|not allowed|not enabled|not authorized|unsupported)\b/i,
  test_environment: /\b(test|sandbox)\b/i,
  production_environment: /\b(real|production|live)\b/i,
  risk: /\b(risk|fraud|security)\b/i,
};

export const safeGatewayHints = (value: unknown): string[] =>
  Array.isArray(value) ? Object.keys(HINT_PATTERNS).filter((key) => value.includes(key)) : [];

export const extractGatewayDiagnostics = (error: Record<string, unknown>) => {
  const messages: string[] = [];
  const read = (value: unknown) => {
    if (typeof value === "string") messages.push(value.slice(0, 2048));
    else if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      const record = value as Record<string, unknown>;
      for (const key of ["message", "description", "error", "code", "status_detail"]) {
        if (typeof record[key] === "string") messages.push(record[key].slice(0, 2048));
      }
    }
  };
  read(error);
  for (const field of ["cause", "errors"]) {
    const entries = error[field];
    if (Array.isArray(entries)) entries.slice(0, 8).forEach(read);
    else read(entries);
  }
  const known = messages.map(classifyGatewayMessage).find(Boolean);
  if (known) return { diagnostic: known };
  return {
    diagnostic: "provider_error_unclassified",
    diagnostic_hints: Object.entries(HINT_PATTERNS)
      .filter(([, pattern]) => messages.some((message) => pattern.test(message)))
      .map(([key]) => key),
  };
};
