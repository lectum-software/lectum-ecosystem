type SanitizeOptions = {
  removeAuthTokens?: boolean;
  removePii?: boolean;
};

const sensitiveResponseKeys = new Set([
  "accesstoken",
  "accesskeyid",
  "aiapikey",
  "apikey",
  "auth",
  "authorization",
  "authtoken",
  "cardtoken",
  "clientsecret",
  "codehash",
  "confirmcode",
  "connectionstring",
  "causemessage",
  "credentials",
  "cookie",
  "cvv",
  "databaseurl",
  "gatewaytoken",
  "idtoken",
  "otp",
  "password",
  "passwordconfirm",
  "passwordhash",
  "p256dh",
  "privatekey",
  "providercode",
  "providererror",
  "providermessageid",
  "providermessage",
  "providerresponse",
  "raw",
  "recoverycode",
  "refreshtoken",
  "secret",
  "secretaccesskey",
  "secretkey",
  "setcookie",
  "signature",
  "sql",
  "stack",
  "webhooksecret",
]);

const sensitiveResponseSuffixes = [
  "accesstoken",
  "accesskeyid",
  "apikey",
  "authtoken",
  "cardtoken",
  "clientsecret",
  "codehash",
  "confirmcode",
  "connectionstring",
  "credentials",
  "databaseurl",
  "gatewaytoken",
  "password",
  "passwordconfirm",
  "passwordhash",
  "p256dh",
  "privatekey",
  "recoverycode",
  "refreshtoken",
  "sessiontoken",
  "secret",
  "secretaccesskey",
  "secretkey",
  "subscriptionauth",
  "webhooksecret",
] as const;

const sensitiveLogOnlySuffixes = ["token", "tokens"] as const;

const safeCredentialMetadataKeys = new Set(["haspassword"]);

const piiKeys = new Set([
  "cpf",
  "cpfmasked",
  "email",
  "emailaddress",
  "mobile",
  "phone",
  "phonenumber",
  "telephone",
  "whatsapp",
]);

const piiSuffixes = ["cpf", "email", "mobile", "phone", "phonenumber", "telephone", "whatsapp"];

const normalizeSensitiveKey = (key: string) => key.toLowerCase().replace(/[^a-z0-9]/g, "");

const AUTH_TOKEN_VALUE_PATTERNS = [
  /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/,
  /\b(?:bearer|basic)\s+[A-Za-z0-9+/_.=-]{8,}\b/i,
  /\bsk-(?:proj-)?[A-Za-z0-9_-]{12,}\b/i,
  /\b(?:gh[pousr]_[A-Za-z0-9_]{20,}|github_pat_[A-Za-z0-9_]{20,})\b/i,
  /\bxox[a-z]-[A-Za-z0-9-]{12,}\b/i,
  /\bAKIA[A-Z0-9]{16}\b/,
  /\bAIza[A-Za-z0-9_-]{20,}\b/,
  /\b(?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?):\/\/[^\s]+/i,
] as const;

const PII_VALUE_PATTERNS = [
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i,
  /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/,
  /(?:\+?55\s*)?\(?\d{2}\)?[\s.-]*\d{4,5}[\s.-]*\d{4}\b/,
] as const;

const containsPattern = (value: string, patterns: readonly RegExp[]) =>
  patterns.some((pattern) => pattern.test(value));

const shouldRemoveKey = (key: string, value: unknown, options: SanitizeOptions) => {
  const normalizedKey = normalizeSensitiveKey(key);

  if (safeCredentialMetadataKeys.has(normalizedKey) && typeof value === "boolean") {
    return false;
  }

  if (
    sensitiveResponseKeys.has(normalizedKey) ||
    sensitiveResponseSuffixes.some((suffix) => normalizedKey.endsWith(suffix))
  ) {
    return true;
  }

  if (
    options.removeAuthTokens &&
    (normalizedKey.includes("authorization") ||
      sensitiveLogOnlySuffixes.some((suffix) => normalizedKey.endsWith(suffix)))
  ) {
    return true;
  }

  return Boolean(
    options.removePii &&
      (piiKeys.has(normalizedKey) || piiSuffixes.some((suffix) => normalizedKey.endsWith(suffix))),
  );
};

export const sanitizeSensitiveData = <T = unknown>(value: T, options: SanitizeOptions = {}): T => {
  const stack = new WeakSet<object>();

  const visit = (entry: unknown): unknown => {
    if (entry === null || entry === undefined) return entry;
    if (entry instanceof Date || entry instanceof Buffer) return entry;

    if (typeof entry === "string") {
      if (options.removeAuthTokens && containsPattern(entry, AUTH_TOKEN_VALUE_PATTERNS)) {
        return "[REDACTED]";
      }
      if (options.removePii && containsPattern(entry, PII_VALUE_PATTERNS)) return "[REDACTED]";
      return entry;
    }

    if (typeof entry !== "object") return entry;
    if (stack.has(entry)) return "[REDACTED]";
    stack.add(entry);

    try {
      if (Array.isArray(entry)) return entry.map(visit);

      const sanitized: Record<string, unknown> = {};
      for (const [key, entryValue] of Object.entries(entry)) {
        if (shouldRemoveKey(key, entryValue, options)) continue;
        sanitized[key] = visit(entryValue);
      }

      return sanitized;
    } finally {
      stack.delete(entry);
    }
  };

  return visit(value) as T;
};
