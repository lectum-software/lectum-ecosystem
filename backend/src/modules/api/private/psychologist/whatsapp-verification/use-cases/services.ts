import { randomInt } from "node:crypto";
import argon2 from "argon2";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import { error, msg } from "@/helpers/translate";
import { isTwilioConfigured } from "@/modules/api/config/twilio";
import { messages } from "@/modules/api/config/twilio/messages";
import type {
  IConfirmWhatsappVerificationDTO,
  IRequestWhatsappVerificationDTO,
} from "../DTOs/IWhatsappVerificationDTO";
import { WhatsappVerificationRepository } from "../repositories/WhatsappVerificationRepository";

const CODE_EXPIRATION_MINUTES = 10;
const CODE_ATTEMPT_LIMIT = 5;
const RESEND_WAIT_SECONDS = 60;

const normalizePhone = (value: string) => {
  const parsed = parsePhoneNumberFromString(value, "BR");

  if (!parsed?.isValid()) return null;

  return parsed.number;
};

const createCode = () => String(randomInt(0, 1_000_000)).padStart(6, "0");
const addMinutes = (date: Date, minutes: number) => new Date(date.getTime() + minutes * 60_000);
const subtractSeconds = (date: Date, seconds: number) => new Date(date.getTime() - seconds * 1_000);

export const requestVerification = async (data: IRequestWhatsappVerificationDTO) => {
  if (data.auth.role !== "psicologo") {
    return {
      status: 403,
      ...error("role_not_authorized", {}),
    };
  }

  if (!isTwilioConfigured()) {
    return {
      status: 503,
      ...error("phone_verification_config_error", {}),
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

  if (profile.whatsapp === phone && profile.whatsapp_verified_at) {
    return {
      status: 200,
      ...msg("phone_verification_already_confirmed", {}),
      data: {
        verification_id: null,
        phone,
        expires_at: null,
        already_verified: true,
      },
    };
  }

  const recent = await repository.getRecentPending(
    data.auth.id!,
    phone,
    subtractSeconds(new Date(), RESEND_WAIT_SECONDS),
  );

  if (recent) {
    return {
      status: 429,
      ...error("phone_verification_recent", {
        seconds: RESEND_WAIT_SECONDS,
      }),
    };
  }

  const code = createCode();
  const codeHash = await argon2.hash(code);
  const expiresAt = addMinutes(new Date(), CODE_EXPIRATION_MINUTES);
  const { verification } = await repository.createVerification({
    userId: data.auth.id!,
    phone,
    codeHash,
    expiresAt,
  });

  const sent = await messages.code({
    to: phone,
    code,
  });

  if (!sent) {
    await repository.deleteVerification(verification.id!);

    return {
      status: 502,
      ...error("phone_verification_send_failed", {}),
    };
  }

  return {
    status: 200,
    ...msg("phone_verification_code_sent", {
      minutes: CODE_EXPIRATION_MINUTES,
    }),
    data: {
      verification_id: verification.id,
      phone,
      expires_at: expiresAt,
      already_verified: false,
    },
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
