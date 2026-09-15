import type { NotificationMessageKey, NotificationUserRole } from "./preferences";

export const PATIENT_TEMPORAL_DIGEST_KEYS = [
  "upvote",
  "salvamento",
  "compartilhamento",
] as const satisfies readonly NotificationMessageKey[];

export const PROFESSIONAL_DAILY_DIGEST_KEYS = [
  "visualizacao_perfil",
  "compartilhamento",
  "salvamento",
  "upvote",
] as const satisfies readonly NotificationMessageKey[];
export type ProfessionalDailyDigestKey = (typeof PROFESSIONAL_DAILY_DIGEST_KEYS)[number];

export const PROFESSIONAL_NEW_POST_DIGEST_KEYS = [
  "novo_post",
] as const satisfies readonly NotificationMessageKey[];

export const PATIENT_FIXED_DIGEST_KEYS = [
  "novo_post",
] as const satisfies readonly NotificationMessageKey[];

const keysInclude = <T extends readonly string[]>(keys: T, key: string) =>
  keys.includes(key as T[number]);

/**
 * Regras estaticas de politica de push imediato. Eventos aqui continuam
 * criando notificacoes in-app individuais, mas o canal push imediato e
 * suprimido para ser tratado por digest ou para evitar ruido.
 */
export const isImmediatePushSuppressedByDigestPolicy = (
  role: NotificationUserRole,
  messageKey: string,
) => {
  if (role === "paciente") {
    return (
      keysInclude(PATIENT_FIXED_DIGEST_KEYS, messageKey) ||
      keysInclude(PATIENT_TEMPORAL_DIGEST_KEYS, messageKey)
    );
  }

  if (role === "psicologo") {
    return (
      messageKey === "downvote" ||
      keysInclude(PROFESSIONAL_DAILY_DIGEST_KEYS, messageKey) ||
      keysInclude(PROFESSIONAL_NEW_POST_DIGEST_KEYS, messageKey)
    );
  }

  return false;
};
