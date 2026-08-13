"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle, CreditCard, Gift, Loader2, Wallet, X } from "lucide-react";
import { useState } from "react";
import { FormProvider, type SubmitHandler, useForm } from "react-hook-form";
import { toast } from "sonner";
import {
  useAdminPsychologistCancelSubscription,
  useAdminPsychologistRevokeCourtesy,
} from "@/api/callers/psychologists";
import { resolveApiError } from "@/api/handle";
import type { AdminPsychologistBilling, AdminPsychologistDetail } from "@/api/req/psychologists";
import { InputController, TextareaController } from "@/components/controllers";
import { useAdminDialogLifecycle } from "@/hooks/use-admin-dialog-lifecycle";
import { cn } from "@/lib/utils";
import { Badge, CardShell, IconCircle } from "../../components/shared";
import { CARD, numberFormatter, SUBSCRIPTION_CANCEL_CONFIRMATION } from "../../support/config";
import { formatDate } from "../../support/date-period";
import {
  formatCrpRegion,
  formatGrantedByName,
  formatMoney,
  formatPaymentMethod,
  formatPlanPrice,
} from "../../support/formatters";
import type { SubscriptionCancelFormValues } from "../../support/schemas";
import { subscriptionCancelSchema } from "../../support/schemas";
import { FieldRow } from "../general/index";

const PaymentHistoryBadge = ({
  status,
  label,
}: {
  label: string;
  status: AdminPsychologistBilling["payment_history"]["items"][number]["status"];
}) => {
  const className =
    status === "pago"
      ? "bg-success-soft text-success"
      : status === "recusado" || status === "cancelado"
        ? "bg-danger-soft text-danger"
        : status === "pendente"
          ? "bg-warning-soft text-warning"
          : "bg-surface-muted text-muted";

  return <Badge className={className}>{label}</Badge>;
};

export const BillingLoadingState = () => (
  <div className="grid gap-5 xl:grid-cols-2" data-psychologist-billing-loading="true">
    <div className={cn(CARD, "h-72 animate-pulse bg-surface-muted")} />
    <div className={cn(CARD, "h-72 animate-pulse bg-surface-muted")} />
    <div className={cn(CARD, "h-96 animate-pulse bg-surface-muted xl:col-span-2")} />
  </div>
);

export const isCurrentCourtesyPlan = (billing: AdminPsychologistBilling) =>
  billing.plan.is_courtesy || billing.plan.source === "admin_grant" || billing.courtesy.can_revoke;

export const isCurrentFreePlan = (billing: AdminPsychologistBilling) => {
  const planSlug = billing.plan.plan_slug?.trim().toLowerCase();
  const planName = billing.plan.plan_name?.trim().toLowerCase();

  return Boolean(
    billing.plan.id &&
      !billing.plan.is_courtesy &&
      !billing.courtesy.can_revoke &&
      !billing.plan.is_paid &&
      (planSlug === "gratuito" || planName === "plano gratuito" || billing.plan.price_cents === 0),
  );
};

