const onlyDigits = (value?: string | null) => String(value ?? "").replace(/\D/g, "");

const stripArtificialCrpRegistrationZeros = (value: string) => value.replace(/^0+(?=\d)/, "");

export const normalizeCrpRegistrationDisplay = (value?: string | null) => {
  const normalized = String(value ?? "").trim();
  if (!normalized) return null;

  const [, ...registrationParts] = normalized.split("/");
  const registrationSource = (
    registrationParts.length > 0 ? registrationParts.join("/") : normalized
  ).trim();
  const registrationDigits = onlyDigits(registrationSource);

  if (registrationDigits) return stripArtificialCrpRegistrationZeros(registrationDigits);

  return registrationSource || null;
};

export const formatCrpRegistrationNumber = (value?: string | null) =>
  normalizeCrpRegistrationDisplay(value) ?? "Não informado";

export const formatAdminCrpNumber = ({
  crp,
  regionalCrp,
  registrationNumber,
}: {
  crp?: string | null;
  regionalCrp?: string | null;
  registrationNumber?: string | null;
}) => {
  const [fallbackRegion, ...fallbackRegistrationParts] = String(crp ?? "").split("/");
  const regionDigits = onlyDigits(regionalCrp || fallbackRegion).slice(0, 2);
  const registrationDigits = normalizeCrpRegistrationDisplay(
    registrationNumber || fallbackRegistrationParts.join("/"),
  );

  if (regionDigits && registrationDigits) {
    return `${regionDigits.padStart(2, "0")}/${registrationDigits}`;
  }

  return null;
};

export const crpRegionByUf: Record<string, string> = {
  AC: "20",
  AL: "15",
  AM: "20",
  AP: "10",
  BA: "03",
  CE: "11",
  DF: "01",
  ES: "16",
  GO: "09",
  MA: "22",
  MG: "04",
  MS: "14",
  MT: "18",
  PA: "10",
  PB: "13",
  PE: "02",
  PI: "21",
  PR: "08",
  RJ: "05",
  RN: "17",
  RO: "20",
  RR: "20",
  RS: "07",
  SC: "12",
  SE: "19",
  SP: "06",
  TO: "23",
};

export const formatRankingCrp = (crp: string | null) => {
  const value = crp?.trim();

  if (!value) return null;

  const normalized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
  const slashIndex = normalized.lastIndexOf("/");
  const regionSource = slashIndex >= 0 ? normalized.slice(0, slashIndex) : normalized;
  const registrationSource = slashIndex >= 0 ? normalized.slice(slashIndex + 1) : normalized;
  const regionDigits = regionSource.match(/\d{1,2}/)?.[0];
  const regionUf = regionSource.match(/\b[A-Z]{2}\b/)?.[0];
  const fallbackRegionDigits = normalized.match(/\d{1,2}/)?.[0];
  const region = (
    regionDigits ??
    (regionUf ? crpRegionByUf[regionUf] : null) ??
    fallbackRegionDigits
  )
    ?.padStart(2, "0")
    .slice(-2);
  const registrationDigits = registrationSource.replace(/\D/g, "");
  const registration = registrationDigits.replace(/^0+(?=\d)/, "");

  if (!region || !registrationDigits) return null;

  return `${region}/${registration}`;
};
