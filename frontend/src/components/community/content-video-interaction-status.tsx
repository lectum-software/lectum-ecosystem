import type { ContentVideoInteractionSyncState } from "./content-video-interaction-refresh";

export const ContentVideoInteractionStatus = ({
  state,
  className,
  onRetry,
}: {
  state: ContentVideoInteractionSyncState;
  className: string;
  onRetry: () => void;
}) => (
  <div role={state === "error" ? "alert" : "status"} className={className}>
    {state === "pending"
      ? "Atualizando interações..."
      : state === "unavailable"
        ? "Este vídeo não está mais disponível."
        : "Não foi possível atualizar as interações."}
    {state === "error" ? (
      <button type="button" onClick={onRetry}>
        Tentar novamente
      </button>
    ) : null}
  </div>
);
