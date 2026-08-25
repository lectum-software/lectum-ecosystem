"use client";
import { Loader2 } from "lucide-react";
import type { ReactNode } from "react";
import type {
  AdminNotificationAutomaticLog,
  AdminNotificationEmailStatus,
  AdminNotificationPushStatus,
} from "@/api/req/notifications";
import { formatDateTime, numberFormatter } from "../modules/notification-support";
import { Pager } from "./campaigns";
import {
  CardShell,
  ChannelPill,
  DeliveryStatusBadge,
  EngagementCell,
  RecipientCell,
} from "./table";

const notificationTitle = (log: AdminNotificationAutomaticLog) =>
  log.notification_title?.trim() || "Título não disponível";

export const AutomaticLogs = ({
  count,
  data,
  filtersSlot,
  isFetching,
  onNext,
  onPrev,
  page,
  pages,
}: {
  count: number;
  data: AdminNotificationAutomaticLog[];
  filtersSlot: ReactNode;
  isFetching: boolean;
  onNext: () => void;
  onPrev: () => void;
  page: number;
  pages: number;
}) => (
  <CardShell className="overflow-hidden">
    <div className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 className="text-lg font-black">Notificações automáticas</h2>
        <p className="text-sm text-muted">
          {numberFormatter.format(count)} notificações(s) encontrada(s).
        </p>
      </div>
      {isFetching ? (
        <span className="inline-flex items-center gap-2 text-xs font-black text-muted">
          <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
          Atualizando
        </span>
      ) : null}
    </div>
    {filtersSlot}
    {isFetching && data.length === 0 ? (
      <div className="flex items-center gap-2 p-6 text-sm font-bold text-muted">
        <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
        Carregando notificações automáticas...
      </div>
    ) : data.length === 0 ? (
      <div className="p-6 text-sm font-bold text-muted">
        Nenhum registro automático encontrado para os filtros atuais.
      </div>
    ) : (
      <div className="overflow-x-auto">
        <table className="min-w-[960px] w-full border-collapse text-left text-sm">
          <thead className="bg-surface-muted text-xs uppercase tracking-[0.08em] text-muted">
            <tr>
              <th className="px-4 py-3">Notificação</th>
              <th className="px-4 py-3">Para</th>
              <th className="px-4 py-3">Canal</th>
              <th className="px-4 py-3">Enviada em</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Engajamento</th>
            </tr>
          </thead>
          <tbody>
            {data.map((log) => {
              const title = notificationTitle(log);

              return (
                <tr className="border-t border-border align-top" key={log.id}>
                  <td className="px-4 py-4">
                    <p className="max-w-xs font-black text-foreground" title={title}>
                      {title}
                    </p>
                  </td>
                  <td className="px-4 py-4 text-sm">
                    <RecipientCell user={log.user} />
                  </td>
                  <td className="px-4 py-4">
                    <ChannelPill channel={log.channel} />
                  </td>
                  <td className="px-4 py-4 text-sm font-bold text-muted">
                    {formatDateTime(log.sent_at || log.delivered_at || log.created_at)}
                  </td>
                  <td className="px-4 py-4">
                    <DeliveryStatusBadge status={log.status} />
                    {log.status === "failed" || log.status === "skipped" ? (
                      <p className="mt-1 max-w-56 text-xs font-bold leading-5 text-muted">
                        {log.status === "skipped"
                          ? "Envio não realizado."
                          : "Entrega não concluída."}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-4 py-4">
                    <EngagementCell log={log} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    )}
    <Pager disabled={isFetching} onNext={onNext} onPrev={onPrev} page={page} pages={pages} />
  </CardShell>
);

export const pushUnavailableCopy = (push?: AdminNotificationPushStatus) => {
  if (!push) return "Verificando disponibilidade das notificações push.";
  if (push.available) return null;
  if (!push.configured) return "Notificações push indisponíveis por configuração.";
  if (push.active_subscriptions === 0)
    return "Notificações push indisponíveis: nenhum usuário possui autorização ativa.";
  return "Notificações push temporariamente indisponíveis.";
};

export const emailUnavailableCopy = (email?: AdminNotificationEmailStatus) => {
  if (!email) return "Verificando disponibilidade do envio de e-mail.";
  if (email.available) return null;
  return "Envio de e-mail indisponível por configuração.";
};
