import type { phone_verification, psychologist_profile } from "@/interfaces/objects";

export type CreateWhatsappVerificationInput = {
  userId: string;
  phone: string;
  codeHash: string;
  expiresAt: Date;
};

export type CreateWhatsappVerificationOutput = {
  verification: phone_verification;
};

export type SaveWhatsappInput = {
  userId: string;
  phone: string;
};

export type SaveWhatsappOutput = {
  phone: string;
  whatsapp_verified_at: Date | null;
};

export type ConfirmWhatsappVerificationInput = {
  verification: phone_verification;
  verifiedAt: Date;
};

export interface IWhatsappVerificationRepository {
  getProfile(userId: string): Promise<psychologist_profile | null>;
  saveWhatsapp(input: SaveWhatsappInput): Promise<SaveWhatsappOutput>;
  getRecentPending(userId: string, phone: string, since: Date): Promise<phone_verification | null>;
  createVerification(
    input: CreateWhatsappVerificationInput,
  ): Promise<CreateWhatsappVerificationOutput>;
  updateProviderMessageId(id: string, providerMessageId: string): Promise<void>;
  deleteVerification(id: string): Promise<void>;
  getVerification(id: string, userId: string): Promise<phone_verification | null>;
  incrementAttempts(id: string): Promise<void>;
  confirmVerification(
    input: ConfirmWhatsappVerificationInput,
  ): Promise<{ phone: string; whatsapp_verified_at: Date }>;
}
