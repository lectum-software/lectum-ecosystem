export type CfpResult = {
  key: string;
  nome: string | null;
  nome_regional: string | null;
  registro: string | null;
  situacao: string | null;
  data_inscricao: string | null;
  active: boolean;
};

export type CfpSearchAttempts = {
  limit: number;
  used: number;
  remaining: number;
};

export type CfpSearchPayload = {
  cpf: string;
};

export type CfpSearchResponse = {
  check_id: string;
  found: boolean;
  results: CfpResult[];
  attempts?: CfpSearchAttempts;
};

export type CfpConfirmPayload = {
  check_id: string;
  result_key: string;
};

export type CfpConfirmResponse = {
  result: CfpResult;
  profile: {
    id: string;
    cpf: string | null;
    crp: string | null;
    crp_status: string;
    cfp_verified_at: string | null;
  };
};
