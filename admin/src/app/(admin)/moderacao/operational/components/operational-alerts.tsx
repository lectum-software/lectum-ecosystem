"use client";

import { ExternalLink } from "lucide-react";
import Link from "next/link";
import type { AdminModerationOperationalAlert } from "@/api/req/moderation";

import {
  alertUserName,
  alertUserRoleLabel,
  alertUserVerified,
  detailValue,
  type OperationalDetailItem,
  OperationalPendingBadge,
} from "../modules/alert-support";
import { formatDateTime, formatPendingDuration } from "../modules/report-support";
import { alertFactValue, VerifiedBadgeIcon } from "./report-common";

export const operationalAlertDetailItems = (
  alert: AdminModerationOperationalAlert,
): OperationalDetailItem[] => {
  if (alert.type === "patient_post_without_coverage") {
    return [
      {
        label: "Comunidade",
        value: detailValue(alert.community?.name, alertFactValue(alert, "Comunidade")),
      },
      {
        label: "Publicado em",
        value: detailValue(formatDateTime(alert.created_at)),
      },
    ];
  }

  if (alert.type === "unpublished_required_settings") {
    return [
      {
        label: "Plano",
        value: detailValue(alertFactValue(alert, "Plano")),
      },
      {
        label: "Motivo",
        value: detailValue(
          alertFactValue(alert, "Motivo inativo"),
          alertFactValue(alert, "Primeiras"),
        ),
      },
    ];
  }

  if (alert.type === "psychologist_no_conversion") {
    return [
      {
        label: "Na plataforma",
        value: detailValue(alertFactValue(alert, "Na plataforma")),
      },
      {
        label: "Critérios",
        value: detailValue(
          alertFactValue(alert, "Critérios de adaptação"),
          alertFactValue(alert, "Adaptação"),
        ),
      },
    ];
  }

  if (alert.type === "registration_error") {
    return [
      {
        label: "Modo de cadastro",
        value: detailValue(alertFactValue(alert, "Modo de cadastro")),
      },
      {
        label: "Email",
        value: detailValue(alertFactValue(alert, "Email")),
      },
    ];
  }

  return alert.facts.slice(0, 2).map((fact) => ({
    label: fact.label,
    value: detailValue(fact.value),
  }));
};

export const OperationalAlertDetails = ({ alert }: { alert: AdminModerationOperationalAlert }) => {
  const details = operationalAlertDetailItems(alert);
  const title = details.map((detail) => `${detail.label}: ${detail.value}`).join("\n");

  return (
    <div className="space-y-1.5 text-xs leading-5 text-muted" title={title}>
      {details.map((detail) => (
        <p className="line-clamp-2 [overflow-wrap:anywhere]" key={detail.label}>
          <span className="font-medium text-foreground">{detail.label}:</span> {detail.value}
        </p>
      ))}
    </div>
  );
};

export const OperationalDetailsAction = ({ alert }: { alert: AdminModerationOperationalAlert }) => {
  const href = alert.action_href ?? alert.entity.href;
  const isContent = alert.entity.type === "post" || alert.entity.type === "reply";
  const targetLabel = isContent ? alert.entity.label : alertUserName(alert);
  const title = isContent
    ? "Abrir detalhes do conteúdo"
    : alert.entity.type === "patient"
      ? "Abrir detalhes do paciente"
      : alert.entity.type === "psychologist"
        ? "Abrir detalhes do psicólogo"
        : "Abrir detalhes do usuário";

  return href ? (
    <Link
      aria-label={`${title}: ${targetLabel}`}
      className="grid h-9 w-9 place-items-center rounded-full border border-border bg-surface text-foreground shadow-control transition hover:border-primary hover:text-primary"
      href={href}
      title={title}
    >
      <ExternalLink aria-hidden className="h-4 w-4" />
    </Link>
  ) : (
    <span
      aria-label="Detalhe administrativo indisponível"
      className="grid h-9 w-9 place-items-center rounded-full border border-border bg-surface-muted text-muted"
      role="img"
      title="Detalhe administrativo indisponível"
    >
      <ExternalLink aria-hidden className="h-4 w-4" />
    </span>
  );
};

export const OperationalAlertRow = ({ alert }: { alert: AdminModerationOperationalAlert }) => {
  const userName = alertUserName(alert);
  const roleLabel = alertUserRoleLabel(alert);
  const showVerifiedBadge = alertUserVerified(alert);

  return (
    <tr className="border-t border-border/80 text-sm text-foreground transition hover:bg-primary-soft/30">
      <td className="px-5 py-4 align-middle">
        <OperationalPendingBadge alert={alert} />
      </td>
      <td className="px-5 py-4 align-middle text-xs font-medium text-muted">
        {formatPendingDuration(alert)}
      </td>
      <td className="px-5 py-4 align-middle">
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-1.5">
            <span className="truncate font-medium text-foreground" title={userName}>
              {userName}
            </span>
            {showVerifiedBadge ? (
              <VerifiedBadgeIcon
                aria-label="Registro profissional verificado"
                className="h-4 w-4"
                role="img"
              />
            ) : null}
          </div>
          <p className="mt-0.5 truncate text-xs font-normal text-muted">{roleLabel}</p>
        </div>
      </td>
      <td className="px-5 py-4 align-middle">
        <OperationalAlertDetails alert={alert} />
      </td>
      <td className="px-5 py-4 align-middle">
        <OperationalDetailsAction alert={alert} />
      </td>
    </tr>
  );
};

export const OperationalAlertsTable = ({
  alerts,
}: {
  alerts: AdminModerationOperationalAlert[];
}) => (
  <div className="overflow-x-auto">
    <table className="w-full min-w-[1040px] table-fixed border-collapse">
      <thead className="bg-surface-muted/70 text-left text-[0.7rem] font-medium uppercase tracking-[0.1em] text-subtle">
        <tr>
          <th className="w-[20%] px-5 py-4 font-medium">Pendência</th>
          <th className="w-[14%] px-5 py-4 font-medium">Pendente há</th>
          <th className="w-[22%] px-5 py-4 font-medium">Usuário</th>
          <th className="w-[38%] px-5 py-4 font-medium">Detalhes</th>
          <th className="w-[6%] px-5 py-4 font-medium">
            <span className="sr-only">Ações</span>
          </th>
        </tr>
      </thead>
      <tbody className="divide-y divide-border/70">
        {alerts.map((alert) => (
          <OperationalAlertRow alert={alert} key={alert.id} />
        ))}
      </tbody>
    </table>
  </div>
);
