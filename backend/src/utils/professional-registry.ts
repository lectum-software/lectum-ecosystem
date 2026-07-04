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
  const registro = toText(result.registro);

  if (regional && registro) return `${regional}/${registro}`;

  return registro || regional;
};

export const parseStoredCrp = (value?: string | null) => {
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
