"use client";

import {
  ArrowLeft,
  ArrowUp,
  BellRing,
  Bookmark,
  Eye,
  Heart,
  MessageSquare,
  MousePointerClick,
  Share2,
  Star,
} from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { z } from "zod";
import { useNotificationPreferences } from "@/api/callers/notification";
import type { NotificationPrefs } from "@/api/req/notification";
import { SwitchController } from "@/components/controllers";
import { LoadingState } from "@/components/ui/loading-state";
import { type Field, useFormList } from "@/hooks/form";
import { cn } from "@/lib/utils";
import { Button } from "@/registry/new-york-v4/ui/button";
import { PrivateTemplate } from "@/templates/private";

type Channel = "in_app" | "push";

type NotificationCategory = {
  key:
    | "nova_avaliacao"
    | "novo_favorito"
    | "visualizacao_perfil"
    | "clique_whatsapp"
    | "novo_post"
    | "nova_resposta"
    | "upvote"
    | "compartilhamento"
    | "salvamento";
  label: string;
  description: string;
  icon: typeof Star;
};

const SECTIONS: { key: string; label: string; categories: NotificationCategory[] }[] = [
  {
    key: "perfil",
    label: "PERFIL",
    categories: [
      {
        key: "nova_avaliacao",
        label: "Novas avaliações",
        description: "Quando um paciente publicar uma avaliação no seu perfil.",
        icon: Star,
      },
      {
        key: "novo_favorito",
        label: "Perfil favoritado",
        description: "Quando alguém salvar seu perfil para comparar ou chamar depois.",
        icon: Heart,
      },
      {
        key: "visualizacao_perfil",
        label: "Visualizações de perfil",
        description: "Quando houver nova visualização relevante no seu perfil.",
        icon: Eye,
      },
      {
        key: "clique_whatsapp",
        label: "Cliques no WhatsApp",
        description: "Quando um usuário iniciar contato pelo botão de WhatsApp.",
        icon: MousePointerClick,
      },
    ],
  },
  {
    key: "comunidade",
    label: "COMUNIDADE",
    categories: [
      {
        key: "novo_post",
        label: "Novas postagens",
        description: "Posts publicados em comunidades que você acompanha.",
        icon: MessageSquare,
      },
      {
        key: "nova_resposta",
        label: "Respostas em meus posts",
        description: "Novas respostas nas conversas que você iniciou.",
        icon: MessageSquare,
      },
      {
        key: "upvote",
        label: "Novos upvotes",
        description: "Upvotes recebidos em posts e respostas.",
        icon: ArrowUp,
      },
      {
        key: "salvamento",
        label: "Novos salvamentos",
        description: "Quando alguém salvar seus posts ou respostas.",
        icon: Bookmark,
      },
      {
        key: "compartilhamento",
        label: "Novos compartilhamentos",
        description: "Quando seu conteúdo for compartilhado por um usuário.",
        icon: Share2,
      },
    ],
  },
];

const CHANNELS: { key: Channel; label: string }[] = [
  { key: "in_app", label: "No app" },
  { key: "push", label: "Push" },
];

const CATEGORIES = SECTIONS.flatMap((section) => section.categories);
type CategoryKey = (typeof CATEGORIES)[number]["key"];
type PreferenceFieldName = `${CategoryKey}__${Channel}`;
type NotificationSettingsForm = Record<PreferenceFieldName, boolean>;

const getFieldName = (category: CategoryKey, channel: Channel) =>
  `${category}__${channel}` as PreferenceFieldName;

const PREFERENCE_FIELDS = CATEGORIES.flatMap((category) =>
  CHANNELS.map((channel) => ({
    name: getFieldName(category.key, channel.key),
    field: "switch" as const,
    label: `${category.label} - ${channel.label}`,
  })),
) satisfies Field<NotificationSettingsForm>[];

const notificationSettingsSchema = z.object(
  Object.fromEntries(PREFERENCE_FIELDS.map((field) => [field.name, z.boolean()])) as Record<
    PreferenceFieldName,
    z.ZodBoolean
  >,
) as z.ZodType<NotificationSettingsForm, NotificationSettingsForm>;

const toFormValues = (prefs: NotificationPrefs = {}) =>
  Object.fromEntries(
    CATEGORIES.flatMap((category) =>
      CHANNELS.map((channel) => [
        getFieldName(category.key, channel.key),
        prefs[category.key]?.[channel.key] ?? true,
      ]),
    ),
  ) as NotificationSettingsForm;

