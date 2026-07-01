import { getProfessionalShortDisplayName } from "@/utils/professional-name";

export type LectumWhatsappMessageSource = "profile" | "community_post" | "community_reply";

const WHATSAPP_MIN_DIGITS = 8;

const greetingFor = (name?: string | null) => {
  const shortName = getProfessionalShortDisplayName(name, "");

  return shortName ? `Olá ${shortName},` : "Olá,";
};

const messageFor = (source: LectumWhatsappMessageSource, psychologistName?: string | null) => {
  const greeting = greetingFor(psychologistName);

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
  source,
}: {
  phone?: string | null;
  psychologistName?: string | null;
  source: LectumWhatsappMessageSource;
}) => {
  const digits = String(phone ?? "").replace(/\D/g, "");
  if (digits.length < WHATSAPP_MIN_DIGITS) return null;

  return `https://wa.me/${digits}?text=${encodeURIComponent(messageFor(source, psychologistName))}`;
};