export const CurrentPlanCard = ({
  billing,
  detail,
  id,
}: {
  billing: AdminPsychologistBilling;
  detail: AdminPsychologistDetail;
  id: string;
}) => {
  const plan = billing.plan;
  const isCourtesy = isCurrentCourtesyPlan(billing);
  const planTitle = isCourtesy ? "Plano de cortesia" : plan.plan_name || "Sem plano ativo";
  const planPrice = isCourtesy ? "R$ 0,00/mês" : formatPlanPrice(plan.price_cents, plan.interval);
  const planEndLabel = isCourtesy ? "Fim" : "Próxima renovação";
  const hasSubscription = Boolean(plan.id);
  const planEndValue = isCurrentFreePlan(billing)
    ? "Não se aplica"
    : formatDate(plan.current_period_end);
  const lifetimeValue = plan.lifetime_value_available
    ? formatMoney(plan.lifetime_value_cents ?? 0)
    : "Indisponível";

  return (
    <CardShell className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground">Plano atual</h2>
        </div>
        <IconCircle icon={Wallet} />
      </div>

      <div className="mt-5 rounded-[1.5rem] border border-primary/10 bg-primary-soft/60 p-4">
        <p className="text-lg font-black text-foreground">{planTitle}</p>
        {planPrice ? <p className="mt-1 text-sm font-bold text-muted">{planPrice}</p> : null}
      </div>

      <dl className="mt-5 divide-y divide-border text-sm">
        <FieldRow label="Inicio" value={formatDate(plan.started_at)} />
        <FieldRow
          label="Tempo até assinatura"
          value={detail.general.subscription.time_to_first_paid_subscription.label}
        />
        <FieldRow label={planEndLabel} value={planEndValue} />
        {hasSubscription ? (
          <>
            <FieldRow
              label="Mensalidades"
              value={numberFormatter.format(plan.paid_installments_count)}
            />
            <FieldRow
              label="Lifetime Value (LTV)"
              value={
                plan.lifetime_value_available || !plan.lifetime_value_unavailable_reason ? (
                  lifetimeValue
                ) : (
                  <span className="flex flex-col gap-1">
                    <span>{lifetimeValue}</span>
                    <span className="text-xs font-bold text-subtle">
                      {plan.lifetime_value_unavailable_reason}
                    </span>
                  </span>
                )
              }
            />
          </>
        ) : null}
      </dl>

      {plan.can_cancel ? <SubscriptionCancelAction billing={billing} id={id} /> : null}
    </CardShell>
  );
};

