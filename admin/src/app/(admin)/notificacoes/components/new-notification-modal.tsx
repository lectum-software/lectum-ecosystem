"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Clock3, CopyCheck, Loader2, Send, X } from "lucide-react";
import { useEffect, useState } from "react";
import { FormProvider, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import {
  useAdminNotificationCreateCampaign,
  useAdminNotificationScheduleCampaign,
  useAdminNotificationSendCampaign,
  useAdminNotificationUpdateCampaign,
} from "@/api/callers/notifications";
import { resolveApiError } from "@/api/handle";
import type {
  AdminNotificationCampaign,
  AdminNotificationCampaignPayload,
  AdminNotificationChannel,
  AdminNotificationEmailStatus,
  AdminNotificationPushStatus,
} from "@/api/req/notifications";
import { InputController, SelectController, TextareaController } from "@/components/controllers";

import {
  AUDIENCE_OPTIONS,
  audienceLabel,
  type NotificationFormValues,
  notificationFormSchema,
  numberFormatter,
  type SubmitIntent,
  toInputDateTime,
} from "../modules/notification-support";

import { emailUnavailableCopy, pushUnavailableCopy } from "./logs";

import { CardShell, ChannelCheckbox } from "./table";

export const NewNotificationModal = ({
  campaign,
  email,
  onClose,
  push,
}: {
  campaign?: AdminNotificationCampaign | null;
  email?: AdminNotificationEmailStatus;
  onClose: () => void;
  push?: AdminNotificationPushStatus;
}) => {
  const createCampaign = useAdminNotificationCreateCampaign();
  const updateCampaign = useAdminNotificationUpdateCampaign();
  const sendCampaign = useAdminNotificationSendCampaign();
  const scheduleCampaign = useAdminNotificationScheduleCampaign();
  const [intent, setIntent] = useState<SubmitIntent>("draft");
  const emailAvailable = Boolean(email?.available);
  const emailVisible = emailAvailable || Boolean(campaign?.channels.includes("email"));
  const pushAvailable = Boolean(push?.available);
  const form = useForm<NotificationFormValues>({
    defaultValues: {
      audience: campaign?.audience ?? "all_users",
      body: campaign?.body ?? "",
      delivery_mode: "draft",
      email: emailAvailable ? (campaign?.channels.includes("email") ?? false) : false,
      in_app: campaign?.channels.includes("in_app") ?? true,
      push: pushAvailable ? (campaign?.channels.includes("push") ?? false) : false,
      redirect: campaign?.redirect ?? "",
      scheduled_at: toInputDateTime(campaign?.scheduled_at),
      title: campaign?.title ?? "",
    },
    mode: "onSubmit",
    resolver: zodResolver(notificationFormSchema),
  });
  useEffect(() => {
    form.setValue(
      "email",
      emailAvailable ? (campaign?.channels.includes("email") ?? false) : false,
    );
    form.setValue("push", pushAvailable ? (campaign?.channels.includes("push") ?? false) : false);
  }, [campaign, emailAvailable, form, pushAvailable]);
  const preview = useWatch({ control: form.control });
  const pending =
    createCampaign.isPending ||
    updateCampaign.isPending ||
    sendCampaign.isPending ||
    scheduleCampaign.isPending;
  const unavailableEmail = emailUnavailableCopy(email);
  const unavailablePush = pushUnavailableCopy(push);
  const previewChannels = [
    preview.in_app ? "In-app" : null,
    preview.push && pushAvailable ? "Push" : null,
    preview.email && emailAvailable ? "E-mail" : null,
  ].filter(Boolean);

  const submit = async (values: NotificationFormValues) => {
    if (
      values.delivery_mode === "send_now" &&
      !window.confirm("Enviar esta notificação agora para o público selecionado?")
    )
      return;
    const channels: AdminNotificationChannel[] = [
      ...(values.in_app ? ["in_app" as const] : []),
      ...(values.push && pushAvailable ? ["push" as const] : []),
      ...(values.email && emailAvailable ? ["email" as const] : []),
    ];
    const payload: AdminNotificationCampaignPayload = {
      audience: values.audience,
      body: values.body.trim(),
      channels,
      redirect: values.redirect?.trim() || null,
      title: values.title.trim(),
    };
    try {
      const saved = campaign
        ? await updateCampaign.mutateAsync({ id: campaign.id, input: payload })
        : await createCampaign.mutateAsync(payload);
      if (values.delivery_mode === "send_now") {
        const result = await sendCampaign.mutateAsync(saved.id);
        toast.success(
          `Notificação enviada. Entregas: ${numberFormatter.format(result.summary.total_deliveries)}.`,
        );
      } else if (values.delivery_mode === "schedule") {
        await scheduleCampaign.mutateAsync({
          id: saved.id,
          scheduledAt: new Date(values.scheduled_at || "").toISOString(),
        });
        toast.success("Notificação agendada com sucesso.");
      } else {
        toast.success("Rascunho salvo.");
      }
      onClose();
    } catch (error) {
      toast.error(resolveApiError(error));
    }
  };

  const submitWithIntent = (nextIntent: SubmitIntent) => {
    setIntent(nextIntent);
    form.setValue("delivery_mode", nextIntent, { shouldDirty: true, shouldValidate: false });
    void form.handleSubmit(submit)();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-overlay p-3 sm:items-center">
      <CardShell className="max-h-[94dvh] w-full max-w-3xl overflow-y-auto p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-primary">
              {campaign ? "Editar rascunho" : "Nova notificação"}
            </p>
            <h2 className="mt-2 text-2xl font-black text-foreground">
              Criar campanha manual para usuários
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              E-mail e push aparecem somente quando estão disponíveis. O histórico de envios
              automáticos é somente leitura.
            </p>
          </div>
          <button
            aria-label="Fechar criação de notificação"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-border bg-surface text-muted transition hover:text-foreground"
            disabled={pending}
            onClick={onClose}
            type="button"
          >
            <X aria-hidden className="h-5 w-5" />
          </button>
        </div>
        <FormProvider {...form}>
          <form
            className="mt-6 grid gap-5 lg:grid-cols-[1.1fr_0.9fr]"
            noValidate
            onSubmit={form.handleSubmit(submit)}
          >
            <div className="space-y-4">
              <InputController<NotificationFormValues>
                disabled={pending}
                label="Título"
                name="title"
                placeholder="Ex.: Nova comunidade: TDAH"
                required
              />
              <TextareaController<NotificationFormValues>
                disabled={pending}
                label="Mensagem"
                name="body"
                placeholder="Escreva a mensagem curta exibida nos canais selecionados."
                required
                rows={5}
              />
              <SelectController<NotificationFormValues>
                disabled={pending}
                label="Público"
                name="audience"
                options={AUDIENCE_OPTIONS}
                required
              />
              <div>
                <p className="mb-2 text-sm font-semibold text-foreground">Canais *</p>
                <div className="grid gap-3 sm:grid-cols-3">
                  <ChannelCheckbox
                    control={form.control}
                    disabled={pending}
                    label="In-app"
                    name="in_app"
                  />
                  {pushAvailable ? (
                    <ChannelCheckbox
                      control={form.control}
                      disabled={pending}
                      label="Push"
                      name="push"
                    />
                  ) : null}
                  {emailVisible ? (
                    <ChannelCheckbox
                      control={form.control}
                      disabled={pending || !emailAvailable}
                      label="E-mail"
                      name="email"
                    />
                  ) : null}
                </div>
                <span className="mt-1 block min-h-5 text-xs font-medium text-danger">
                  {form.formState.errors.in_app?.message || ""}
                </span>
                {unavailableEmail ? (
                  <p className="rounded-2xl border border-border bg-surface-muted p-3 text-xs font-bold text-muted">
                    {unavailableEmail}
                  </p>
                ) : null}
                {unavailablePush ? (
                  <p className="mt-2 rounded-2xl border border-border bg-surface-muted p-3 text-xs font-bold text-muted">
                    {unavailablePush}
                  </p>
                ) : null}
              </div>
              <InputController<NotificationFormValues>
                disabled={pending}
                label="Destino interno opcional"
                name="redirect"
                placeholder="/app/comunidades"
              />
              <InputController<NotificationFormValues>
                disabled={pending || intent !== "schedule"}
                label="Data de agendamento"
                name="scheduled_at"
                type="datetime-local"
              />
            </div>
            <aside className="space-y-4">
              <div className="rounded-2xl border border-border bg-surface-muted p-4">
                <p className="text-sm font-black text-foreground">Prévia</p>
                <div className="mt-3 rounded-2xl border border-border bg-surface p-4 shadow-control">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-primary">
                    Lectum
                  </p>
                  <h3 className="mt-2 text-lg font-black text-foreground">
                    {preview.title || "Título da notificação"}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-muted">
                    {preview.body || "Mensagem que será enviada aos usuários selecionados."}
                  </p>
                </div>
              </div>
              <div className="rounded-2xl border border-border bg-surface-muted p-4 text-sm leading-6 text-muted">
                <p className="font-black text-foreground">Resumo do envio</p>
                <ul className="mt-2 space-y-1">
                  <li>Público: {preview.audience ? audienceLabel(preview.audience) : "—"}</li>
                  <li>Canais: {previewChannels.length > 0 ? previewChannels.join(" + ") : "—"}</li>
                  {preview.email && emailAvailable ? (
                    <li>Assunto do e-mail: {preview.title || "título da notificação"}</li>
                  ) : null}
                  <li>Destino: {preview.redirect || "não informado"}</li>
                </ul>
              </div>
              <div className="grid gap-3">
                <button
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-control border border-border bg-surface px-4 text-sm font-black text-foreground transition hover:border-border-strong disabled:opacity-60"
                  disabled={pending}
                  onClick={() => submitWithIntent("draft")}
                  type="button"
                >
                  <CopyCheck aria-hidden className="h-4 w-4" />
                  Salvar rascunho
                </button>
                <button
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-control border border-border bg-surface px-4 text-sm font-black text-foreground transition hover:border-border-strong disabled:opacity-60"
                  disabled={pending}
                  onClick={() => submitWithIntent("schedule")}
                  type="button"
                >
                  <Clock3 aria-hidden className="h-4 w-4" />
                  Agendar
                </button>
                <button
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-control bg-primary px-4 text-sm font-black text-primary-foreground shadow-admin-soft transition hover:bg-primary-hover disabled:opacity-60"
                  disabled={pending}
                  onClick={() => submitWithIntent("send_now")}
                  type="button"
                >
                  {pending ? (
                    <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send aria-hidden className="h-4 w-4" />
                  )}
                  Enviar agora
                </button>
              </div>
            </aside>
          </form>
        </FormProvider>
      </CardShell>
    </div>
  );
};
