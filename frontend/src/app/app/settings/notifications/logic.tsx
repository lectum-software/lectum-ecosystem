"use client";

import { useState } from "react";
import { useNotificationPreferences } from "@/api/callers/notification";
import type { NotificationPrefs } from "@/api/req/notification";
import { LoadingState } from "@/components/ui/loading-state";
import { Button } from "@/registry/new-york-v4/ui/button";
import { PrivateTemplate } from "@/templates/private";

type Channel = "in_app" | "push";

const CATEGORIES: { key: string; label: string }[] = [
  { key: "nova_avaliacao", label: "Nova avaliação" },
  { key: "novo_favorito", label: "Novo favorito" },
  { key: "visualizacao_perfil", label: "Visualização de perfil" },
  { key: "clique_whatsapp", label: "Contato via WhatsApp" },
  { key: "novo_post", label: "Novo post" },
  { key: "nova_resposta", label: "Nova resposta" },
  { key: "upvote", label: "Curtida recebida" },
  { key: "compartilhamento", label: "Compartilhamento" },
  { key: "salvamento", label: "Salvamento" },
];

const CHANNELS: { key: Channel; label: string }[] = [
  { key: "in_app", label: "No app" },
  { key: "push", label: "Push" },
];

export const NotificationSettingsLogic = () => {
  const { query, update } = useNotificationPreferences();
  // `null` enquanto o usuário não editou: o estado exibido deriva do servidor.
  const [draft, setDraft] = useState<NotificationPrefs | null>(null);
  const current = draft ?? query.data?.prefs ?? {};

  const isOn = (key: string, channel: Channel) => current[key]?.[channel] ?? true;

  const toggle = (key: string, channel: Channel) => {
    setDraft((prev) => {
      const base = prev ?? query.data?.prefs ?? {};
      return {
        ...base,
        [key]: { ...base[key], [channel]: !(base[key]?.[channel] ?? true) },
      };
    });
  };

  return (
    <PrivateTemplate>
      <section className="mx-auto w-full max-w-2xl px-5 py-6">
        <h1 className="mb-4 text-xl font-bold text-foreground">Configurações de notificações</h1>

        {query.isLoading ? (
          <LoadingState className="py-10" />
        ) : (
          <>
            <ul className="grid gap-2">
              {CATEGORIES.map((category) => (
                <li
                  className="rounded-[var(--lectum-card-radius)] border border-border bg-surface px-4 py-3"
                  key={category.key}
                >
                  <p className="text-sm font-semibold text-foreground">{category.label}</p>
                  <div className="mt-2 flex gap-5">
                    {CHANNELS.map((channel) => (
                      <label
                        className="flex items-center gap-2 text-sm text-muted"
                        key={channel.key}
                      >
                        <input
                          checked={isOn(category.key, channel.key)}
                          className="h-4 w-4 rounded border-border text-primary"
                          onChange={() => toggle(category.key, channel.key)}
                          type="checkbox"
                        />
                        {channel.label}
                      </label>
                    ))}
                  </div>
                </li>
              ))}
            </ul>

            <div className="mt-5">
              <Button
                className="w-full"
                disabled={update.isPending}
                onClick={() => update.mutate(current)}
                type="button"
              >
                Salvar preferências
              </Button>
            </div>
          </>
        )}
      </section>
    </PrivateTemplate>
  );
};
