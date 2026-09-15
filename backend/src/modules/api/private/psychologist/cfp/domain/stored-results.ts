import type { professional_registry_check } from "@/interfaces/objects";
import { normalizeCrpRegistrationNumber } from "@/utils/professional-registry";
import type { CfpResult, StoredRegistryCheckRaw } from "../DTOs/ICfpDTO";
import { normalizeCfpResults } from "../providers/InfoSimplesCfpProvider";

export const asStoredRaw = (value: unknown): StoredRegistryCheckRaw | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;

  const raw = value as Partial<StoredRegistryCheckRaw>;
  if (raw.provider !== "infosimples") return null;

  return raw as StoredRegistryCheckRaw;
};

export const normalizeResultRegistrationNumber = (result: CfpResult): CfpResult => ({
  ...result,
  registro: normalizeCrpRegistrationNumber(result.registro),
});

export const extractStoredResults = (check: professional_registry_check): CfpResult[] => {
  const raw = asStoredRaw(check.raw);
  if (Array.isArray(raw?.normalized_results)) {
    return raw.normalized_results.map(normalizeResultRegistrationNumber);
  }

  if (raw?.response && typeof raw.response === "object") {
    return normalizeCfpResults(raw.response as Parameters<typeof normalizeCfpResults>[0]).map(
      normalizeResultRegistrationNumber,
    );
  }

  return [];
};
