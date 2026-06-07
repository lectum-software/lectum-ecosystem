import prisma from "@/infra/database/prisma";
import type { phone_verification, psychologist_profile } from "@/interfaces/objects";
import type {
  ConfirmWhatsappVerificationInput,
  CreateWhatsappVerificationInput,
  CreateWhatsappVerificationOutput,
  IWhatsappVerificationRepository,
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
      },
      data: {
        attempts: {
          increment: 1,
        },
      },
    });
  }

  async confirmVerification(input: ConfirmWhatsappVerificationInput) {
    const verifiedAt = input.verifiedAt;

    await prisma.$transaction(async (tx) => {
      await tx.phone_verification.update({
        where: {
          id: input.verification.id!,
        },
        data: {
          verified_at: verifiedAt,
        },
      });

      await tx.psychologist_profile.updateMany({
        where: {
          user_id: input.verification.user_id!,
          deleted: false,
        },
        data: {
          whatsapp: input.verification.phone!,
          whatsapp_verified_at: verifiedAt,
        },
      });
    });

    return {
      phone: input.verification.phone!,
      whatsapp_verified_at: verifiedAt,
    };
  }
}
