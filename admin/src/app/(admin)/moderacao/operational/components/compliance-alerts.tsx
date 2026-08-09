"use client";

import { ExternalLink, MessageCircle } from "lucide-react";
import Link from "next/link";
import type { AdminModerationOperationalAlert } from "@/api/req/moderation";
import { VerifiedBadgeIcon } from "@/components/admin-icons";
import { cn } from "@/lib/utils";
import {
  formatDateTime,
  formatPendingDuration,
  numberFormatter,
  operationalTypeLabel,
} from "../modules/report-support";
import {
  alertFactValue,
  OperationalGroup,
  resolveComplianceProfileStatus,
  Severity,
} from "./report-common";

export const OperationalAlertCard = ({ alert }: { alert: AdminModerationOperationalAlert }) => {
  const href = alert.action_href ?? alert.entity.href;

  return (
    <article className="rounded-2xl border border-border bg-surface p-4 shadow-control">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap gap-2">
            <OperationalGroup value={alert.group} />
            <Severity value={alert.priority} />
            <span className="rounded-full bg-surface-muted px-2.5 py-1 text-xs font-black text-muted">
              {operationalTypeLabel(alert.type)}
            </span>
          </div>
          <h3 className="mt-3 text-base font-black text-foreground">{alert.title}</h3>
          <p className="mt-1 text-sm leading-6 text-muted">{alert.description}</p>
        </div>
        <p className="shrink-0 text-xs font-black text-muted">{formatDateTime(alert.created_at)}</p>
      </div>
      <div className="mt-3 grid gap-2 text-xs font-bold text-muted sm:grid-cols-2">
        <p>Alvo: {alert.entity.label}</p>
        {alert.community ? <p>Comunidade: {alert.community.name}</p> : null}
        {alert.age_hours !== null ? <p>Idade: {numberFormatter.format(alert.age_hours)}h</p> : null}
      </div>
      {alert.facts.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {alert.facts.map((fact) => (
            <span
              className="rounded-full bg-primary-soft px-2.5 py-1 text-[0.68rem] font-black text-primary"
              key={`${alert.id}-${fact.label}-${fact.value}`}
            >
              {fact.label}: {fact.value}
            </span>
          ))}
        </div>
      ) : null}
      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <span className="inline-flex items-center gap-2 text-xs font-bold text-muted">
          <MessageCircle aria-hidden className="h-4 w-4" />
          Dados consolidados a partir dos registros operacionais.
        </span>
        {href ? (
          <Link
            className="inline-flex h-10 items-center justify-center gap-2 rounded-control border border-border bg-surface px-3 text-xs font-black text-foreground transition hover:border-primary hover:text-primary"
            href={href}
          >
            <ExternalLink aria-hidden className="h-4 w-4" />
            {alert.action_label}
          </Link>
        ) : null}
      </div>
    </article>
  );
};

export const CompliancePendingBadge = ({ alert }: { alert: AdminModerationOperationalAlert }) => (
  <span className="inline-flex max-w-full items-center rounded-full bg-danger/10 px-2.5 py-1 text-xs font-medium text-danger">
    <span className="truncate">{operationalTypeLabel(alert.type)}</span>
  </span>
);

export const ComplianceProfileBadge = ({ alert }: { alert: AdminModerationOperationalAlert }) => {
  const status = resolveComplianceProfileStatus(alert);

  return (
    <span
      className={cn(
        "inline-flex w-fit max-w-full justify-self-start rounded-full px-2.5 py-1 text-xs font-medium",
        status.className,
      )}
    >
      {status.label}
    </span>
  );
};

export const ComplianceAlertRow = ({ alert }: { alert: AdminModerationOperationalAlert }) => {
  const href = alert.action_href ?? alert.entity.href;
  const professionalName = alert.professional?.name ?? alert.user?.name ?? alert.entity.label;
  const professionalRoleLabel =
    alert.professional?.role_label ?? alert.user?.role_label ?? "Psicólogo";
  const showVerifiedBadge = Boolean(alert.professional?.show_verified_badge);
  const plan = alertFactValue(alert, "Plano") || "\u2014";

  return (
    <tr className="border-t border-border/80 text-sm text-foreground transition hover:bg-primary-soft/30">
      <td className="px-5 py-4 align-middle">
        <CompliancePendingBadge alert={alert} />
      </td>
      <td className="px-5 py-4 align-middle text-xs font-normal text-muted">
        <time
          dateTime={alert.created_at}
          title={`Pendente desde ${formatDateTime(alert.created_at)}`}
        >
          {formatPendingDuration(alert)}
        </time>
      </td>
      <td className="px-5 py-4 align-middle">
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-1.5">
            <span className="truncate font-medium text-foreground" title={professionalName}>
              {professionalName}
            </span>
            {showVerifiedBadge ? (
              <VerifiedBadgeIcon
                aria-label="Registro profissional verificado"
                className="h-4 w-4"
                role="img"
              />
            ) : null}
          </div>
          <p className="mt-0.5 truncate text-xs font-normal text-muted">{professionalRoleLabel}</p>
        </div>
      </td>
      <td className="px-5 py-4 align-middle text-xs font-medium text-primary" title={plan}>
        {plan}
      </td>
      <td className="px-5 py-4 align-middle">
        <ComplianceProfileBadge alert={alert} />
      </td>
      <td className="px-5 py-4 align-middle">
        {href ? (
          <Link
            aria-label={`Abrir detalhes administrativos de ${professionalName}`}
            className="grid h-9 w-9 place-items-center rounded-full border border-border bg-surface text-foreground shadow-control transition hover:border-primary hover:text-primary"
            href={href}
            title={"Abrir detalhes do psic\u00f3logo"}
          >
            <ExternalLink aria-hidden className="h-4 w-4" />
          </Link>
        ) : (
          <span
            aria-label={"Detalhe administrativo indispon\u00edvel"}
            className="grid h-9 w-9 place-items-center rounded-full border border-border bg-surface-muted text-muted"
            role="img"
            title={"Detalhe administrativo indispon\u00edvel"}
          >
            <ExternalLink aria-hidden className="h-4 w-4" />
          </span>
        )}
      </td>
    </tr>
  );
};

export const ComplianceAlertsTable = ({
  alerts,
}: {
  alerts: AdminModerationOperationalAlert[];
}) => (
  <div className="overflow-x-auto">
    <table className="w-full min-w-[960px] table-fixed border-collapse">
      <thead className="bg-surface-muted/70 text-left text-[0.7rem] font-medium uppercase tracking-[0.1em] text-subtle">
        <tr>
          <th className="w-[22%] px-5 py-4 font-medium">Pendência</th>
          <th className="w-[17%] px-5 py-4 font-medium">Pendente há</th>
          <th className="w-[24%] px-5 py-4 font-medium">Profissional</th>
          <th className="w-[17%] px-5 py-4 font-medium">Plano</th>
          <th className="w-[14%] px-5 py-4 font-medium">Perfil</th>
          <th className="w-[6%] px-5 py-4 font-medium">
            <span className="sr-only">Ações</span>
          </th>
        </tr>
      </thead>
      <tbody className="divide-y divide-border/70">
        {alerts.map((alert) => (
          <ComplianceAlertRow alert={alert} key={alert.id} />
        ))}
      </tbody>
    </table>
  </div>
);
