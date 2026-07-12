import {
  getProfessionalShortDisplayName,
  normalizeProfessionalNamePart,
} from "@/utils/professional-name";

export type LectumWhatsappMessageSource = "profile" | "community_post" | "community_reply";

const WHATSAPP_MIN_DIGITS = 8;

const greetingFor = ({
  name,
  whatsappName,
}: {
  name?: string | null;
  whatsappName?: string | null;
}) => {
  const shortName =
    normalizeProfessionalNamePart(whatsappName) || getProfessionalShortDisplayName(name, "");

  return shortName ? `Ol\u00e1 ${shortName},` : "Ol\u00e1,";
};

const messageFor = ({
  psychologistName,
  psychologistWhatsappName,
  source,
}: {
  psychologistName?: string | null;
  psychologistWhatsappName?: string | null;
  source: LectumWhatsappMessageSource;
}) => {
  const greeting = greetingFor({
    name: psychologistName,
    whatsappName: psychologistWhatsappName,
  });

  if (source === "community_post") {
    return `${greeting} encontrei seu post na Lectum e gostaria de conversar sobre atendimento.`;
  }

  if (source === "community_reply") {
    return `${greeting} encontrei sua resposta na Lectum e gostaria de conversar sobre atendimento.`;
  }

  return `${greeting} encontrei seu perfil na Lectum e gostaria de conversar sobre atendimento.`;
};

export const buildLectumWhatsappUrl = ({
  phone,
  psychologistName,
  psychologistWhatsappName,
  source,
}: {
  phone?: string | null;
  psychologistName?: string | null;
  psychologistWhatsappName?: string | null;
  source: LectumWhatsappMessageSource;
}) => {
  const digits = String(phone ?? "").replace(/\D/g, "");
  if (digits.length < WHATSAPP_MIN_DIGITS) return null;

  return `https://wa.me/${digits}?text=${encodeURIComponent(
    messageFor({ psychologistName, psychologistWhatsappName, source }),
  )}`;
};
