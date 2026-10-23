import { z } from "zod";
import { LegalError } from "@/modules/legal/contracts";

export const isAdultBirthdate = (value: string, today = new Date()) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  if (
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value ||
    value < "1900-01-01"
  )
    return false;
  const cutoff = `${today.getUTCFullYear() - 18}-${String(today.getUTCMonth() + 1).padStart(2, "0")}-${String(today.getUTCDate()).padStart(2, "0")}`;
  return value <= cutoff;
};

export const adultBirthdateSchema = z
  .string()
  .refine(
    (value) => isAdultBirthdate(value),
    "Informe uma data de nascimento válida de uma pessoa com 18 anos ou mais.",
  );

// Missing dates remain compatible with existing accounts and older clients during rollout.
export const registrationBirthdate = (value?: string) => {
  if (value === undefined) return undefined;
  if (!adultBirthdateSchema.safeParse(value).success)
    throw new LegalError("adult_declaration_required", 422);
  return new Date(`${value}T00:00:00.000Z`);
};

export const adultBirthdateDateSchema = adultBirthdateSchema.transform(
  (value) => new Date(`${value}T00:00:00.000Z`),
);
