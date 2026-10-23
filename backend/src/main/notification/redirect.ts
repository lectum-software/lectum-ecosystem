export const professionalAnalyticsNotificationRedirect = (
  messageKey: string | null,
  channel: "in_app" | "push",
  fallback?: string | null,
) => {
  if (messageKey !== "novo_favorito" && messageKey !== "clique_whatsapp") return fallback;
  return channel === "push" ? "/app/notificacoes" : "/app/profissional/estatisticas";
};
