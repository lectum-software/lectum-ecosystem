type ProfessionalRegistryResult = {
  key?: string | null;
  nome_regional?: string | null;
  registro?: string | null;
};

type ProfessionalRegistryCheckLike = {
  raw?: unknown;
};

type StoredRegistryRawLike = {
  confirmed_result_key?: unknown;
  normalized_results?: unknown;
};

const toText = (value: unknown) => {
  if (typeof value !== "string") return null;

  const normalized = value.trim();
  return normalized || null;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === "object" && !Array.isArray(value));

const toRegistryResult = (value: unknown): ProfessionalRegistryResult | null => {
  if (!isRecord(value)) return null;

  return {
    key: toText(value.key),
    nome_regional: toText(value.nome_regional),
    registro: toText(value.registro),
  };
};

export const buildCrpFromRegistryResult = (result: ProfessionalRegistryResult) => {
  const regional = toText(result.nome_regional);
  const registro = normalizeCrpRegistrationNumber(result.registro);

  if (regional && registro) return `${regional}/${registro}`;

  return registro || regional;
};

export const normalizeCrpRegistrationNumber = (value?: string | null) => {
  const normalized = toText(value);
  if (!normalized) return null;

  if (/^\d+$/.test(normalized)) {
    return normalized.replace(/^0+(?=\d)/, "");
  }

  return normalized;
};

const parseStoredCrpParts = (value?: string | null) => {
  const normalized = value?.trim();
  if (!normalized) {
    return {
      crp_region: null,
      crp_number: null,
    };
  }

  const separatorIndex = normalized.lastIndexOf("/");
  if (separatorIndex < 0) {
    return {
      crp_region: null,
      crp_number: normalized,
    };
  }

  const crp_region = normalized.slice(0, separatorIndex).trim() || null;
  const crp_number = normalized.slice(separatorIndex + 1).trim() || null;

  return { crp_region, crp_number };
};

export const parseStoredCrp = (value?: string | null) => {
  const { crp_number, crp_region } = parseStoredCrpParts(value);

  return {
    crp_region,
    crp_number: normalizeCrpRegistrationNumber(crp_number),
  };
};

export const normalizeStoredCrp = (value?: string | null) => {
  const { crp_number, crp_region } = parseStoredCrp(value);

  if (crp_region && crp_number) return `${crp_region}/${crp_number}`;

  return crp_number || crp_region;
};

export const getConfirmedRegistryResult = (raw: unknown) => {
  if (!isRecord(raw)) return null;

  const registryRaw = raw as StoredRegistryRawLike;
  const confirmedKey = toText(registryRaw.confirmed_result_key);
  if (!confirmedKey || !Array.isArray(registryRaw.normalized_results)) return null;

  for (const item of registryRaw.normalized_results) {
    const result = toRegistryResult(item);
    if (result?.key === confirmedKey) return result;
  }

  return null;
};

export const resolveCrpFromRegistryChecks = (checks?: ProfessionalRegistryCheckLike[] | null) => {
  if (!checks?.length) return null;

  for (const check of checks) {
    const result = getConfirmedRegistryResult(check.raw);
    if (!result) continue;

    const crp = buildCrpFromRegistryResult(result);
    if (crp) return crp;
  }

  return null;
};

export const resolveProfileCrp = (
  crp?: string | null,
  checks?: ProfessionalRegistryCheckLike[] | null,
) => {
  const currentCrp = normalizeStoredCrp(crp);
  // A complete current CRP includes human corrections and must not be replaced by history.
  if (currentCrp && !/^\d+$/.test(crp?.trim() ?? "")) return currentCrp;

  const confirmedCrp = normalizeStoredCrp(resolveCrpFromRegistryChecks(checks));
  if (!currentCrp) return confirmedCrp;

  // Legacy numeric-only values may borrow a regional, but never a different registration number.
  const confirmed = parseStoredCrp(confirmedCrp);
  return confirmed.crp_region && confirmed.crp_number === currentCrp ? confirmedCrp : currentCrp;
};
