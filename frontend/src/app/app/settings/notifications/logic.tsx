"use client";

import {
  ArrowLeft,
  ArrowUp,
  BellOff,
  BellRing,
  Bookmark,
  Eye,
  Heart,
  Info,
  MessageSquare,
  Newspaper,
  Share2,
  ShieldCheck,
  Star,
} from "lucide-react";
import Link from "next/link";
import type { ComponentType } from "react";
import { useMemo } from "react";
import { z } from "zod";
import { useNotificationPreferences } from "@/api/callers/notification";
import type { NotificationPrefs } from "@/api/req/notification";
import { SelectController, SwitchController } from "@/components/controllers";
import { LoadingState } from "@/components/ui/loading-state";
import { WhatsAppIcon } from "@/components/ui/whatsapp-icon";
import { type Field, useFormList } from "@/hooks/form";
import { useNotificationPushPermission } from "@/hooks/notification";
import { useAppSelector } from "@/hooks/redux";
import { cn } from "@/lib/utils";
import { Button } from "@/registry/new-york-v4/ui/button";
import { PrivateTemplate } from "@/templates/private";

type UserRole = "paciente" | "psicologo" | null | undefined;
type NewPostAuthorScope = "patients_only" | "professionals_only" | "all" | "favorites";
type NewPostPreferenceValue = NewPostAuthorScope | "disabled";

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
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
};

