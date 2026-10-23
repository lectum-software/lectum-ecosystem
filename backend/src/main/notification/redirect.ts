export const professionalAnalyticsNotificationRedirect = (
  messageKey: string | null | undefined,
  channel: "in_app" | "push",
  fallback?: string | null,
) => {
  if (channel === "in_app") {
    if (messageKey === "novo_favorito")
      return "/app/profissional/estatisticas?metric=favorites_received";
    if (messageKey === "visualizacao_perfil")
      return "/app/profissional/estatisticas?metric=profile_views";
  }
  if (messageKey !== "novo_favorito" && messageKey !== "clique_whatsapp") return fallback;
  return channel === "push" ? "/app/notificacoes" : "/app/profissional/estatisticas";
};
