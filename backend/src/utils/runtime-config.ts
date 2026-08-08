const DEFAULT_USER_TOKEN_LIMIT = 5;
const DEFAULT_CODE_VALIDITY_MINUTES = 15;
const DEFAULT_USER_JWT_TTL_HOURS = 168;
const DEFAULT_ADMIN_JWT_TTL_HOURS = 12;

type PositiveIntegerOptions = {
  max?: number;
  min?: number;
};

export const parsePositiveInteger = (
  value: unknown,
  fallback: number,
  { max = Number.MAX_SAFE_INTEGER, min = 1 }: PositiveIntegerOptions = {},
) => {
  const parsed = typeof value === "string" && value.trim() === "" ? Number.NaN : Number(value);

  if (!Number.isSafeInteger(parsed) || parsed < min || parsed > max) return fallback;

  return parsed;
};

export const isProductionRuntime = () =>
  ["prod", "production"].includes(process.env.NODE_ENV?.trim().toLowerCase() || "");

export const getUserTokenLimit = () =>
  parsePositiveInteger(process.env.TOKEN_API_USER_MAX, DEFAULT_USER_TOKEN_LIMIT, { max: 50 });

export const getAdminTokenLimit = () =>
  parsePositiveInteger(
    process.env.TOKEN_API_ADMIN_MAX || process.env.TOKEN_API_USER_MAX,
    DEFAULT_USER_TOKEN_LIMIT,
    { max: 50 },
  );

export const getCodeValidityMinutes = () =>
  parsePositiveInteger(process.env.CODE_API_USER_VALID_MINUTES, DEFAULT_CODE_VALIDITY_MINUTES, {
    max: 24 * 60,
  });

const hoursToSeconds = (hours: number) => hours * 60 * 60;

export const getUserJwtTtlSeconds = () =>
  hoursToSeconds(
    parsePositiveInteger(process.env.TOKEN_API_USER_TTL_HOURS, DEFAULT_USER_JWT_TTL_HOURS, {
      max: 24 * 365,
    }),
  );

export const getAdminJwtTtlSeconds = () =>
  hoursToSeconds(
    parsePositiveInteger(process.env.TOKEN_API_ADMIN_TTL_HOURS, DEFAULT_ADMIN_JWT_TTL_HOURS, {
      max: 24 * 30,
    }),
  );