const SECTIONS: { key: string; label: string; categories: NotificationCategory[] }[] = [
  {
    key: "perfil",
    label: "PERFIL",
    categories: [
      {
        key: "nova_avaliacao",
        label: "Novas avaliações",
        icon: Star,
      },
      {
        key: "novo_favorito",
        label: "Perfil favoritado",
        icon: Heart,
      },
      {
        key: "visualizacao_perfil",
        label: "Visualizações de perfil",
        icon: Eye,
      },
      {
        key: "clique_whatsapp",
        label: "Cliques no WhatsApp",
        icon: WhatsAppIcon,
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
        icon: Newspaper,
      },
      {
        key: "nova_resposta",
        label: "Respostas em meus posts",
        icon: MessageSquare,
      },
      {
        key: "upvote",
        label: "Novos upvotes",
        icon: ArrowUp,
      },
      {
        key: "salvamento",
        label: "Novos salvamentos",
        icon: Bookmark,
      },
      {
        key: "compartilhamento",
        label: "Novos compartilhamentos",
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
  novo_post__post_author_scope: NewPostPreferenceValue;
};

const SWITCH_CATEGORIES = CATEGORIES.filter(
  (category): category is NotificationCategory & { key: SwitchCategoryKey } =>
    category.key !== "novo_post",
);

const getEnabledFieldName = (category: SwitchCategoryKey) =>
  `${category}__enabled` as EnabledFieldName;

const getDefaultNewPostScope = (role: UserRole): NewPostAuthorScope =>
  role === "psicologo" ? "patients_only" : "all";

const resolveEnabled = (entry: NotificationPrefs[string] | undefined) => {
  if (!entry) return true;
  if (typeof entry.enabled === "boolean") return entry.enabled;
  if (entry.in_app === false && entry.push === false) return false;
  return true;
};

const resolveNewPostScope = (
  entry: NotificationPrefs[string] | undefined,
  role: UserRole,
): NewPostPreferenceValue => {
  if (entry && !resolveEnabled(entry)) {
    return "disabled";
  }

  const persistedScope = entry?.post_author_scope;
  const allowedScopes: NewPostAuthorScope[] =
    role === "psicologo" ? ["patients_only", "all"] : ["all", "favorites"];

  if (persistedScope && allowedScopes.includes(persistedScope)) {
    return persistedScope;
  }

  return getDefaultNewPostScope(role);
};

const getNewPostOptions = (role: UserRole) =>
  role === "psicologo"
    ? [
        { label: "Pacientes", value: "patients_only" },
        { label: "Todos", value: "all" },
        { label: "Desativado", value: "disabled" },
      ]
    : [
        { label: "Todos", value: "all" },
        { label: "Favoritos", value: "favorites" },
        { label: "Desativado", value: "disabled" },
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
  novo_post__post_author_scope: z.enum([
    "patients_only",
    "professionals_only",
    "all",
    "favorites",
    "disabled",
  ]),
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

const fromFormValues = (values: NotificationSettingsForm, role: UserRole): NotificationPrefs => {
  const prefs = SWITCH_CATEGORIES.reduce<NotificationPrefs>((acc, category) => {
    acc[category.key] = {
      enabled: values[getEnabledFieldName(category.key)],
    };
    return acc;
  }, {});

  const newPostScope = values.novo_post__post_author_scope;
  const isNewPostDisabled = newPostScope === "disabled";

  prefs.novo_post = {
    enabled: !isNewPostDisabled,
    post_author_scope: isNewPostDisabled ? getDefaultNewPostScope(role) : newPostScope,
  };

  return prefs;
};

const BrowserNotificationPermissionCard = () => {
  const {
    canRequestPermission,
    hasVapidKey,
    isChecking,
    isConfirmedUser,
    isRequestingPermission,
    isSupported,
    permission,
    requestPermissionAndSubscribe,
  } = useNotificationPushPermission();
  if (!isConfirmedUser) return null;

  const sharedClassName =
    "mb-6 rounded-3xl border border-border bg-surface p-4 text-sm shadow-sm md:p-5";

  if (isChecking && permission === "loading") {
    return (
      <section className={sharedClassName} aria-label="Status das notificações no navegador">
        <div className="flex gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-primary-soft text-primary">
            <Info className="h-5 w-5" aria-hidden={true} />
          </span>
          <div className="min-w-0">
            <h2 className="font-extrabold text-foreground">Verificando notificações</h2>
            <p className="mt-1 leading-5 text-muted">
              Estamos conferindo se este navegador pode receber notificações da Lectum.
            </p>
          </div>
        </div>
      </section>
    );
  }

  if (!isSupported) {
    return (
      <section className={sharedClassName} aria-label="Notificações do navegador indisponíveis">
        <div className="flex gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-surface-muted text-muted">
            <BellOff className="h-5 w-5" aria-hidden={true} />
          </span>
          <div className="min-w-0">
            <h2 className="font-extrabold text-foreground">
              Notificações do navegador indisponíveis
            </h2>
            <p className="mt-1 leading-5 text-muted">
              Este navegador não oferece suporte completo a push. Suas notificações in-app continuam
              disponíveis na central da Lectum.
            </p>
          </div>
        </div>
      </section>
    );
  }

  if (!hasVapidKey && !isChecking) {
    return (
      <section className={sharedClassName} aria-label="Push ainda não configurado">
        <div className="flex gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-surface-muted text-muted">
            <Info className="h-5 w-5" aria-hidden={true} />
          </span>
          <div className="min-w-0">
            <h2 className="font-extrabold text-foreground">
              Push ainda não está disponível neste ambiente
            </h2>
            <p className="mt-1 leading-5 text-muted">
              As notificações no navegador ainda não estão disponíveis. Enquanto isso, a central de
              notificações continua funcionando normalmente.
            </p>
          </div>
        </div>
      </section>
    );
  }

  if (permission === "denied") {
    return (
      <section className={sharedClassName} aria-label="Notificações bloqueadas no navegador">
        <div className="flex gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-danger/10 text-danger">
            <BellOff className="h-5 w-5" aria-hidden={true} />
          </span>
          <div className="min-w-0">
            <h2 className="font-extrabold text-foreground">Notificações bloqueadas</h2>
            <p className="mt-1 leading-5 text-muted">
              O navegador bloqueou notificações para a Lectum. Para receber push, reative a
              permissão nas configurações do navegador ou do sistema. Não vamos tentar pedir
              novamente por aqui.
            </p>
          </div>
        </div>
      </section>
    );
  }

  if (permission === "granted") {
    return (
      <section className={sharedClassName} aria-label="Notificações do navegador ativas">
        <div className="flex gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-primary-soft text-primary">
            <ShieldCheck className="h-5 w-5" aria-hidden={true} />
          </span>
          <div className="min-w-0">
            <h2 className="font-extrabold text-foreground">Notificações do navegador ativas</h2>
            <p className="mt-1 leading-5 text-muted">
              A Lectum pode revalidar sua inscrição push de forma segura. Você ainda controla quais
              categorias deseja receber abaixo.
            </p>
          </div>
        </div>
      </section>
    );
  }

  if (canRequestPermission) {
    return (
      <section className={sharedClassName} aria-label="Ativar notificações da Lectum">
        <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-center">
          <div className="flex gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-primary-soft text-primary">
              <BellRing className="h-5 w-5" aria-hidden={true} />
            </span>
            <div className="min-w-0">
              <h2 className="font-extrabold text-foreground">Ative notificações da Lectum</h2>
              <p className="mt-1 leading-5 text-muted">
                Receba avisos importantes sobre respostas, interações e contatos.
              </p>
            </div>
          </div>

          <Button
            className="h-11 rounded-2xl text-sm font-extrabold"
            disabled={isRequestingPermission}
            onClick={() => {
              void requestPermissionAndSubscribe();
            }}
            type="button"
          >
            <BellRing className="h-4 w-4" aria-hidden={true} />
            <span>{isRequestingPermission ? "Ativando..." : "Ativar notificações"}</span>
          </Button>
        </div>
      </section>
    );
  }

  return null;
};

export const NotificationSettingsLogic = () => {
  const sessionRole = useAppSelector((state) => state.user?.role);
  const { query, update } = useNotificationPreferences();
  const values = useMemo(
    () => toFormValues(query.data?.prefs ?? {}, sessionRole),
    [query.data?.prefs, sessionRole],
  );
  const newPostOptions = useMemo(() => getNewPostOptions(sessionRole), [sessionRole]);
  const visibleSections = useMemo(
    () =>
      sessionRole === "psicologo"
        ? SECTIONS
        : SECTIONS.filter((section) => section.key !== "perfil"),
    [sessionRole],
  );

  const form = useFormList<NotificationSettingsForm>({
    fields: PREFERENCE_FIELDS,
    schema: notificationSettingsSchema,
    defaultValues: toFormValues({}, sessionRole),
    values,
    resetOptions: { keepDirtyValues: true },
  });

  const handleSubmit = form.hook.handleSubmit((formValues) => {
    update.mutate(fromFormValues(formValues, sessionRole), {
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
            <Link aria-label="Voltar para notificações" href="/app/notificacoes">
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

        <BrowserNotificationPermissionCard />

        {query.isLoading ? (
          <LoadingState className="py-10" />
        ) : (
          <form className="grid gap-7" onSubmit={handleSubmit}>
            {visibleSections.map((section) => (
              <section className="grid gap-3" key={section.key}>
                {sessionRole === "paciente" && section.key === "comunidade" ? null : (
                  <h2 className="px-1 text-xs font-extrabold tracking-[0.18em] text-muted">
                    {section.label}
                  </h2>
                )}

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
                          "grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3.5 md:px-5",
                          index > 0 && "border-t border-border",
                        )}
                        key={category.key}
                      >
                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-primary-soft text-primary">
                          <Icon className="h-5 w-5" aria-hidden={true} />
                        </span>

                        <h3 className="min-w-0 text-[15px] font-bold leading-5 text-foreground">
                          {category.label}
                        </h3>

                        <div className="justify-self-end">
                          {isNewPost ? (
                            <SelectController<NotificationSettingsForm>
                              className="w-[136px] max-w-[42vw] gap-0 text-xs font-bold text-muted min-[380px]:w-[142px] sm:w-[148px] [&>span:first-child]:sr-only [&_[role=alert]]:hidden"
                              control={form.hook.control}
                              field="select"
                              hideEmptyOption
                              inputClassName="h-10 rounded-[1.15rem] border-border bg-surface px-3.5 pr-9 text-[13px] font-bold text-primary shadow-none hover:border-border hover:bg-surface-muted focus:border-primary focus:ring-0"
                              label={`Preferência de ${category.label}`}
                              name="novo_post__post_author_scope"
                              options={newPostOptions}
                              selectChevronClassName="right-3.5 h-4 w-4 text-primary/75"
                              selectContentClassName="top-[calc(100%+8px)] max-h-60 rounded-[1.15rem] border-border bg-surface p-1.5 text-[13px] font-semibold text-foreground shadow-none"
                              selectOptionClassName="rounded-[0.9rem] px-3 py-2.5 text-[13px] leading-5 text-foreground hover:bg-surface-muted hover:text-primary active:bg-primary-soft"
                              selectOptionSelectedClassName="bg-primary-soft text-primary"
                              useCustomSelect
                            />
                          ) : (
                            <SwitchController<NotificationSettingsForm>
                              className="justify-items-end gap-0 text-xs font-bold text-muted [&>span:first-child]:sr-only [&_[role=alert]]:hidden"
                              control={form.hook.control}
                              field="switch"
                              inputClassName="h-7 w-12"
                              label={category.label}
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
                disabled={update.isPending || !form.isDirty || form.isError}
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
