"use client";
import { ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";
import type { AdminPatientAccount } from "@/api/req/patients";
import { numberFormatter } from "../modules/detail-config";
import { formatDateTime, formatLastAccess } from "../modules/detail-support";
import { Badge, CardShell } from "./common";
import { FieldRow, InfoCard } from "./profile-summary";

export const booleanBadge = (value: boolean, labels: { false: string; true: string }) => (
  <Badge className={value ? "bg-success-soft text-success" : "bg-warning-soft text-warning"}>
    {value ? labels.true : labels.false}
  </Badge>
);

export const formatCountWithUnit = (count: number, singular: string, plural: string) =>
  `${numberFormatter.format(count)} ${count === 1 ? singular : plural}`;

export const formatSessionDeviceSummary = (sessions: AdminPatientAccount["sessions"]) =>
  `${formatCountWithUnit(sessions.active_count, "sessão", "sessões")} em ${formatCountWithUnit(
    sessions.devices_count,
    "dispositivo",
    "dispositivos",
  )}`;

export const AccountUnavailableNotice = ({ children }: { children: ReactNode }) => (
  <div className="rounded-2xl border border-dashed border-border bg-surface-muted p-4 text-sm font-bold leading-6 text-muted">
    {children}
  </div>
);

export const ACCOUNT_STATUS_BADGE_CLASS: Record<AdminPatientAccount["account_status"], string> = {
  active: "bg-primary-soft text-primary",
  deactivated: "bg-surface-muted text-muted",
  deleted: "bg-danger/10 text-danger",
  suspended: "bg-danger/10 text-danger",
};

export const AccountLoadingState = () => (
  <div className="space-y-5" data-patient-account-loading="true">
    <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
      <CardShell className="h-80 animate-pulse bg-surface-muted" />
      <CardShell className="h-80 animate-pulse bg-surface-muted" />
    </div>
    <div className="grid gap-5 xl:grid-cols-2">
      <CardShell className="h-96 animate-pulse bg-surface-muted" />
      <CardShell className="h-96 animate-pulse bg-surface-muted" />
    </div>
  </div>
);

export const AccountSummaryCard = ({ account }: { account: AdminPatientAccount }) => (
  <InfoCard icon={ShieldCheck} title="Resumo da conta">
    <FieldRow label="E-mail atual" value={account.email} />
    <FieldRow
      label="Status do e-mail"
      value={booleanBadge(account.confirmed, {
        false: "Pendente",
        true: "Confirmado",
      })}
    />
    <FieldRow label="Confirmado em" value={formatDateTime(account.confirmed_at)} />
    <FieldRow label="Método de login" value={account.provider_label} />
    <FieldRow
      label="Senha local"
      value={booleanBadge(account.has_password, {
        false: "Não possui senha local",
        true: "Possui senha local",
      })}
    />
    <FieldRow
      label="Status da conta"
      value={
        <Badge className={ACCOUNT_STATUS_BADGE_CLASS[account.account_status]}>
          {account.account_status_label}
        </Badge>
      }
    />
    <FieldRow
      label="Status alterado em"
      value={formatDateTime(account.account_status_changed_at)}
    />
    {account.account_status === "suspended" ? (
      <FieldRow label="Suspensa até" value={formatDateTime(account.account_status_expires_at)} />
    ) : null}
    <FieldRow
      label="Troca obrigatória"
      value={booleanBadge(account.need_reset, {
        false: "Sem pendência",
        true: "Pendente",
      })}
    />
    <FieldRow label="Conta criada em" value={formatDateTime(account.created_at)} />
    <FieldRow label="Último acesso" value={formatLastAccess(account.last_access_at)} />
    <FieldRow label="Sessões ativas" value={formatSessionDeviceSummary(account.sessions)} />
  </InfoCard>
);
