import argon2 from "argon2";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import { error, msg } from "@/helpers/translate";
import type {
  IConfirmWhatsappVerificationDTO,
  IRequestWhatsappVerificationDTO,
} from "../DTOs/IWhatsappVerificationDTO";
import { WhatsappVerificationRepository } from "../repositories/WhatsappVerificationRepository";

const CODE_ATTEMPT_LIMIT = 5;

const normalizePhone = (value: string) => {
  const parsed = parsePhoneNumberFromString(value, "BR");

  if (!parsed?.isValid()) return null;

  return parsed.number;
};
export const requestVerification = async (data: IRequestWhatsappVerificationDTO) => {
  if (data.auth.role !== "psicologo") {
    return {
      status: 403,
      ...error("role_not_authorized", {}),
    };
  }

  const phone = normalizePhone(data.b.phone);

  if (!phone) {
    return {
      status: 400,
      ...error("invalid_phone", {}),
    };
  }

  const repository = new WhatsappVerificationRepository();
  const profile = await repository.getProfile(data.auth.id!);

  if (!profile) {
    return {
      status: 404,
      ...error("not_found", {
        model: "psychologist_profile",
      }),
    };
  }

  const saved = await repository.saveWhatsapp({
    userId: data.auth.id!,
    phone,
  });

  return {
    status: 200,
    ...msg("whatsapp_saved", {}),
    data: saved,
  };
};
export const confirmVerification = async (data: IConfirmWhatsappVerificationDTO) => {
  if (data.auth.role !== "psicologo") {
    return {
      status: 403,
      ...error("role_not_authorized", {}),
    };
  }

  const repository = new WhatsappVerificationRepository();
  const verification = await repository.getVerification(data.b.verification_id, data.auth.id!);

  if (!verification) {
    return {
      status: 404,
      ...error("phone_verification_not_found", {}),
    };
  }

  if (verification.verified_at) {
    return {
      status: 400,
      ...error("code_confirmed", {}),
    };
  }

  if (verification.expires_at && verification.expires_at.getTime() < Date.now()) {
    return {
      status: 400,
      ...error("phone_verification_expired", {}),
    };
  }

  if ((verification.attempts || 0) >= CODE_ATTEMPT_LIMIT) {
    return {
      status: 429,
      ...error("phone_verification_too_many_attempts", {}),
    };
  }

  const isValidCode = await argon2.verify(verification.code_hash!, data.b.code);

  if (!isValidCode) {
    await repository.incrementAttempts(verification.id!);

    return {
      status: 400,
      ...error("code_incorrect", {}),
    };
  }

  const verifiedAt = new Date();
  const confirmed = await repository.confirmVerification({
    verification,
    verifiedAt,
  });

  return {
    status: 200,
    ...msg("phone_verification_confirmed", {}),
    data: confirmed,
  };
};