const fromFormValues = (values: NotificationSettingsForm): NotificationPrefs =>
  CATEGORIES.reduce<NotificationPrefs>((acc, category) => {
    const channels: { in_app?: boolean; push?: boolean } = {};
    for (const channel of CHANNELS) {
      channels[channel.key] = values[getFieldName(category.key, channel.key)];
    }
    acc[category.key] = channels;
    return acc;
  }, {});

export const NotificationSettingsLogic = () => {
  const { query, update } = useNotificationPreferences();
  const values = useMemo(() => toFormValues(query.data?.prefs ?? {}), [query.data?.prefs]);

  const form = useFormList<NotificationSettingsForm>({
    fields: PREFERENCE_FIELDS,
    schema: notificationSettingsSchema,
    defaultValues: toFormValues(),
    values,
    resetOptions: { keepDirtyValues: true },
  });

  const handleSubmit = form.hook.handleSubmit((formValues) => {
    update.mutate(fromFormValues(formValues), {
      onSuccess: () => form.hook.reset(formValues),
    });
  });

  return (
    <PrivateTemplate>
      <section className="mx-auto w-full max-w-2xl px-5 py-5 md:py-8">
        <header className="mb-6 flex items-center gap-3">
          <Button asChild className="h-10 w-10 rounded-full" type="button" variant="ghost">
            <Link aria-label="Voltar para notificações" href="/app/notifications">
              <ArrowLeft className="h-5 w-5" aria-hidden={true} />
            </Link>
          </Button>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-foreground md:text-2xl">
              Configurações de Notificações
            </h1>
            <p className="mt-1 text-sm leading-5 text-muted">
              Personalize como deseja ser alertado sobre novidades da sua rede profissional.
            </p>
          </div>
        </header>

        {query.isLoading ? (
          <LoadingState className="py-10" />
        ) : (
          <form className="grid gap-7" onSubmit={handleSubmit}>
            {SECTIONS.map((section) => (
              <section className="grid gap-3" key={section.key}>
                <h2 className="px-1 text-xs font-extrabold tracking-[0.18em] text-muted">
                  {section.label}
                </h2>

                <div className="overflow-hidden rounded-3xl border border-border bg-surface shadow-sm">
                  {section.categories.map((category, index) => {
                    const Icon = category.icon;

                    return (
                      <div
                        className={cn(
                          "grid gap-4 px-4 py-4 md:grid-cols-[1fr_auto] md:items-center md:px-5",
                          index > 0 && "border-t border-border",
                        )}
                        key={category.key}
                      >
                        <div className="flex min-w-0 items-start gap-3">
                          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-primary-soft text-primary">
                            <Icon className="h-5 w-5" aria-hidden={true} />
                          </span>
                          <div className="min-w-0">
                            <h3 className="text-[15px] font-bold leading-5 text-foreground">
                              {category.label}
                            </h3>
                            <p className="mt-1 text-sm leading-5 text-muted">
                              {category.description}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-start gap-4 pl-[52px] md:pl-0">
                          {CHANNELS.map((channel) => (
                            <SwitchController<NotificationSettingsForm>
                              className="gap-1 text-xs font-bold text-muted"
                              control={form.hook.control}
                              field="switch"
                              inputClassName="h-7 w-12"
                              key={channel.key}
                              label={channel.label}
                              name={getFieldName(category.key, channel.key)}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}

            {query.isError ? (
              <p className="rounded-2xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm font-semibold text-danger">
                Não foi possível carregar suas preferências. Tente novamente em instantes.
              </p>
            ) : null}

            <div className="sticky bottom-4 z-10 rounded-[1.75rem] bg-background/85 p-2 backdrop-blur md:static md:bg-transparent md:p-0">
              <Button
                className="h-12 w-full rounded-2xl text-base font-bold"
                disabled={update.isPending || !form.isDirty}
                type="submit"
              >
                {update.isPending ? "Salvando..." : "Salvar preferências"}
              </Button>
            </div>

            <div className="mx-auto grid max-w-[280px] place-items-center gap-3 py-8 text-center text-muted">
              <span className="grid h-24 w-24 place-items-center rounded-full bg-primary-soft/70 text-primary/40">
                <BellRing className="h-10 w-10" aria-hidden={true} />
              </span>
              <p className="text-sm leading-5">
                As preferências ficam salvas no seu perfil e podem ser alteradas a qualquer momento.
              </p>
            </div>
          </form>
        )}
      </section>
    </PrivateTemplate>
  );
};
