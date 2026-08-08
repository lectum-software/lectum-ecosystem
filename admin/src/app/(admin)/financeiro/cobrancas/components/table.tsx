"use client";

import { CreditCard } from "lucide-react";
import type { FinanceChargeItem } from "@/api/req/finance";
import { AdminQueryErrorState } from "@/components/admin-shell/query-error-state";
import {
  formatFinanceChargeCode,
  formatFinanceSubscriptionCode,
} from "@/lib/finance-operational-code";
import { cn } from "@/lib/utils";

import { formatDateTime, formatMoney } from "../modules/charge-support";

export const InitialsAvatar = ({ name }: { name: string }) => {
  const initials =
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "CB";

  return (
    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-primary-soft text-sm font-black text-primary">
      {initials}
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

export const ChargeSubscriptionIdentifier = ({ item }: { item: FinanceChargeItem }) => {
  if (!item.subscription) {
    return <IdentifierLine label="ID da assinatura" value="—" />;
  }

  return (
    <IdentifierLine
      label="ID da assinatura"
      value={formatFinanceSubscriptionCode(item.subscription.internal_id)}
    />
  );
};

export const ErrorState = ({ message, onRetry }: { message: string; onRetry: () => void }) => (
  <AdminQueryErrorState
    message={message}
    onRetry={onRetry}
    title="Não foi possível carregar as cobranças"
  />
);

export const LoadingState = () => (
  <div className="space-y-4 p-4">
    {["charge-loading-1", "charge-loading-2", "charge-loading-3"].map((key) => (
      <div className="h-24 animate-pulse rounded-3xl bg-surface-muted" key={key} />
    ))}
  </div>
);

export const EmptyState = () => (
  <div className="rounded-3xl border border-dashed border-border bg-surface-muted p-8 text-center">
    <CreditCard aria-hidden className="mx-auto h-10 w-10 text-primary" />
    <h2 className="mt-3 text-lg font-semibold text-foreground">
      Nenhuma cobrança confirmada encontrada
    </h2>
    <p className="mt-1 text-sm text-muted">
      A lista considera somente cobranças confirmadas pelo Mercado Pago.
    </p>
  </div>
);

export const pageNumbers = (current: number, pages: number) => {
  const window = new Set([1, pages, current - 1, current, current + 1, current + 2]);

  return [...window]
    .filter((value) => value >= 1 && value <= pages)
    .sort((left, right) => left - right);
};

export const ChargesTable = ({ items }: { items: FinanceChargeItem[] }) => (
  <>
    <div className="grid gap-3 p-4 lg:hidden">
      {items.map((item) => (
        <article className="rounded-3xl border border-border bg-surface p-4" key={item.event_id}>
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
                {item.subscription?.psychologist.email ?? "Sem vínculo local"}
              </p>
              <IdentifierLine
                className="mt-2"
                label="ID"
                value={formatFinanceChargeCode(item.internal_id)}
              />
              <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <dt className="font-semibold text-muted">Data</dt>
                  <dd className="mt-1 font-bold text-foreground">
                    {formatDateTime(item.occurred_at)}
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold text-muted">Valor</dt>
                  <dd className="mt-1 font-bold text-foreground">
                    {formatMoney(item.amount_cents)}
                  </dd>
                </div>
                <div className="col-span-2">
                  <dt className="font-semibold text-muted">Assinatura</dt>
                  <dd className="mt-1">
                    <ChargeSubscriptionIdentifier item={item} />
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </article>
      ))}
    </div>

    <div className="hidden overflow-x-auto lg:block">
      <table className="w-full min-w-[1080px] text-left text-sm">
        <caption className="sr-only">Relação completa de cobranças confirmadas</caption>
        <thead className="border-b border-border text-xs font-bold uppercase tracking-[0.08em] text-muted">
          <tr>
            <th className="px-5 py-4">Data</th>
            <th className="px-5 py-4">ID</th>
            <th className="px-5 py-4">Psicólogo</th>
            <th className="px-5 py-4">Assinatura</th>
            <th className="px-5 py-4">Valor</th>
            <th className="px-5 py-4">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {items.map((item) => (
            <tr className="transition hover:bg-primary-soft/35" key={item.event_id}>
              <td className="whitespace-nowrap px-5 py-4 text-muted">
                {formatDateTime(item.occurred_at)}
              </td>
              <td className="max-w-[210px] px-5 py-4">
                <IdentifierLine label="ID" value={formatFinanceChargeCode(item.internal_id)} />
              </td>
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
                <ChargeSubscriptionIdentifier item={item} />
              </td>
              <td className="whitespace-nowrap px-5 py-4 font-black text-foreground">
                {formatMoney(item.amount_cents)}
              </td>
              <td className="px-5 py-4">
                <ChargeStatusBadge item={item} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </>
);
