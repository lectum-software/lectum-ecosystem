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
  typeof value === "string" && Object.values(MESSAGE_DIAGNOSTICS).includes(value)
    ? value
    : undefined;
