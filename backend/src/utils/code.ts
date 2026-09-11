import { randomInt } from "node:crypto";
import { v4 } from "uuid";

export const code = (onlyNumeric = true) => {
  if (onlyNumeric) return randomInt(0, 1000000).toString().padStart(6, "0");

  return v4().slice(0, 6);
};

export const isCodeWithinValidity = (
  issuedAt: Date | null | undefined,
  validityMinutes: number,
  now = Date.now(),
) => {
  if (!issuedAt || !Number.isSafeInteger(validityMinutes) || validityMinutes <= 0) return false;
  const age = now - issuedAt.getTime();
  return Number.isFinite(age) && age >= 0 && age < validityMinutes * 60_000;
};
