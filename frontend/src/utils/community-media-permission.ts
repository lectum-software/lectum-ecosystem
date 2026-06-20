import type { user } from "@/api/generator/types/user";

export type CommunityMediaPermission = {
  canAttach: boolean;
  reason: string;
  showControl: boolean;
};

export const PROFESSIONAL_MEDIA_PERMISSION_LABEL =
  "Mídia disponível apenas para psicólogos verificados com Plano Profissional ativo.";

export const hasActiveProfessionalMediaPlan = (userData?: user | null) =>
  Boolean(
    userData?.psychologist_profile?.subscriptions?.some(
      (subscription) =>
        subscription.status === "ativa" &&
        subscription.plan?.active !== false &&
        subscription.plan?.slug !== "gratuito",
    ),
  );

export const getCommunityMediaPermission = (userData?: user | null): CommunityMediaPermission => {
  const activeProfessionalPlan = hasActiveProfessionalMediaPlan(userData);
  const canAttach = Boolean(
    userData?.role === "psicologo" &&
      userData.psychologist_profile?.cfp_verified_at &&
      activeProfessionalPlan,
  );

  if (canAttach) {
    return {
      canAttach,
      reason: "",
      showControl: true,
    };
  }

  if (userData?.role === "psicologo") {
    return {
      canAttach,
      reason: activeProfessionalPlan
        ? "Confirme seu registro CFP para anexar mídia."
        : PROFESSIONAL_MEDIA_PERMISSION_LABEL,
      showControl: true,
    };
  }

  return {
    canAttach,
    reason: "",
    showControl: false,
  };
};
