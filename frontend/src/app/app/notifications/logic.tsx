"use client";

import { Bell, Check } from "lucide-react";
import { useState } from "react";
import { useNotification } from "@/api/callers/notification";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingState } from "@/components/ui/loading-state";
import { getToken } from "@/hooks/cookies/token";
import { cn } from "@/lib/utils";
import { Button } from "@/registry/new-york-v4/ui/button";
import { PrivateTemplate } from "@/templates/private";

const LABELS: Record<string, string> = {
  nova_avaliacao: "Nova avaliação",
  novo_favorito: "Novo favorito",
  visualizacao_perfil: "Visualização de perfil",
  clique_whatsapp: "Contato via WhatsApp",
  novo_post: "Novo post",
  nova_resposta: "Nova resposta",
  upvote: "Curtida recebida",
  downvote: "Avaliação negativa",
  compartilhamento: "Compartilhamento",
  salvamento: "Salvamento",
};

export const NotificationsLogic = () => {
  const [hasAuthToken] = useState(() => {
    if (typeof window === "undefined") return false;

    return Boolean(getToken());
  });
  const { index, update, clean } = useNotification({ enabledIndex: hasAuthToken });
  const items = index.data?.pages.flatMap((page) => page.data) ?? [];

  return (
    <PrivateTemplate>
      <section className="mx-auto w-full max-w-2xl px-5 py-6">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-foreground">Notificações</h1>
          {items.length > 0 ? (
            <Button
              disabled={clean.isPending}
              onClick={() => clean.mutate()}
              type="button"
              variant="ghost"
            >
              Limpar
            </Button>
          ) : null}
        </div>

        {index.isLoading ? (
          <LoadingState className="py-10" />
        ) : items.length === 0 ? (
          <EmptyState
            description="Você está em dia. Novas notificações aparecerão aqui."
            icon={Bell}
            title="Nenhuma notificação"
          />
        ) : (
          <ul className="grid gap-2">
            {items.map((item) => (
              <li
                className={cn(
                  "flex items-center justify-between gap-3 rounded-[var(--lectum-card-radius)] border border-border bg-surface px-4 py-3",
                  !item.read && "border-primary/40",
                )}
                key={item.id}
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {LABELS[item.message_key ?? ""] ?? "Notificação"}
                  </p>
                  {item.createdAt ? (
                    <p className="text-xs text-muted">
                      {new Date(item.createdAt).toLocaleString("pt-BR")}
                    </p>
                  ) : null}
                </div>
                {!item.read && item.id ? (
                  <Button
                    disabled={update.isPending}
                    onClick={() => update.mutate({ id: item.id as string, read: true })}
                    type="button"
                    variant="ghost"
                  >
                    <Check className="h-4 w-4" aria-hidden="true" />
                    Marcar lida
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        )}

        {index.hasNextPage ? (
          <div className="mt-4 grid">
            <Button
              disabled={index.isFetchingNextPage}
              onClick={() => index.fetchNextPage()}
              type="button"
              variant="outline"
            >
              Carregar mais
            </Button>
          </div>
        ) : null}
      </section>
    </PrivateTemplate>
  );
};
