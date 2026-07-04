import type { professional_registry_check, psychologist_profile } from "@/interfaces/objects";
import type { CfpResult, CfpSearchBody, StoredRegistryCheckRaw } from "../../DTOs/ICfpDTO";

export interface ICfpRepository {
  getProfile(userId: string): Promise<psychologist_profile | null>;
  countCpfSearchAttempts(psychologistId: string): Promise<number>;
  createCheck(props: {
    psychologistId: string;
    request: CfpSearchBody;
    found: boolean;
    raw: StoredRegistryCheckRaw;
  }): Promise<professional_registry_check>;
  getCheckById(id: string, psychologistId: string): Promise<professional_registry_check | null>;
  confirmResult(props: { check: professional_registry_check; result: CfpResult }): Promise<{
    id: string;
    cpf: string | null;
    crp: string | null;
    crp_status: string;
    cfp_verified_at: Date | null;
  }>;
}
