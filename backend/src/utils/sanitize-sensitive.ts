type SanitizeOptions = {
  removeAuthTokens?: boolean;
};

const sensitiveResponseKeys = new Set([
  "access_token",
  "ai_api_key",
  "api_key",
  "auth_token",
  "client_secret",
  "code_hash",
  "confirm_code",
  "gateway_token",
  "password",
  "password_confirm",
  "private_key",
  "provider_message_id",
  "recovery_code",
  "refresh_token",
  "secret",
  "secret_access_key",
  "secret_key",
  "webhook_secret",
]);

const sensitiveLogOnlyKeys = new Set(["token"]);

const shouldRemoveKey = (key: string, options: SanitizeOptions) => {
  const normalizedKey = key.toLowerCase();

  if (sensitiveResponseKeys.has(normalizedKey)) return true;

  return Boolean(options.removeAuthTokens && sensitiveLogOnlyKeys.has(normalizedKey));
};

export const sanitizeSensitiveData = <T = unknown>(value: T, options: SanitizeOptions = {}): T => {
  if (value === null || value === undefined) return value;
  if (value instanceof Date) return value;
  if (value instanceof Buffer) return value;

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeSensitiveData(item, options)) as T;
  }

  if (typeof value !== "object") return value;

  const sanitized: Record<string, unknown> = {};

  for (const [key, entryValue] of Object.entries(value)) {
    if (shouldRemoveKey(key, options)) continue;

    sanitized[key] = sanitizeSensitiveData(entryValue, options);
  }

  return sanitized as T;
};