const SubscriptionCancelAction = ({
  billing,
  id,
}: {
  billing: AdminPsychologistBilling;
  id: string;
}) => {
  const [open, setOpen] = useState(false);
  const mutation = useAdminPsychologistCancelSubscription(id);
  const form = useForm<SubscriptionCancelFormValues>({
    defaultValues: {
      confirmation: "",
      reason: "",
    },
    mode: "onSubmit",
    resolver: zodResolver(subscriptionCancelSchema),
  });
  const plan = billing.plan;
  const planTitle = plan.plan_name || "Plano Profissional";
  const closeModal = () => {
    if (mutation.isPending) return;

    form.reset();
    setOpen(false);
  };
  const dialogRef = useAdminDialogLifecycle(closeModal, {
    closeEnabled: !mutation.isPending,
    enabled: open,
  });

  const onSubmit: SubmitHandler<SubscriptionCancelFormValues> = async (values) => {
    try {
      await mutation.mutateAsync({
        confirmation: values.confirmation.trim().toUpperCase(),
        reason: values.reason.trim(),
      });
      toast.success("Assinatura cancelada com sucesso.");
      form.reset();
      setOpen(false);
    } catch (error) {
      toast.error(resolveApiError(error));
    }
  };

  return (
    <>
      <div className="mt-5 rounded-3xl border border-danger/25 bg-danger/5 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-black text-danger">Cancelar assinatura</h3>
            <p className="mt-1 text-sm font-bold leading-6 text-muted">
              Cancela a recorrência no Mercado Pago e remove o Plano Profissional.
            </p>
          </div>
          <button
            className="inline-flex h-11 items-center justify-center gap-2 rounded-control border border-danger bg-surface px-4 text-sm font-black text-danger transition hover:bg-danger/10 disabled:cursor-not-allowed disabled:border-border disabled:text-muted"
            disabled={mutation.isPending}
            onClick={() => setOpen(true)}
            type="button"
          >
            <AlertTriangle aria-hidden className="h-4 w-4" />
            Cancelar assinatura
          </button>
        </div>
      </div>

      {open ? (
        <div
          aria-labelledby="subscription-cancel-title"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 p-0 sm:items-center sm:p-4"
          ref={dialogRef}
          role="dialog"
          tabIndex={-1}
        >
          <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-[28px] border border-border bg-surface p-5 shadow-admin-soft sm:max-w-2xl sm:rounded-[28px]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-danger">
                  Confirmação forte
                </p>
                <h3
                  className="mt-1 text-xl font-bold text-foreground"
                  id="subscription-cancel-title"
                >
                  Cancelar assinatura
                </h3>
              </div>
              <button
                aria-label="Fechar"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border text-muted transition hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-60"
                disabled={mutation.isPending}
                onClick={closeModal}
                type="button"
              >
                <X aria-hidden className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5 rounded-2xl border border-danger/25 bg-danger/5 p-4 text-sm font-bold leading-6 text-danger">
              Esta ação cancela a recorrência no provedor de pagamento e remove o acesso ao Plano
              Profissional após a confirmação. Use somente quando o cancelamento foi solicitado ou
              aprovado internamente.
            </div>

            <dl className="mt-5 divide-y divide-border rounded-2xl border border-border bg-surface-muted px-4 text-sm">
              <FieldRow label="Plano" value={planTitle} />
              <FieldRow label="Status atual" value={plan.status || "Não informado"} />
              <FieldRow label="Gateway" value={plan.gateway_label || "Mercado Pago"} />
              <FieldRow label="Próxima renovação" value={formatDate(plan.current_period_end)} />
            </dl>

            <FormProvider {...form}>
              <form className="mt-5 space-y-4" noValidate onSubmit={form.handleSubmit(onSubmit)}>
                <TextareaController<SubscriptionCancelFormValues>
                  disabled={mutation.isPending}
                  label="Motivo/observação interna"
                  name="reason"
                  placeholder="Registre por que o Admin está cancelando esta assinatura."
                  required
                  rows={3}
                />
                <InputController<SubscriptionCancelFormValues>
                  autoComplete="off"
                  disabled={mutation.isPending}
                  label={`Digite ${SUBSCRIPTION_CANCEL_CONFIRMATION} para confirmar`}
                  name="confirmation"
                  placeholder={SUBSCRIPTION_CANCEL_CONFIRMATION}
                  required
                />

                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    className="inline-flex h-12 items-center justify-center rounded-control border border-border bg-surface px-4 text-sm font-black text-foreground transition hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={mutation.isPending}
                    onClick={closeModal}
                    type="button"
                  >
                    Manter assinatura
                  </button>
                  <button
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-control bg-danger px-4 text-sm font-black text-primary-foreground transition hover:bg-danger/90 disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-muted"
                    disabled={mutation.isPending}
                    type="submit"
                  >
                    {mutation.isPending ? (
                      <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
                    ) : (
                      <AlertTriangle aria-hidden className="h-4 w-4" />
                    )}
                    Confirmar cancelamento
                  </button>
                </div>
              </form>
            </FormProvider>
          </div>
        </div>
      ) : null}
    </>
  );
};

