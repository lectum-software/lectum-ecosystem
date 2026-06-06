import type { user } from "@/interfaces/objects";

export type CfpSearchBody = {
  cpf?: string;
  nome?: string;
  registro?: string;
  uf?: string;
};

export type CfpConfirmBody = {
  check_id: string;
  result_key: string;
};

export type CfpResult = {
  key: string;
  nome: string | null;
  nome_regional: string | null;
  registro: string | null;
  situacao: string | null;
  data_inscricao: string | null;
  active: boolean;
};

export type CfpSearchResponse = {
  check_id: string;
  found: boolean;
  results: CfpResult[];
};

export type CfpConfirmResponse = {
  result: CfpResult;
  profile: {
    id: string;
    cpf: string | null;
    crp: string | null;
    crp_status: string;
    cfp_verified_at: Date | null;
  };
};

export type StoredRegistryCheckRaw = {
  provider: "infosimples";
  request: CfpSearchBody;
  response: unknown;
  normalized_results: CfpResult[];
  confirmed_result_key?: string;
  confirmed_at?: string;
};

export interface ICfpSearchDTO {
  b: CfpSearchBody;
  auth: user;
}

export interface ICfpConfirmDTO {
  b: CfpConfirmBody;
  auth: user;
}
