import { getSafeApiErrorMessage } from "@/api/errors";

export const resolveMediaUploadError = (error: unknown) => {
  const message = getSafeApiErrorMessage(
    error,
    "Não foi possível anexar a mídia agora. Tente novamente.",
  );
  const normalized = message.toLowerCase();

  if (
    normalized.includes("tamanho") ||
    normalized.includes("limite") ||
    normalized.includes("50")
  ) {
    return "A mídia precisa ter até 50MB.";
  }

  if (normalized.includes("tipo") || normalized.includes("permit")) {
    return "Envie uma imagem ou vídeo em formato permitido.";
  }

  if (normalized.includes("plano") || normalized.includes("verific")) {
    return "Mídia disponível apenas para psicólogos verificados.";
  }

  return message;
};
