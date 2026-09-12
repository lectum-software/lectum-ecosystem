import type { CfpSearchAttempts } from "../DTOs/ICfpDTO";

export const CPF_SEARCH_ATTEMPT_LIMIT = 3;

export const toAttempts = (used: number): CfpSearchAttempts => ({
  limit: CPF_SEARCH_ATTEMPT_LIMIT,
  remaining: Math.max(CPF_SEARCH_ATTEMPT_LIMIT - used, 0),
  used,
});
