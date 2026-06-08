const onlyDigits = (value?: string | null) => String(value ?? "").replace(/\D/g, "");

export const formatCrpNumber = (value?: string | null) => {
  const normalized = value?.trim();
  if (!normalized) return null;

  const [rawRegion, ...rawNumberParts] = normalized.split("/");
  const regionDigits = onlyDigits(rawRegion).slice(0, 2);
  const numberDigits = onlyDigits(rawNumberParts.join("/")).slice(0, 6);

  if (regionDigits && numberDigits) {
    return `${regionDigits.padStart(2, "0")}/${numberDigits.padStart(6, "0")}`;
  }

  return normalized;
};
