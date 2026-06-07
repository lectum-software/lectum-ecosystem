import type { user } from "@/interfaces/objects";

export type RequestWhatsappVerificationBody = {
  phone: string;
};

export type ConfirmWhatsappVerificationBody = {
  verification_id: string;
  code: string;
};

export type WhatsappVerificationRequestResponse = {
  verification_id: string | null;
  phone: string;
  expires_at: Date | null;
  already_verified: boolean;
};

export type WhatsappVerificationConfirmResponse = {
  phone: string;
  whatsapp_verified_at: Date;
};

export interface IRequestWhatsappVerificationDTO {
  b: RequestWhatsappVerificationBody;
  auth: user;
}

export interface IConfirmWhatsappVerificationDTO {
  b: ConfirmWhatsappVerificationBody;
  auth: user;
}
