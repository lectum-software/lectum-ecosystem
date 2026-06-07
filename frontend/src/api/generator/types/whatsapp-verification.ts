export type WhatsappVerificationRequestPayload = {
  phone: string;
};

export type WhatsappVerificationConfirmPayload = {
  verification_id: string;
  code: string;
};

export type WhatsappVerificationRequestResponse = {
  verification_id: string | null;
  phone: string;
  expires_at: string | null;
  already_verified: boolean;
};

export type WhatsappVerificationConfirmResponse = {
  phone: string;
  whatsapp_verified_at: string;
};
