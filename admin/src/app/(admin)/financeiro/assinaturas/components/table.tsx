"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { Fragment, useState } from "react";
import type { FinanceSubscriptionItem } from "@/api/req/finance";
import { formatFinanceSubscriptionCode } from "@/lib/finance-operational-code";
import { cn } from "@/lib/utils";
import { formatDate, formatMoney, formatNextChargeDate } from "../modules/subscription-support";
import {
  IdentifierLine,
  InitialsAvatar,
  PaymentHealthBadge,
  PaymentHealthDetails,
  StatusBadge,
} from "./payment-details";

export const pageNumbers = (current: number, pages: number) => {
  const window = new Set([1, pages, current - 1, current, current + 1, current + 2]);

  return [...window]
    .filter((value) => value >= 1 && value <= pages)
    .sort((left, right) => left - right);
};

export const SubscriptionsTable = ({ items }: { items: FinanceSubscriptionItem[] }) => {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());
  const toggleExpanded = (id: string) => {
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);

      return next;
    });
  };

  const isExpanded = (id: string) => expandedIds.has(id);

  return (
    <>
      <div className="grid gap-3 p-4 lg:hidden">
        {items.map((item) => {
          const expanded = isExpanded(item.id);
          const detailsId = `subscription-payment-history-${item.id}`;

          return (
            <article className="rounded-3xl border border-border bg-surface p-4" key={item.id}>
              <div className="flex items-start gap-3">
                <InitialsAvatar name={item.psychologist.name} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="truncate font-black text-foreground">
                      {item.psychologist.name}
                    </h3>
                    <StatusBadge item={item} />
                  </div>
                  <p className="truncate text-xs font-bold text-muted">{item.psychologist.email}</p>
                  <IdentifierLine
                    className="mt-2"
                    label="ID"
                    value={formatFinanceSubscriptionCode(item.internal_id)}
                  />
                  <div className="mt-3">
                    <PaymentHealthBadge health={item.payment_health} />
                  </div>
                  <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <dt className="font-semibold text-muted">Valor</dt>
                      <dd className="mt-1 font-bold text-foreground">
                        {formatMoney(item.plan.price_cents)}
                      </dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-muted">Início</dt>
                      <dd className="mt-1 font-bold text-foreground">
                        {formatDate(item.started_at)}
                      </dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-muted">Próxima</dt>
                      <dd className="mt-1 font-bold text-foreground">
                        {formatNextChargeDate(item)}
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>
              <button
                aria-controls={detailsId}
                aria-expanded={expanded}
                className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full border border-border bg-surface px-4 text-sm font-black text-foreground shadow-control transition hover:border-primary hover:text-primary"
                onClick={() => toggleExpanded(item.id)}
                type="button"
              >
                <ChevronRight
                  aria-hidden
                  className={cn("h-4 w-4 transition-transform", expanded && "rotate-90")}
                />
                {expanded ? "Ocultar histórico" : "Ver histórico de pagamentos"}
              </button>
              {expanded ? (
                <div className="mt-4" id={detailsId}>
                  <PaymentHealthDetails item={item} />
                </div>
              ) : null}
            </article>
          );
        })}
      </div>

      <div className="hidden overflow-x-auto lg:block">
        <table className="w-full min-w-[1160px] text-left text-sm">
          <caption className="sr-only">Relação de assinaturas do plano profissional</caption>
          <thead className="border-b border-border text-xs font-bold uppercase tracking-[0.08em] text-muted">
            <tr>
              <th className="w-12 px-5 py-4">
                <span className="sr-only">Expandir</span>
              </th>
              <th className="px-5 py-4">ID</th>
              <th className="px-5 py-4">Psicólogo</th>
              <th className="px-5 py-4">Início</th>
              <th className="px-5 py-4">Próxima</th>
              <th className="px-5 py-4">Valor</th>
              <th className="px-5 py-4">Status</th>
              <th className="px-5 py-4">Confiabilidade Pgto</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {items.map((item) => {
              const expanded = isExpanded(item.id);
              const detailsId = `subscription-payment-history-${item.id}`;

              return (
                <Fragment key={item.id}>
                  <tr className="transition hover:bg-primary-soft/35">
                    <td className="px-5 py-4">
                      <button
                        aria-controls={detailsId}
                        aria-expanded={expanded}
                        className="grid h-9 w-9 place-items-center rounded-2xl border border-border bg-surface text-foreground shadow-control transition hover:border-primary hover:text-primary"
                        onClick={() => toggleExpanded(item.id)}
                        type="button"
                      >
                        <ChevronRight
                          aria-hidden
                          className={cn("h-4 w-4 transition-transform", expanded && "rotate-90")}
                        />
                        <span className="sr-only">
                          {expanded ? "Ocultar histórico" : "Ver histórico"} de{" "}
                          {item.psychologist.name}
                        </span>
                      </button>
                    </td>
                    <td className="max-w-[190px] px-5 py-4">
                      <IdentifierLine
                        label="ID"
                        value={formatFinanceSubscriptionCode(item.internal_id)}
                      />
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex min-w-0 items-center gap-3">
                        <InitialsAvatar name={item.psychologist.name} />
                        <div className="min-w-0">
                          <Link
                            className="truncate font-black text-foreground transition hover:text-primary"
                            href={item.detail_url}
                          >
                            {item.psychologist.name}
                          </Link>
                          <p className="truncate text-xs text-muted">{item.psychologist.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-muted">
                      {formatDate(item.started_at)}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-muted">
                      {formatNextChargeDate(item)}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 font-black text-foreground">
                      {formatMoney(item.plan.price_cents)}
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge item={item} />
                    </td>
                    <td className="max-w-[260px] px-5 py-4">
                      <PaymentHealthBadge health={item.payment_health} />
                    </td>
                  </tr>
                  {expanded ? (
                    <tr className="bg-primary-soft/15">
                      <td className="px-5 py-5" colSpan={8} id={detailsId}>
                        <PaymentHealthDetails item={item} />
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
};
