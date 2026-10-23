import { z } from "zod";

export const toBirthdateIso = (value?: string | null) => {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value?.trim() ?? "");
  if (!match) return null;
  const [, day, month, year] = match;
  const date = new Date(`${year}-${month}-${day}T00:00:00.000Z`);
  if (
    Number.isNaN(date.getTime()) ||
    date.getUTCFullYear() !== Number(year) ||
    date.getUTCMonth() + 1 !== Number(month) ||
    date.getUTCDate() !== Number(day) ||
    Number(year) < 1900 ||
    date > new Date()
  )
    return null;
  return `${year}-${month}-${day}`;
};

export const toBirthdateInput = (value?: string | null) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value ?? "");
  return match ? `${match[3]}/${match[2]}/${match[1]}` : "";
};

export const isAdultBirthdate = (value: string, today = new Date()) => {
  const iso = toBirthdateIso(value);
  if (!iso) return false;
  const cutoff = `${today.getUTCFullYear() - 18}-${String(today.getUTCMonth() + 1).padStart(2, "0")}-${String(today.getUTCDate()).padStart(2, "0")}`;
  return iso <= cutoff;
};

export const adultBirthdateSchema = z
  .string()
  .trim()
  .min(1, "Informe sua data de nascimento")
  .refine((value) => Boolean(toBirthdateIso(value)), "Informe uma data de nascimento válida")
  .refine(
    (value) => !toBirthdateIso(value) || isAdultBirthdate(value),
    "É necessário ter 18 anos ou mais para se cadastrar.",
  );
