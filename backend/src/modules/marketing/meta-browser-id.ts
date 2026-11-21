import { z } from "zod";

const legacyTokens = new Set(["AQ", "Ag", "Aw", "BA", "BQ", "Bg"]);

// Official Parameter Builder appendix: format, language, change kind, semver bytes.
export function isMetaBrowserId(value: string) {
  if (value.trim() !== value) return false;
  if (!/^fb\.\d{1,3}\.\d{13}\.\d{1,30}(\.[A-Za-z0-9_-]{2}|\.[A-Za-z0-9_-]{8})?$/.test(value))
    return false;
  const suffix = value.split(".")[4];
  if (!suffix) return true;
  if (suffix.length === 2) return legacyTokens.has(suffix);
  const bytes = Buffer.from(suffix, "base64url");
  return (
    bytes.length === 6 &&
    bytes.toString("base64url") === suffix &&
    bytes[0] === 1 &&
    bytes[1] >= 1 &&
    bytes[1] <= 6 &&
    bytes[2] <= 3
  );
}

export const metaBrowserIdSchema = z.string().refine(isMetaBrowserId);

export function browserIdWithinConsent(
  value: string,
  grantedAt: number,
  capturedAt: number,
  now: number,
) {
  if (!isMetaBrowserId(value)) return false;
  const createdAt = Number(value.split(".")[2]);
  return (
    [grantedAt, capturedAt, now].every(Number.isSafeInteger) &&
    createdAt >= grantedAt &&
    createdAt <= capturedAt &&
    capturedAt <= now &&
    now < createdAt + 30 * 86400000
  );
}
