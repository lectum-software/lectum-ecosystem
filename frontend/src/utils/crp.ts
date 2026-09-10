const onlyDigits = (value?: string | null) => String(value ?? "").replace(/\D/g, "");

const stripCrpPrefix = (value: string) => value.replace(/^(?:CRP\s*[:\-–—]?\s*)+/i, "").trim();

const stripArtificialLeadingZeros = (value: string) => value.replace(/^0+(?=\d)/, "");

export const formatCrpNumber = (value?: string | null) => {
  const normalized = stripCrpPrefix(value?.trim() ?? "");
  if (!normalized) return null;

  const [rawRegion, ...rawNumberParts] = normalized.split("/");
  const regionDigits = onlyDigits(rawRegion).slice(0, 2);
  const numberDigits = onlyDigits(rawNumberParts.join("/")).slice(0, 6);

  if (regionDigits && numberDigits) {
    // Regional usa 2 digitos, mas o numero publico do registro nao deve ganhar
    // nem preservar zeros artificiais que nao foram o registro real digitado.
    return `${regionDigits.padStart(2, "0")}/${stripArtificialLeadingZeros(numberDigits)}`;
  }

  return normalized;
};

export const formatCrpLabel = (value?: string | null) => {
  const crp = formatCrpNumber(value);

  return crp ? `CRP ${crp}` : "CRP não informado";
};
