const MIN_REGISTRATION_YEAR = 1950;

const saoPauloParts = (date: Date) => {
  const parts = new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "America/Sao_Paulo",
    year: "numeric",
  }).formatToParts(date);

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);

  return {
    day: get("day"),
    month: get("month"),
    year: get("year"),
  };
};

const isValidDateParts = (year: number, month: number, day: number) => {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return false;

  const currentYear = saoPauloParts(new Date()).year;
  if (year < MIN_REGISTRATION_YEAR || year > currentYear) return false;

  const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
};

export const parseCrpRegistrationDate = (
  value?: string | null,
  options: { allowFuture?: boolean } = {},
): Date | null => {
  const normalized = value?.trim();
  if (!normalized) return null;

  const dateOnly = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const brazilianDate = normalized.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);

  let year: number;
  let month: number;
  let day: number;

  if (dateOnly) {
    year = Number(dateOnly[1]);
    month = Number(dateOnly[2]);
    day = Number(dateOnly[3]);
  } else if (brazilianDate) {
    year = Number(brazilianDate[3]);
    month = Number(brazilianDate[2]);
    day = Number(brazilianDate[1]);
  } else {
    const parsed = new Date(normalized);
    if (Number.isNaN(parsed.getTime())) return null;

    const parts = saoPauloParts(parsed);
    year = parts.year;
    month = parts.month;
    day = parts.day;
  }

  if (!isValidDateParts(year, month, day)) return null;

  const date = new Date(
    `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}T12:00:00.000-03:00`,
  );
  if (Number.isNaN(date.getTime())) return null;
  if (!options.allowFuture && date > new Date()) return null;

  return date;
};

export const crpExperienceYears = (value?: Date | string | null) => {
  const registrationDate =
    value instanceof Date
      ? value
      : typeof value === "string"
        ? parseCrpRegistrationDate(value)
        : null;

  if (!registrationDate || Number.isNaN(registrationDate.getTime())) return null;

  const current = saoPauloParts(new Date());
  const registration = saoPauloParts(registrationDate);

  let years = current.year - registration.year;
  const hasAnniversaryPassed =
    current.month > registration.month ||
    (current.month === registration.month && current.day >= registration.day);

  if (!hasAnniversaryPassed) years -= 1;

  return years > 0 ? years : null;
};
