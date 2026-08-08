"use client";

import { AlertTriangle, RefreshCw, ShieldCheck, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  useAdminPsychologistAccount,
  useAdminPsychologistRegistryVerification,
} from "@/api/callers/psychologists";
import { resolveApiError } from "@/api/handle";
import type { AdminPsychologistAccount, AdminPsychologistDetail } from "@/api/req/psychologists";
import { Badge, CardShell, IconCircle } from "../../components/shared";
import { numberFormatter } from "../../support/config";
import { formatDateOnly } from "../../support/date-period";
import {
  formatCrpRegion,
  formatDateTime,
  formatNullable,
  getHeaderAccountStatus,
} from "../../support/formatters";

const getAccountSituationHelperText = (account: AdminPsychologistAccount) => {
  if (account.account_status !== "active") {
    return "Login bloqueado enquanto a conta não estiver ativa. Ações completas ficam na aba Conta.";
  }

  if (!account.active) {
    return "Login bloqueado porque a conta está inativa. Revise a operação na aba Conta.";
  }

  if (!account.confirmed) {
    return "Conta ativa, mas o e-mail ainda precisa ser confirmado para liberar totalmente o acesso.";
  }

  return "E-mail confirmado e login liberado para operações Lectum.";
};

export const AccountSituationCard = ({ id }: { id: string }) => {
  const pathname = usePathname();
  const query = useAdminPsychologistAccount(id);
  const errorMessage = query.error ? resolveApiError(query.error) : null;

  if (query.isLoading) {
    return (
      <CardShell className="p-5">
        <div className="flex justify-end">
          <IconCircle icon={UserRound} />
        </div>
        <div className="mt-4 h-52 animate-pulse rounded-3xl bg-surface-muted" />
      </CardShell>
    );
  }

  if (query.isError && errorMessage) {
    return (
      <CardShell className="p-5">
        <div className="flex justify-end">
          <IconCircle icon={AlertTriangle} />
        </div>
        <p className="mt-5 rounded-2xl bg-surface-muted p-4 text-sm font-bold leading-6 text-muted">
          {errorMessage}
        </p>
        <button
          className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-control border border-border bg-surface px-4 text-sm font-black text-foreground transition hover:border-primary sm:w-auto"
          onClick={() => void query.refetch()}
          type="button"
        >
          <RefreshCw aria-hidden className="h-4 w-4" />
          Tentar novamente
        </button>
      </CardShell>
    );
  }

  const account = query.data;
  if (!account) return null;

  const situation = getHeaderAccountStatus(account, { isError: false, isLoading: false });
  const summaryItems = [
    {
      label: "Status do e-mail",
      value: (
        <Badge
          className={
            account.confirmed ? "bg-success-soft text-success" : "bg-warning-soft text-warning"
          }
        >
          {account.confirmed ? "Confirmado" : "Pendente"}
        </Badge>
      ),
    },
    { label: "Método de login", value: account.provider_label },
    { label: "Último acesso", value: formatDateTime(account.last_access_at) },
    {
      label: "Sessões ativas",
      value: numberFormatter.format(account.sessions.active_count),
    },
  ];

  return (
    <CardShell className="flex h-full flex-col p-5">
      <div className="rounded-[28px] border border-primary/15 bg-primary-soft/55 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.12em] text-primary">Conta</p>
            <p className="mt-1 text-xl font-black text-foreground">{situation.label}</p>
          </div>
          <IconCircle icon={UserRound} />
        </div>
        <p className="mt-3 text-sm font-bold leading-6 text-muted">
          {getAccountSituationHelperText(account)}
        </p>
      </div>
      <dl className="mt-4 flex-1 divide-y divide-border text-sm">
        {summaryItems.map((item) => (
          <div className="grid gap-1 py-3 sm:grid-cols-[150px_1fr]" key={item.label}>
            <dt className="font-black text-muted">{item.label}</dt>
            <dd className="font-bold text-foreground">{item.value}</dd>
          </div>
        ))}
      </dl>
      <Link
        className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-control border border-primary/45 bg-surface px-4 text-sm font-black text-primary shadow-control transition hover:bg-primary-soft sm:w-auto"
        href={`${pathname}?tab=conta`}
      >
        Abrir dados da conta
      </Link>
    </CardShell>
  );
};

