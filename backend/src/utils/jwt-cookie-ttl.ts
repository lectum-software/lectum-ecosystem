import jwt from "jsonwebtoken";

export const getJwtCookieMaxAge = ({
  defaultMaxAge,
  now = Date.now(),
  token,
}: {
  defaultMaxAge: number;
  now?: number;
  token: string;
}) => {
  try {
    const payload = jwt.decode(token);
    const expiresAt = payload && typeof payload !== "string" ? payload.exp : undefined;
    if (typeof expiresAt !== "number" || !Number.isSafeInteger(expiresAt)) {
      return defaultMaxAge;
    }

    const remaining = expiresAt * 1_000 - now;
    if (!Number.isFinite(remaining) || remaining <= 0) return 0;

    return Math.min(defaultMaxAge, Math.floor(remaining));
  } catch {
    return defaultMaxAge;
  }
};
