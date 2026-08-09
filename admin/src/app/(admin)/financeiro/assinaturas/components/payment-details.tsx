"use client";

import { CreditCard, UsersRound } from "lucide-react";
import type { ReactNode } from "react";
import type {
  FinancePaymentHealth,
  FinancePaymentHistoryItem,
  FinancePaymentHistoryStatus,
  FinancePaymentMethod,
  FinanceSubscriptionItem,
} from "@/api/req/finance";
import { AdminQueryErrorState } from "@/components/admin-shell/query-error-state";
import { formatFinanceChargeCode } from "@/lib/finance-operational-code";
import { cn } from "@/lib/utils";

import {
  formatCancellationDate,
  formatCardExpiration,
  formatCardLabel,
  formatDate,
  formatDateTime,
  formatNullableDate,
  formatNullableMoney,
  formatPercent,
  numberFormatter,
  shouldShowCancellationMetric,
} from "../modules/subscription-support";

import { hiddenHealthNotePrefixes } from "./filters";

export const InitialsAvatar = ({ name }: { name: string }) => {
  const initials =
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "PS";

  return (
    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-primary-soft text-sm font-black text-primary">
      {initials}
    </span>
  );
};

export const statusClassName = {
  ativa: "bg-success-soft text-success",
  cancelada: "bg-danger-soft text-danger",
  inadimplente: "bg-warning-soft text-warning",
  inativa: "bg-surface-muted text-muted",
} as const;

export const StatusBadge = ({ item }: { item: FinanceSubscriptionItem }) => (
  <span
    className={cn(
      "inline-flex rounded-full px-2 py-1 text-xs font-black",
      statusClassName[item.status as keyof typeof statusClassName] ?? "bg-surface-muted text-muted",
    )}
  >
    {item.status_label}
  </span>
);

export const paymentHealthClassName: Record<FinancePaymentHealth["status"], string> = {
  attention: "border-warning-border bg-warning-soft text-warning",
  critical: "border-danger/20 bg-danger/5 text-danger",
  healthy: "border-success-border bg-success-soft text-success",
  insufficient_history: "border-border bg-surface-muted text-muted",
  risk: "border-warning-border bg-warning-soft text-warning",
};

export const paymentHistoryStatusClassName: Record<FinancePaymentHistoryStatus, string> = {
  failed: "border-danger/20 bg-danger/5 text-danger",
  pending: "border-warning-border bg-warning-soft text-warning",
  processed: "border-border bg-surface-muted text-muted",
  successful: "border-success-border bg-success-soft text-success",
};

export const PaymentHealthBadge = ({ health }: { health: FinancePaymentHealth }) => (
  <span
    className={cn(
      "inline-flex max-w-full items-center rounded-full border px-3 py-1.5 text-xs font-black leading-none",
      paymentHealthClassName[health.status],
    )}
    title={health.summary}
  >
    {health.label}
  </span>
);

export const PaymentHistoryStatusBadge = ({ item }: { item: FinancePaymentHistoryItem }) => (
  <span
    className={cn(
      "inline-flex rounded-full border px-2 py-1 text-xs font-black",
      paymentHistoryStatusClassName[item.status],
    )}
  >
    {item.status_label}
  </span>
);

export const IdentifierLine = ({
  className,
  label,
  value,
}: {
  className?: string;
  label: string;
  value: number | string;
}) => (
  <p
    className={cn("min-w-0 break-all text-sm font-semibold leading-5 text-foreground", className)}
    title={String(value)}
  >
    <span className="sr-only">{label} </span>
    {value}
  </p>
);

export const HealthMetric = ({ label, value }: { label: string; value: ReactNode }) => (
  <div className="rounded-3xl border border-border bg-surface px-4 py-3">
    <dt className="text-xs font-semibold text-muted">{label}</dt>
    <dd className="mt-1 text-sm font-black text-foreground">{value}</dd>
  </div>
);

export const SavedPaymentMethodCard = ({
  className,
  method,
}: {
  className?: string;
  method: FinancePaymentMethod | null;
}) => (
  <div className={cn("mt-4 rounded-3xl border border-border bg-surface p-4", className)}>
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex min-w-0 gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-primary-soft text-primary">
          <CreditCard aria-hidden className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-primary">
            Dados do cartão salvo
          </p>
          {method ? (
            <>
              <h4 className="mt-1 text-base font-black text-foreground">
                {formatCardLabel(method)}
              </h4>
              <p className="mt-1 text-sm font-semibold text-muted">
                {formatCardExpiration(method)}
                {method.saved_at ? ` · Salvo em ${formatDate(method.saved_at)}` : ""}
              </p>
            </>
          ) : (
            <>
              <h4 className="mt-1 text-base font-black text-foreground">
                Nenhum cartão salvo encontrado
              </h4>
              <p className="mt-1 text-sm font-semibold text-muted">
                Não há bandeira, final ou validade seguros salvos para este psicólogo.
              </p>
            </>
          )}
        </div>
      </div>
      {method ? (
        <span className="inline-flex w-fit rounded-full border border-border bg-surface-muted px-3 py-1 text-xs font-black text-muted">
          {method.matches_subscription ? "Vinculado à assinatura" : "Último cartão salvo"}
        </span>
      ) : null}
    </div>
  </div>
);

