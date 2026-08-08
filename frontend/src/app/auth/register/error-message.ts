import { getSafeApiErrorMessage } from "@/api/errors";

type RegistrationKind = "patient" | "psychologist";

export const resolveRegisterErrorMessage = (error: unknown, kind: RegistrationKind) => {
  const message = error instanceof Error ? error.message : "";
  const normalized = message.toLowerCase();

  if (normalized.includes("email") && normalized.includes("cadastrad")) {
    return "Este e-mail já está cadastrado. Faça login ou use outro e-mail.";
  }

  if (normalized.includes("senha") || normalized.includes("password")) {
    return "A senha precisa ter no mínimo 10 caracteres.";
  }

  if (normalized.includes("termos") || normalized.includes("terms")) {
    return kind === "psychologist"
      ? "Aceite os termos profissionais para continuar."
      : "Aceite os termos para continuar.";
  }

  if (normalized.includes("device") || normalized.includes("dispositivo")) {
    return "Não foi possível identificar seu dispositivo. Atualize a página e tente novamente.";
  }

  return getSafeApiErrorMessage(
    error,
    kind === "psychologist"
      ? "Não foi possível criar sua conta profissional agora. Tente novamente."
      : "Não foi possível criar sua conta agora. Tente novamente.",
  );
};
