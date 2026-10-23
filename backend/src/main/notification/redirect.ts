export const favoriteNotificationRedirect = (
  messageKey: string | null,
  channel: "in_app" | "push",
  fallback?: string | null,
) => {
  if (messageKey !== "novo_favorito") return fallback;
  return channel === "push" ? "/app/notificacoes" : "/app/profissional/estatisticas";
};
