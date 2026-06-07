import { callEndpoint } from "@/api/generator";
import type {
  WhatsappVerificationConfirmPayload,
  WhatsappVerificationConfirmResponse,
  WhatsappVerificationRequestPayload,
  WhatsappVerificationRequestResponse,
} from "@/api/generator/types/whatsapp-verification";
import { handleReq } from "@/api/handle";

export const requestPsychologistWhatsappVerification = async (
  body: WhatsappVerificationRequestPayload,
) => {
  const handle = callEndpoint({
    route: "/api/private/psychologist/whatsapp/verification/request",
    body,
  });

  return handleReq<WhatsappVerificationRequestResponse>({
    ...handle,
    hideError: true,
  });
};

export const confirmPsychologistWhatsappVerification = async (
  body: WhatsappVerificationConfirmPayload,
) => {
  const handle = callEndpoint({
    route: "/api/private/psychologist/whatsapp/verification/confirm",
    body,
  });

  return handleReq<WhatsappVerificationConfirmResponse>({
    ...handle,
    hideError: true,
  });
};
