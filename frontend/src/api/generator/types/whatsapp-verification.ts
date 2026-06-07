export type WhatsappVerificationRequestPayload = {
  phone: string;
};

export type WhatsappVerificationConfirmPayload = {
  verification_id: string;
  code: string;
};

export type WhatsappVerificationRequestResponse = {
  phone: string;
  whatsapp_verified_at: string | null;
};

export type WhatsappVerificationConfirmResponse = {
  phone: string;
  whatsapp_verified_at: string;
};
