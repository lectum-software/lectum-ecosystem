"use client";

import {
  ArrowLeft,
  ArrowUp,
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
import { SelectController, SwitchController } from "@/components/controllers";
import { LoadingState } from "@/components/ui/loading-state";
import { type Field, useFormList } from "@/hooks/form";
import { useAppSelector } from "@/hooks/redux";
import { cn } from "@/lib/utils";
import { Button } from "@/registry/new-york-v4/ui/button";
import { PrivateTemplate } from "@/templates/private";

type UserRole = "paciente" | "psicologo" | null | undefined;
type NewPostAuthorScope = "patients_only" | "professionals_only" | "all";

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
        description: "Escolha de quem deseja receber alertas nas comunidades que acompanha.",
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

const CATEGORIES = SECTIONS.flatMap((section) => section.categories);
type CategoryKey = (typeof CATEGORIES)[number]["key"];
type SwitchCategoryKey = Exclude<CategoryKey, "novo_post">;
type EnabledFieldName = `${SwitchCategoryKey}__enabled`;
type NotificationSettingsForm = Record<EnabledFieldName, boolean> & {
  novo_post__post_author_scope: NewPostAuthorScope;
};

const SWITCH_CATEGORIES = CATEGORIES.filter(
  (category): category is NotificationCategory & { key: SwitchCategoryKey } =>
    category.key !== "novo_post",
);

const getEnabledFieldName = (category: SwitchCategoryKey) =>
  `${category}__enabled` as EnabledFieldName;

const getDefaultNewPostScope = (role: UserRole): NewPostAuthorScope =>
  role === "psicologo" ? "patients_only" : "professionals_only";

const resolveEnabled = (entry: NotificationPrefs[string] | undefined) => {
  if (!entry) return true;
  if (typeof entry.enabled === "boolean") return entry.enabled;
  if (entry.in_app === false && entry.push === false) return false;
  return true;
};

const resolveNewPostScope = (
  entry: NotificationPrefs[string] | undefined,
  role: UserRole,
): NewPostAuthorScope => {
  if (
    entry?.post_author_scope === "patients_only" ||
    entry?.post_author_scope === "professionals_only" ||
    entry?.post_author_scope === "all"
  ) {
    return entry.post_author_scope;
  }

  return getDefaultNewPostScope(role);
};

const getNewPostOptions = (role: UserRole) =>
  role === "psicologo"
    ? [
        { label: "Somente pacientes", value: "patients_only" },
        { label: "Todos", value: "all" },
      ]
    : [
        { label: "Somente profissionais", value: "professionals_only" },
        { label: "Todos", value: "all" },
      ];

const PREFERENCE_FIELDS = [
  ...SWITCH_CATEGORIES.map((category) => ({
    name: getEnabledFieldName(category.key),
    field: "switch" as const,
    label: category.label,
  })),
  {
    name: "novo_post__post_author_scope" as const,
    field: "select" as const,
    label: "Novas postagens",
  },
] satisfies Field<NotificationSettingsForm>[];

const notificationSettingsSchema = z.object({
  nova_avaliacao__enabled: z.boolean(),
  novo_favorito__enabled: z.boolean(),
  visualizacao_perfil__enabled: z.boolean(),
  clique_whatsapp__enabled: z.boolean(),
  nova_resposta__enabled: z.boolean(),
  upvote__enabled: z.boolean(),
  compartilhamento__enabled: z.boolean(),
  salvamento__enabled: z.boolean(),
  novo_post__post_author_scope: z.enum(["patients_only", "professionals_only", "all"]),
}) as z.ZodType<NotificationSettingsForm, NotificationSettingsForm>;

const toFormValues = (prefs: NotificationPrefs = {}, role: UserRole): NotificationSettingsForm =>
  ({
    ...Object.fromEntries(
      SWITCH_CATEGORIES.map((category) => [
        getEnabledFieldName(category.key),
        resolveEnabled(prefs[category.key]),
      ]),
    ),
    novo_post__post_author_scope: resolveNewPostScope(prefs.novo_post, role),
  }) as NotificationSettingsForm;

const fromFormValues = (values: NotificationSettingsForm): NotificationPrefs => {
  const prefs = SWITCH_CATEGORIES.reduce<NotificationPrefs>((acc, category) => {
    acc[category.key] = {
      enabled: values[getEnabledFieldName(category.key)],
    };
    return acc;
  }, {});

  prefs.novo_post = {
    enabled: true,
    post_author_scope: values.novo_post__post_author_scope,
  };

  return prefs;
};

export const NotificationSettingsLogic = () => {
  const sessionRole = useAppSelector((state) => state.user?.role);
  const { query, update } = useNotificationPreferences();
  const values = useMemo(
    () => toFormValues(query.data?.prefs ?? {}, sessionRole),
    [query.data?.prefs, sessionRole],
  );
  const newPostOptions = useMemo(() => getNewPostOptions(sessionRole), [sessionRole]);

  const form = useFormList<NotificationSettingsForm>({
    fields: PREFERENCE_FIELDS,
    schema: notificationSettingsSchema,
    defaultValues: toFormValues({}, sessionRole),
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
        <header className="mb-6 flex items-start gap-3">
          <Button
            asChild
            className="h-10 w-10 shrink-0 rounded-full p-0"
            type="button"
            variant="ghost"
          >
            <Link aria-label="Voltar para notificações" href="/app/notifications">
              <ArrowLeft className="h-5 w-5" aria-hidden={true} />
            </Link>
          </Button>
          <div className="min-w-0 pt-1">
            <h1 className="text-xl font-extrabold tracking-tight text-foreground md:text-2xl">
              Configurações de Notificações
            </h1>
            <p className="mt-1 text-sm leading-5 text-muted">
              Personalize como deseja ser alertado sobre as novidades da Lectum
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
                    const isNewPost = category.key === "novo_post";
                    const enabledFieldName = isNewPost
                      ? null
                      : getEnabledFieldName(category.key as SwitchCategoryKey);

                    return (
                      <div
                        className={cn(
                          "grid gap-4 px-4 py-4 md:grid-cols-[1fr_minmax(180px,220px)] md:items-center md:px-5",
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

                        <div className="pl-[52px] md:pl-0">
                          {isNewPost ? (
                            <SelectController<NotificationSettingsForm>
                              className="w-full gap-1 text-xs font-bold text-muted"
                              control={form.hook.control}
                              field="select"
                              hideEmptyOption
                              inputClassName="h-11 rounded-2xl text-sm font-semibold"
                              label="Receber de"
                              name="novo_post__post_author_scope"
                              options={newPostOptions}
                            />
                          ) : (
                            <SwitchController<NotificationSettingsForm>
                              className="items-start gap-1 text-xs font-bold text-muted md:items-end"
                              control={form.hook.control}
                              field="switch"
                              inputClassName="h-7 w-12"
                              label="Receber"
                              name={enabledFieldName as EnabledFieldName}
                            />
                          )}
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
          </form>
        )}
      </section>
    </PrivateTemplate>
  );
};
