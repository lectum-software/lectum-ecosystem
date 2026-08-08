import { callEndpoint } from "@/api/generator";
import type {
  CfpConfirmPayload,
  CfpConfirmResponse,
  CfpSearchPayload,
  CfpSearchResponse,
} from "@/api/generator/types/cfp";
import { handleReq } from "@/api/handle";

export const searchPsychologistCfp = async (body: CfpSearchPayload) => {
  const handle = callEndpoint({
    route: "/api/private/psychologist/cfp/search",
    body,
  });

  return handleReq<CfpSearchResponse>({
    ...handle,
    config: { timeout: 100_000 },
    hideError: true,
  });
};

export const confirmPsychologistCfp = async (body: CfpConfirmPayload) => {
  const handle = callEndpoint({
    route: "/api/private/psychologist/cfp/confirm",
    body,
  });

  return handleReq<CfpConfirmResponse>({
    ...handle,
    hideError: true,
  });
};