export const PaymentHistoryRow = ({ item }: { item: FinancePaymentHistoryItem }) => (
  <li className="rounded-3xl border border-border bg-surface p-4">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-black text-foreground">{item.title}</p>
          <PaymentHistoryStatusBadge item={item} />
        </div>
        <p className="mt-1 text-xs font-semibold text-muted">
          <time dateTime={item.occurred_at}>{formatDateTime(item.occurred_at)}</time>
        </p>
        <IdentifierLine
          className="mt-1"
          label="ID"
          value={formatFinanceChargeCode(item.internal_id)}
        />
      </div>
      <div className="text-left sm:text-right">
        <p className="text-sm font-black text-foreground">
          {formatNullableMoney(item.amount_cents)}
        </p>
      </div>
    </div>
    {item.unavailable_reason ? (
      <p className="mt-3 rounded-2xl border border-warning-border bg-warning-soft px-3 py-2 text-xs font-semibold text-warning">
        Pagamento confirmado, mas sem valor informado pelo provedor.
      </p>
    ) : null}
  </li>
);

export const PaymentHealthDetails = ({ item }: { item: FinanceSubscriptionItem }) => {
  const { payment_health: health, payment_history: history } = item;
  const visibleHealthNotes = health.notes.filter(
    (note) => !hiddenHealthNotePrefixes.some((prefix) => note.startsWith(prefix)),
  );

  return (
    <div className="rounded-3xl border border-primary/10 bg-primary-soft/25 p-4 lg:p-5">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(320px,420px)] lg:items-start">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">
            Confiabilidade do pagamento
          </p>
          <h3 className="mt-1 text-lg font-black text-foreground">{health.summary}</h3>
          <p className="mt-1 max-w-2xl text-sm font-medium leading-6 text-muted">
            A confiabilidade do pagamento resume a estabilidade das cobranças da assinatura.
          </p>
        </div>

        <SavedPaymentMethodCard className="mt-0 lg:justify-self-end" method={item.payment_method} />

        <dl className="grid gap-3 sm:grid-cols-2 lg:col-span-2 lg:grid-cols-4">
          <HealthMetric
            label="Taxa de sucesso"
            value={formatPercent(health.success_rate_percent)}
          />
          <HealthMetric
            label="Tentativas finais"
            value={numberFormatter.format(health.final_attempts)}
          />
          <HealthMetric
            label="Falhas consecutivas"
            value={numberFormatter.format(health.consecutive_failures)}
          />
          <HealthMetric
            label="Dias em atraso"
            value={health.days_overdue === null ? "—" : numberFormatter.format(health.days_overdue)}
          />
          <HealthMetric
            label="Pagamentos aprovados"
            value={numberFormatter.format(health.successful_payments)}
          />
          <HealthMetric
            label="Pagamentos recusados"
            value={numberFormatter.format(health.failed_payments)}
          />
          <HealthMetric label="Pendentes" value={numberFormatter.format(health.pending_payments)} />
          <HealthMetric label="Último sucesso" value={formatNullableDate(health.last_success_at)} />
          <HealthMetric label="Última falha" value={formatNullableDate(health.last_failure_at)} />
          {shouldShowCancellationMetric(item) ? (
            <HealthMetric label="Cancelamento" value={formatCancellationDate(item)} />
          ) : null}
        </dl>

        {visibleHealthNotes.length > 0 ? (
          <ul className="space-y-2 text-xs font-semibold leading-5 text-muted lg:col-span-2">
            {visibleHealthNotes.map((note) => (
              <li className="rounded-2xl bg-surface/80 px-3 py-2" key={note}>
                {note}
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <div className="mt-5">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <h4 className="text-sm font-black text-foreground">Histórico de pagamentos</h4>
        </div>
        {history.available ? (
          <ul className="mt-3 grid gap-3">
            {history.items.map((historyItem) => (
              <PaymentHistoryRow item={historyItem} key={historyItem.event_id} />
            ))}
          </ul>
        ) : (
          <div className="mt-3 rounded-3xl border border-dashed border-border bg-surface p-5 text-sm font-semibold text-muted">
            {history.reason || "Histórico de pagamentos indisponível para esta assinatura."}
          </div>
        )}
      </div>
    </div>
  );
};

export const ErrorState = ({ message, onRetry }: { message: string; onRetry: () => void }) => (
  <AdminQueryErrorState
    message={message}
    onRetry={onRetry}
    title="Não foi possível carregar assinaturas"
  />
);

export const LoadingState = () => (
  <div className="space-y-4 p-4">
    {["subscription-loading-1", "subscription-loading-2", "subscription-loading-3"].map((key) => (
      <div className="h-24 animate-pulse rounded-3xl bg-surface-muted" key={key} />
    ))}
  </div>
);

export const EmptyState = () => (
  <div className="rounded-3xl border border-dashed border-border bg-surface-muted p-8 text-center">
    <UsersRound aria-hidden className="mx-auto h-10 w-10 text-primary" />
    <h2 className="mt-3 text-lg font-semibold text-foreground">
      Nenhuma assinatura paga encontrada
    </h2>
    <p className="mt-1 text-sm text-muted">
      A lista exclui plano gratuito e cortesia administrativa.
    </p>
  </div>
);