export const RegistryStatusCard = ({ id }: { id: string }) => {
  const pathname = usePathname();
  const query = useAdminPsychologistRegistryVerification(id);
  const errorMessage = query.error ? resolveApiError(query.error) : null;

  if (query.isLoading) {
    return (
      <CardShell className="p-5">
        <div className="h-52 animate-pulse rounded-3xl bg-surface-muted" />
      </CardShell>
    );
  }

  if (query.isError && errorMessage) {
    return (
      <CardShell className="p-5">
        <div className="flex items-start gap-3">
          <IconCircle icon={AlertTriangle} />
          <div>
            <p className="text-sm text-muted">{errorMessage}</p>
          </div>
        </div>
        <button
          className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-control border border-border bg-surface px-4 text-sm font-black text-foreground transition hover:border-primary sm:w-auto"
          onClick={() => void query.refetch()}
          type="button"
        >
          <RefreshCw aria-hidden className="h-4 w-4" />
          Tentar novamente
        </button>
      </CardShell>
    );
  }

  const registry = query.data;
  if (!registry) return null;
  const summaryItems = [
    { label: "Regional CRP", value: formatCrpRegion(registry.identity.regional_crp) },
    { label: "Nº CRP", value: formatNullable(registry.identity.registration_number) },
    {
      label: "Data de inscrição",
      value: formatDateOnly(registry.identity.crp_registration_date),
    },
  ];
  const helperText =
    registry.summary.status === "aprovado"
      ? "Registro ativo para operações Lectum. Dados públicos do conselho podem ser revisados em Perfil e cadastro."
      : registry.actions.can_approve_manually
        ? "Registro pendente. Revise os dados do conselho e aprove ou rejeite em Perfil e cadastro."
        : "Resumo somente leitura. Ações do registro ficam concentradas em Perfil e cadastro.";

  return (
    <CardShell className="flex h-full flex-col p-5">
      <div className="rounded-[28px] border border-primary/15 bg-primary-soft/55 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.12em] text-primary">Registro</p>
            <p className="mt-1 text-xl font-black text-foreground">
              {registry.summary.status_label}
            </p>
          </div>
          <IconCircle icon={ShieldCheck} />
        </div>
        <p className="mt-3 text-sm font-bold leading-6 text-muted">{helperText}</p>
      </div>
      <dl className="mt-4 flex-1 divide-y divide-border text-sm">
        {summaryItems.map((item) => (
          <div className="grid gap-1 py-3 sm:grid-cols-[170px_1fr]" key={item.label}>
            <dt className="font-black text-muted">{item.label}</dt>
            <dd className="font-bold text-foreground">{item.value}</dd>
          </div>
        ))}
      </dl>
      <Link
        className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-control border border-primary/45 bg-surface px-4 text-sm font-black text-primary shadow-control transition hover:bg-primary-soft sm:w-auto"
        href={`${pathname}?tab=perfil`}
      >
        Abrir registro profissional
      </Link>
    </CardShell>
  );
};

export const RecentActivity = ({
  events,
}: {
  events: AdminPsychologistDetail["general"]["recent_activity"];
}) => {
  const activityUserFor = (event: AdminPsychologistDetail["general"]["recent_activity"][number]) =>
    event.actor ?? { name: "Não informado", role: null };

  return (
    <CardShell className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-foreground">Atividades recentes</h2>
          <p className="mt-1 text-sm text-muted">Registro dos principais eventos encontrados.</p>
        </div>
      </div>
      {events.length === 0 ? (
        <p className="mt-5 rounded-2xl bg-surface-muted p-4 text-sm text-muted">
          Nenhuma atividade recente encontrada para este psicólogo.
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-border text-xs text-muted">
              <tr>
                <th className="py-3 pr-3 font-black">Data</th>
                <th className="px-3 py-3 font-black">Ação</th>
                <th className="px-3 py-3 font-black">Descrição</th>
                <th className="px-3 py-3 font-black">Usuário</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {events.map((event) => {
                const user = activityUserFor(event);

                return (
                  <tr key={event.id}>
                    <td className="py-3 pr-3 font-bold text-muted">
                      {formatDateTime(event.created_at)}
                    </td>
                    <td className="px-3 py-3 font-black text-foreground">{event.label}</td>
                    <td className="px-3 py-3 text-muted">{event.description}</td>
                    <td className="px-3 py-3">
                      <span className="block font-black text-foreground">{user.name}</span>
                      {user.role ? (
                        <span className="mt-1 block text-xs font-bold text-muted">{user.role}</span>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </CardShell>
  );
};
