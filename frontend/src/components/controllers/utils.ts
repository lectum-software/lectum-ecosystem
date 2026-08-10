import type { FieldPath, FieldValues } from "react-hook-form";

export function fieldId<FormType extends FieldValues>(
  name: FieldPath<FormType>,
  id?: string,
): string {
  return id || String(name).replaceAll(".", "-");
}

export function describedBy({
  description,
  error,
  id,
}: {
  id: string;
  description?: string;
  error?: string;
}): string | undefined {
  const ids = [];

  if (description) {
    ids.push(`${id}-description`);
  }

  if (error) {
    ids.push(`${id}-error`);
  }

  return ids.length ? ids.join(" ") : undefined;
}

export function onlyDigits(value?: string | number | null): string {
  return String(value ?? "").replace(/\D/g, "");
}

export function formatCpf(value?: string | number | null): string {
  const digits = onlyDigits(value).slice(0, 11);
  return digits
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3-$4");
}

export function formatCnpj(value?: string | number | null): string {
  const digits = onlyDigits(value).slice(0, 14);
  return digits
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/^(\d{2})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3/$4")
    .replace(/^(\d{2})\.(\d{3})\.(\d{3})\/(\d{4})(\d)/, "$1.$2.$3/$4-$5");
}

export function formatCep(value?: string | number | null): string {
  const digits = onlyDigits(value).slice(0, 8);
  return digits.replace(/^(\d{5})(\d)/, "$1-$2");
}

export function formatPhone(value?: string | number | null): string {
  let digits = onlyDigits(value).slice(0, 13);
  let prefix = "";

  if (digits.startsWith("55") && digits.length > 11) {
    digits = digits.slice(2);
    prefix = "+55 ";
  }

  if (digits.length <= 2) {
    return digits ? `${prefix}(${digits}` : "";
  }

  if (digits.length <= 7) {
    return `${prefix}(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  }

  if (digits.length <= 10) {
    return `${prefix}(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }

  return `${prefix}(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
}

export function formatDatePtBr(value?: string | number | null): string {
  const digits = onlyDigits(value).slice(0, 8);
  return digits.replace(/^(\d{2})(\d)/, "$1/$2").replace(/^(\d{2})\/(\d{2})(\d)/, "$1/$2/$3");
}

export function parseDecimal(value?: string | number | null): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value === "number") {
    return Number.isNaN(value) ? null : value;
  }

  const normalized = value
    .replace(/\./g, "")
    .replace(",", ".")
    .replace(/[^\d.-]/g, "");
  const parsed = Number(normalized);

  return Number.isNaN(parsed) ? null : parsed;
}

export function clampNumber(value: number | null, min?: number, max?: number): number | null {
  if (value === null) {
    return null;
  }

  if (typeof min === "number" && value < min) {
    return min;
  }

  if (typeof max === "number" && value > max) {
    return max;
  }

  return value;
}

export function toInputDate(value: unknown): string {
  if (!value) {
    return "";
  }

  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  if (typeof value === "string") {
    return value.slice(0, 10);
  }

  return "";
}

export function toDatePtBrInput(value: unknown): string {
  if (!value) {
    return "";
  }

  const inputDate = toInputDate(value);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(inputDate);

  if (match) {
    const [, year, month, day] = match;
    return `${day}/${month}/${year}`;
  }

  return formatDatePtBr(String(value));
}