export const ActiveCourtesyCard = ({
  billing,
  id,
}: {
  billing: AdminPsychologistBilling;
  id: string;
}) => {
  const revokeMutation = useAdminPsychologistRevokeCourtesy(id);
  const internalNote = billing.plan.grant_notes?.trim() || null;

  const onRevoke = async () => {
    const confirmed = window.confirm("Confirmar revogação da cortesia deste psicólogo?");
    if (!confirmed) return;

    try {
      await revokeMutation.mutateAsync();
      toast.success("Cortesia revogada com sucesso.");
    } catch (error) {
      toast.error(resolveApiError(error));
    }
  };

  return (
    <CardShell className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground">Cortesia ativa</h2>
          <p className="mt-1 text-sm text-muted">
            Dados usados para a concessão administrativa vigente.
          </p>
        </div>
        <IconCircle icon={Gift} />
      </div>

      <dl className="mt-5 divide-y divide-border text-sm">
        <FieldRow label="Regional CRP" value={formatCrpRegion(billing.courtesy.regional_crp)} />
        <FieldRow
          label="CRP"
          value={billing.courtesy.registration_number || billing.courtesy.crp || "Não informado"}
        />
        <FieldRow
          label="Data inscrição CRP"
          value={formatDate(billing.courtesy.crp_registration_date)}
        />
        <FieldRow label="Concedida por" value={formatGrantedByName(billing.plan.granted_by)} />
        <FieldRow
          label="Nota interna"
          value={
            internalNote ? (
              <span className="whitespace-pre-line">{internalNote}</span>
            ) : (
              "Não informada"
            )
          }
        />
      </dl>

      <button
        className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-control border border-danger bg-surface px-4 text-sm font-black text-danger transition hover:bg-danger/10 disabled:cursor-not-allowed disabled:border-border disabled:text-muted"
        disabled={!billing.courtesy.can_revoke || revokeMutation.isPending}
        onClick={() => void onRevoke()}
        type="button"
      >
        {revokeMutation.isPending ? (
          <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
        ) : (
          <AlertTriangle aria-hidden className="h-4 w-4" />
        )}
        Revogar cortesia
      </button>
    </CardShell>
  );
};

export const PaymentMethodCard = ({ billing }: { billing: AdminPsychologistBilling }) => (
  <CardShell className="p-5">
    <div className="flex items-start justify-between gap-4">
      <div>
        <h2 className="text-xl font-bold text-foreground">Forma de pagamento</h2>
        <p className="mt-1 text-sm text-muted">Somente brand, final e validade quando existirem.</p>
      </div>
      <IconCircle icon={CreditCard} />
    </div>

    <div className="mt-5 rounded-[1.5rem] border border-border bg-surface-muted p-4">
      {billing.payment_method ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-lg font-black text-foreground">
              {formatPaymentMethod(billing.payment_method)}
            </p>
            <p className="mt-1 text-sm font-bold text-muted">Dados exibidos de forma mascarada.</p>
          </div>
          <Badge className="bg-success-soft text-success">Mascarado</Badge>
        </div>
      ) : (
        <p className="text-sm font-bold text-muted">
          Nenhuma forma de pagamento vinculada foi encontrada para exibição segura.
        </p>
      )}
    </div>

    <p className="mt-4 text-xs font-bold text-subtle">
      Credenciais de pagamento e dados sensíveis do cartão não são exibidos.
    </p>
  </CardShell>
);

export const PaymentHistoryCard = ({ billing }: { billing: AdminPsychologistBilling }) => (
  <CardShell className="p-5 xl:col-span-2">
    <h2 className="text-xl font-bold text-foreground">Histórico de pagamentos</h2>

    {!billing.payment_history.available ? (
      <div className="mt-5 rounded-2xl border border-dashed border-border bg-surface-muted p-4 text-sm font-bold text-muted">
        {billing.payment_history.reason ||
          "Histórico financeiro indisponível para este psicólogo no momento."}
      </div>
    ) : (
      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[680px] text-left text-sm">
          <thead className="border-b border-border text-xs text-muted">
            <tr>
              <th className="py-3 pr-3 font-black">Data</th>
              <th className="px-3 py-3 font-black">Descrição</th>
              <th className="px-3 py-3 font-black">Valor</th>
              <th className="px-3 py-3 font-black">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {billing.payment_history.items.map((item) => (
              <tr key={item.id}>
                <td className="py-3 pr-3 font-bold text-muted">{formatDate(item.occurred_at)}</td>
                <td className="px-3 py-3">
                  <p className="font-black text-foreground">{item.title}</p>
                  <p className="text-xs font-bold text-muted">{item.description}</p>
                </td>
                <td className="px-3 py-3 font-black text-foreground">
                  {formatMoney(item.amount_cents)}
                </td>
                <td className="px-3 py-3">
                  <PaymentHistoryBadge label={item.status_label} status={item.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </CardShell>
);
