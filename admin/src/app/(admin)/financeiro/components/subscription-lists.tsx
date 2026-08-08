"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import type {
  AdminFinanceDashboard,
  FinanceChargeItem,
  FinancePaymentHealth,
  FinanceSubscriptionItem,
} from "@/api/req/finance";
import { cn } from "@/lib/utils";
import {
  detailsHref,
  formatDate,
  formatDateTime,
  formatMaybeMoney,
  formatMoney,
  formatNextChargeDate,
  numberFormatter,
} from "../modules/finance-support";
import { CardShell } from "./metrics";

export const StatusBadge = ({ item }: { item: FinanceSubscriptionItem }) => (
  <span
    className={cn(
      "inline-flex rounded-full px-2 py-1 text-xs font-black",
      item.status === "ativa" && "bg-success-soft text-success",
      item.status === "cancelada" && "bg-danger-soft text-danger",
      item.status === "inadimplente" && "bg-warning-soft text-warning",
      !["ativa", "cancelada", "inadimplente"].includes(item.status) &&
        "bg-surface-muted text-muted",
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

export const InitialsAvatar = ({ name }: { name: string }) => {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return (
    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-primary-soft text-sm font-black text-primary">
      {initials || "PS"}
    </span>
  );
};

export const ChargeStatusBadge = ({ item }: { item: FinanceChargeItem }) => (
  <span
    className={cn(
      "inline-flex rounded-full px-2 py-1 text-xs font-black",
      item.amount_available ? "bg-success-soft text-success" : "bg-warning-soft text-warning",
    )}
  >
    {item.status_label}
  </span>
);

export const formatChargeSubscriptionPlanState = (item: FinanceChargeItem) => {
  if (!item.subscription) return "—";
  if (item.subscription.status === "ativa") return "Ativo";

  return item.subscription.status_label;
};

export const LatestCharges = ({ dashboard }: { dashboard: AdminFinanceDashboard }) => (
  <CardShell className="overflow-hidden">
    <div className="flex flex-col gap-2 border-b border-border p-5 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 className="text-xl font-black text-foreground">Últimas cobranças realizadas</h2>
        <p className="mt-1 text-sm text-muted">
          Mostrando {numberFormatter.format(dashboard.latest_charges.items.length)} de{" "}
          {numberFormatter.format(dashboard.latest_charges.total)} cobranças confirmadas no período.
        </p>
      </div>
      <Link
        className="inline-flex h-10 w-fit items-center justify-center gap-2 rounded-full bg-primary-soft px-4 text-sm font-black text-primary transition hover:bg-primary/10"
        href={detailsHref("/financeiro/cobrancas", dashboard)}
      >
        Ver todas
        <ArrowRight aria-hidden className="h-4 w-4" />
      </Link>
    </div>

    <div className="grid gap-3 p-4 lg:hidden">
      {dashboard.latest_charges.items.map((item) => (
        <article className="rounded-2xl border border-border p-4" key={item.event_id}>
          <div className="flex items-start gap-3">
            <InitialsAvatar name={item.subscription?.psychologist.name ?? "Cobrança"} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="truncate font-black text-foreground">
                  {item.subscription?.psychologist.name ?? "Assinatura não vinculada"}
                </h3>
                <ChargeStatusBadge item={item} />
              </div>
              <p className="truncate text-xs font-bold text-muted">
                {item.subscription?.psychologist.email ?? item.external_id}
              </p>
              <p className="mt-2 text-sm font-bold text-foreground">
                {formatMaybeMoney(item.amount_cents)} · {formatDateTime(item.occurred_at)}
              </p>
              <p className="text-xs text-muted">
                {item.subscription?.plan.name ?? "Plano não identificado"} ·{" "}
                {formatChargeSubscriptionPlanState(item)}
              </p>
            </div>
          </div>
        </article>
      ))}
      {dashboard.latest_charges.items.length === 0 ? (
        <p className="rounded-2xl bg-surface-muted p-4 text-sm text-muted">
          Nenhuma cobrança confirmada foi registrada neste período.
        </p>
      ) : null}
    </div>

    <div className="hidden overflow-x-auto lg:block">
      <table className="w-full min-w-[820px] text-left text-sm">
        <caption className="sr-only">Últimas cobranças confirmadas no período</caption>
        <thead className="text-xs text-muted">
          <tr>
            <th className="px-5 py-3 font-black">Data</th>
            <th className="px-5 py-3 font-black">Psicólogo</th>
            <th className="px-5 py-3 font-black">Plano</th>
            <th className="px-5 py-3 font-black">Valor</th>
            <th className="px-5 py-3 font-black">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {dashboard.latest_charges.items.map((item) => (
            <tr key={item.event_id}>
              <td className="px-5 py-4 text-muted">{formatDateTime(item.occurred_at)}</td>
              <td className="px-5 py-4">
                <div className="flex min-w-0 items-center gap-3">
                  <InitialsAvatar name={item.subscription?.psychologist.name ?? "Cobrança"} />
                  <div className="min-w-0">
                    <p className="truncate font-black text-foreground">
                      {item.subscription?.psychologist.name ?? "Assinatura não vinculada"}
                    </p>
                    <p className="truncate text-xs text-muted">
                      {item.subscription?.psychologist.email ?? "Sem vínculo local"}
                    </p>
                  </div>
                </div>
              </td>
              <td className="px-5 py-4">
                <p className="font-black text-foreground">
                  {item.subscription?.plan.name ?? "Não identificada"}
                </p>
                <p className="text-xs text-muted">{formatChargeSubscriptionPlanState(item)}</p>
              </td>
              <td className="px-5 py-4 font-black text-foreground">
                {formatMaybeMoney(item.amount_cents)}
              </td>
              <td className="px-5 py-4">
                <ChargeStatusBadge item={item} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {dashboard.latest_charges.items.length === 0 ? (
        <p className="p-5 text-sm text-muted">
          Nenhuma cobrança confirmada foi registrada neste período.
        </p>
      ) : null}
    </div>
  </CardShell>
);

export const SubscriptionRelation = ({ dashboard }: { dashboard: AdminFinanceDashboard }) => (
  <CardShell className="overflow-hidden">
    <div className="flex flex-col gap-2 border-b border-border p-5 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 className="text-xl font-black text-foreground">Assinaturas</h2>
        <p className="mt-1 text-sm text-muted">
          Mostrando {numberFormatter.format(dashboard.subscription_relation.items.length)} de{" "}
          {numberFormatter.format(dashboard.subscription_relation.total)} assinaturas pagas do
          período.
        </p>
      </div>
      <Link
        className="inline-flex h-10 w-fit items-center justify-center gap-2 rounded-full bg-primary-soft px-4 text-sm font-black text-primary transition hover:bg-primary/10"
        href={detailsHref("/financeiro/assinaturas", dashboard)}
      >
        Ver todas
        <ArrowRight aria-hidden className="h-4 w-4" />
      </Link>
    </div>

    <div className="grid gap-3 p-4 lg:hidden">
      {dashboard.subscription_relation.items.map((item) => (
        <article className="rounded-2xl border border-border p-4" key={item.id}>
          <div className="flex items-start gap-3">
            <InitialsAvatar name={item.psychologist.name} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="truncate font-black text-foreground">{item.psychologist.name}</h3>
                <StatusBadge item={item} />
              </div>
              <p className="truncate text-xs font-bold text-muted">{item.psychologist.email}</p>
              <p className="mt-2 text-sm font-bold text-foreground">
                Valor {formatMoney(item.plan.price_cents)}
              </p>
              <div className="mt-3">
                <PaymentHealthBadge health={item.payment_health} />
              </div>
              <p className="text-xs text-muted">
                Início {formatDate(item.started_at)} · Próxima {formatNextChargeDate(item)}
              </p>
            </div>
          </div>
        </article>
      ))}
      {dashboard.subscription_relation.items.length === 0 ? (
        <p className="rounded-2xl bg-surface-muted p-4 text-sm text-muted">
          Nenhuma assinatura paga foi encontrada neste período.
        </p>
      ) : null}
    </div>

    <div className="hidden overflow-x-auto lg:block">
      <table className="w-full min-w-[980px] text-left text-sm">
        <caption className="sr-only">Assinaturas pagas no período</caption>
        <thead className="text-xs text-muted">
          <tr>
            <th className="px-5 py-3 font-black">Psicólogo</th>
            <th className="px-5 py-3 font-black">Início</th>
            <th className="px-5 py-3 font-black">Próxima</th>
            <th className="px-5 py-3 font-black">Valor</th>
            <th className="px-5 py-3 font-black">Status</th>
            <th className="px-5 py-3 font-black">Confiabilidade Pgto</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {dashboard.subscription_relation.items.map((item) => (
            <tr key={item.id}>
              <td className="px-5 py-4">
                <div className="flex min-w-0 items-center gap-3">
                  <InitialsAvatar name={item.psychologist.name} />
                  <div className="min-w-0">
                    <p className="truncate font-black text-foreground">{item.psychologist.name}</p>
                    <p className="truncate text-xs text-muted">{item.psychologist.email}</p>
                  </div>
                </div>
              </td>
              <td className="px-5 py-4 text-muted">{formatDate(item.started_at)}</td>
              <td className="px-5 py-4 text-muted">{formatNextChargeDate(item)}</td>
              <td className="px-5 py-4 font-black text-foreground">
                {formatMoney(item.plan.price_cents)}
              </td>
              <td className="px-5 py-4">
                <StatusBadge item={item} />
              </td>
              <td className="max-w-[260px] px-5 py-4">
                <PaymentHealthBadge health={item.payment_health} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {dashboard.subscription_relation.items.length === 0 ? (
        <p className="p-5 text-sm text-muted">
          Nenhuma assinatura paga foi encontrada neste período.
        </p>
      ) : null}
    </div>
  </CardShell>
);
