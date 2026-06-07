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

export type ConfirmWhatsappVerificationInput = {
  verification: phone_verification;
  verifiedAt: Date;
};

export interface IWhatsappVerificationRepository {
  getProfile(userId: string): Promise<psychologist_profile | null>;
  getRecentPending(userId: string, phone: string, since: Date): Promise<phone_verification | null>;
  createVerification(
    input: CreateWhatsappVerificationInput,
  ): Promise<CreateWhatsappVerificationOutput>;
  deleteVerification(id: string): Promise<void>;
  getVerification(id: string, userId: string): Promise<phone_verification | null>;
  incrementAttempts(id: string): Promise<void>;
  confirmVerification(
    input: ConfirmWhatsappVerificationInput,
  ): Promise<{ phone: string; whatsapp_verified_at: Date }>;
}
