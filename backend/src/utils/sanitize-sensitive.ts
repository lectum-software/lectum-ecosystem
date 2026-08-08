type SanitizeOptions = {
  removeAuthTokens?: boolean;
};

const sensitiveResponseKeys = new Set([
  "accesstoken",
  "aiapikey",
  "apikey",
  "authorization",
  "authtoken",
  "cardtoken",
  "clientsecret",
  "codehash",
  "confirmcode",
  "cookie",
  "cvv",
  "gatewaytoken",
  "password",
  "passwordconfirm",
  "privatekey",
  "providermessageid",
  "recoverycode",
  "refreshtoken",
  "secret",
  "secretaccesskey",
  "secretkey",
  "setcookie",
  "webhooksecret",
]);

const sensitiveLogOnlyKeys = new Set(["token"]);

const normalizeSensitiveKey = (key: string) => key.toLowerCase().replace(/[^a-z0-9]/g, "");

const shouldRemoveKey = (key: string, options: SanitizeOptions) => {
  const normalizedKey = normalizeSensitiveKey(key);

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
