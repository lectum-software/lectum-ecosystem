import prisma from "@/infra/database/prisma";
import type { phone_verification, psychologist_profile } from "@/interfaces/objects";
import { withSerializableTransaction } from "@/utils/prisma-transaction";
import { CODE_ATTEMPT_LIMIT } from "../domain/limits";
import type {
  ConfirmWhatsappVerificationInput,
  CreateWhatsappVerificationInput,
  CreateWhatsappVerificationOutput,
  IWhatsappVerificationRepository,
  SaveWhatsappInput,
  SaveWhatsappOutput,
} from "./interfaces/IWhatsappVerificationRepository";

const PURPOSE = "psychologist_whatsapp";

const mapProfile = (profile: unknown) => profile as psychologist_profile | null;
const mapVerification = (verification: unknown) => verification as phone_verification | null;

export class WhatsappVerificationRepository implements IWhatsappVerificationRepository {
  async getProfile(userId: string): Promise<psychologist_profile | null> {
    const profile = await prisma.psychologist_profile.findFirst({
      where: {
        user_id: userId,
        deleted: false,
      },
    });

    return mapProfile(profile);
  }

  async saveWhatsapp(input: SaveWhatsappInput): Promise<SaveWhatsappOutput | null> {
    const saved = await withSerializableTransaction(async (tx) => {
      const updated = await tx.psychologist_profile.updateMany({
        where: {
          user_id: input.userId,
          deleted: false,
        },
        data: {
          whatsapp: input.phone,
          whatsapp_verified_at: null,
        },
      });
      if (updated.count === 0) return false;
      await tx.phone_verification.updateMany({
        where: { user_id: input.userId, purpose: PURPOSE, deleted: false, verified_at: null },
        data: { deleted: true, deletedAt: new Date() },
      });
      return true;
    });
    if (!saved) return null;

    return {
      phone: input.phone,
      whatsapp_verified_at: null,
    };
  }

  async getRecentPending(
    userId: string,
    phone: string,
    since: Date,
  ): Promise<phone_verification | null> {
    const verification = await prisma.phone_verification.findFirst({
      where: {
        user_id: userId,
        phone,
        purpose: PURPOSE,
        deleted: false,
        verified_at: null,
        sent_at: {
          gte: since,
        },
      },
      orderBy: {
        sent_at: "desc",
      },
    });

    return mapVerification(verification);
  }

  async createVerification(
    input: CreateWhatsappVerificationInput,
  ): Promise<CreateWhatsappVerificationOutput> {
    const result = await prisma.$transaction(async (tx) => {
      await tx.phone_verification.updateMany({
        where: {
          user_id: input.userId,
          purpose: PURPOSE,
          deleted: false,
          verified_at: null,
        },
        data: {
          deleted: true,
          deletedAt: new Date(),
        },
      });

      await tx.psychologist_profile.updateMany({
        where: {
          user_id: input.userId,
          deleted: false,
        },
        data: {
          whatsapp: input.phone,
          whatsapp_verified_at: null,
        },
      });

      return tx.phone_verification.create({
        data: {
          user_id: input.userId,
          phone: input.phone,
          purpose: PURPOSE,
          provider: "twilio",
          code_hash: input.codeHash,
          expires_at: input.expiresAt,
          sent_at: new Date(),
        },
      });
    });

    return {
      verification: result as phone_verification,
    };
  }

  async deleteVerification(id: string): Promise<void> {
    await prisma.phone_verification.updateMany({
      where: {
        id,
        deleted: false,
      },
      data: {
        deleted: true,
        deletedAt: new Date(),
      },
    });
  }

  async updateProviderMessageId(id: string, providerMessageId: string): Promise<void> {
    await prisma.phone_verification.updateMany({
      where: {
        id,
        deleted: false,
      },
      data: {
        provider_message_id: providerMessageId,
      },
    });
  }

  async getVerification(id: string, userId: string): Promise<phone_verification | null> {
    const verification = await prisma.phone_verification.findFirst({
      where: {
        id,
        user_id: userId,
        purpose: PURPOSE,
        deleted: false,
      },
    });

    return mapVerification(verification);
  }

  async incrementAttempts(id: string): Promise<void> {
    await prisma.phone_verification.updateMany({
      where: {
        id,
        deleted: false,
        verified_at: null,
        purpose: PURPOSE,
        expires_at: { gt: new Date() },
        attempts: { lt: CODE_ATTEMPT_LIMIT },
      },
      data: {
        attempts: {
          increment: 1,
        },
      },
    });
  }

  async confirmVerification(input: ConfirmWhatsappVerificationInput) {
    return withSerializableTransaction(async (tx) => {
      const verifiedAt = new Date();
      const verification = await tx.phone_verification.findFirst({
        where: {
          id: input.verification.id!,
          user_id: input.verification.user_id!,
          purpose: PURPOSE,
          phone: input.verification.phone!,
          code_hash: input.verification.code_hash!,
          deleted: false,
          verified_at: null,
          expires_at: { gt: verifiedAt },
          attempts: { lt: CODE_ATTEMPT_LIMIT },
        },
      });
      if (!verification) return null;

      // Never restore a previous phone from the OTP snapshot. Only verify the current one.
      const updated = await tx.psychologist_profile.updateMany({
        where: {
          user_id: verification.user_id,
          deleted: false,
          whatsapp: verification.phone,
        },
        data: {
          whatsapp_verified_at: verifiedAt,
        },
      });
      if (updated.count === 0) return null;
      await tx.phone_verification.update({
        where: { id: verification.id },
        data: { verified_at: verifiedAt },
      });
      return { phone: verification.phone, whatsapp_verified_at: verifiedAt };
    });
  }
}
