"use client";
import { ChevronLeft, ChevronRight, Edit3, Eye, Loader2, Plus, Trash2, X } from "lucide-react";
import type { ReactNode } from "react";
import type { AdminNotificationCampaign } from "@/api/req/notifications";
import { useAdminDialogLifecycle } from "@/hooks/use-admin-dialog-lifecycle";
import {
  audienceLabel,
  campaignStatusCopy,
  channelText,
  formatDateTime,
  numberFormatter,
} from "../modules/notification-support";
import { CardShell, ChannelPill, StatusBadge } from "./table";

export const CampaignDetailsModal = ({
  campaign,
  onClose,
}: {
  campaign: AdminNotificationCampaign;
  onClose: () => void;
}) => {
  const dialogRef = useAdminDialogLifecycle(onClose);

  return (
    <div
      aria-label="Detalhes da notificação"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end justify-center bg-overlay p-3 sm:items-center"
      ref={dialogRef}
      role="dialog"
      tabIndex={-1}
    >
      <CardShell className="max-h-[92dvh] w-full max-w-2xl overflow-y-auto p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-primary">Detalhes</p>
            <h2 className="mt-2 text-2xl font-black text-foreground">{campaign.title}</h2>
            <p className="mt-2 text-sm leading-6 text-muted">{campaign.body}</p>
          </div>
          <button
            aria-label="Fechar detalhes"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-border bg-surface text-muted transition hover:text-foreground"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {[
            ["Status", campaignStatusCopy(campaign.status).label],
            ["Público", audienceLabel(campaign.audience)],
            ["Canais", channelText(campaign.channels)],
            ["Destino interno", campaign.redirect || "—"],
            ["Criada em", formatDateTime(campaign.created_at)],
            ["Agendada para", formatDateTime(campaign.scheduled_at)],
            ["Enviada em", formatDateTime(campaign.sent_at)],
            ["Entregas totais", numberFormatter.format(campaign.delivery_counts.total)],
          ].map(([label, value]) => (
            <div className="rounded-2xl border border-border bg-surface-muted p-3" key={label}>
              <p className="text-xs font-black text-muted">{label}</p>
              <p className="mt-1 break-words text-sm font-black text-foreground">{value}</p>
            </div>
          ))}
        </div>
      </CardShell>
    </div>
  );
};

export const CampaignsList = ({
  campaigns,
  cancelingCampaignId,
  count,
  filtersSlot,
  isFetching,
  onCancel,
  onDetails,
  onEdit,
  onNew,
  onNext,
  onPrev,
  page,
  pages,
}: {
  campaigns: AdminNotificationCampaign[];
  cancelingCampaignId?: string | null;
  count: number;
  filtersSlot: ReactNode;
  isFetching: boolean;
  onCancel: (campaign: AdminNotificationCampaign) => void;
  onDetails: (campaign: AdminNotificationCampaign) => void;
  onEdit: (campaign: AdminNotificationCampaign) => void;
  onNew: () => void;
  onNext: () => void;
  onPrev: () => void;
  page: number;
  pages: number;
}) => (
  <CardShell className="overflow-hidden">
    <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <h2 className="text-lg font-black">Notificações manuais</h2>
        <p className="text-sm text-muted">
          {numberFormatter.format(count)} notificações(s) encontrada(s).
        </p>
      </div>
      <div className="flex flex-col gap-3 sm:items-end">
        {isFetching ? (
          <span className="inline-flex items-center gap-2 text-xs font-black text-muted">
            <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
            Atualizando
          </span>
        ) : null}
        <button
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-control bg-primary px-4 text-sm font-bold text-primary-foreground shadow-admin-soft transition hover:bg-primary-hover sm:w-auto"
          onClick={onNew}
          type="button"
        >
          <Plus aria-hidden className="h-4 w-4" />
          Nova notificação
        </button>
      </div>
    </div>
    {filtersSlot}
    {isFetching && campaigns.length === 0 ? (
      <div className="flex items-center gap-2 p-6 text-sm font-bold text-muted">
        <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
        Carregando notificações manuais...
      </div>
    ) : campaigns.length === 0 ? (
      <div className="p-6 text-sm font-bold text-muted">
        Nenhuma notificação manual encontrada para os filtros atuais.
      </div>
    ) : (
      <div className="overflow-x-auto">
        <table className="min-w-[900px] w-full border-collapse text-left text-sm">
          <thead className="bg-surface-muted text-xs uppercase tracking-[0.08em] text-muted">
            <tr>
              <th className="px-4 py-3">Notificação</th>
              <th className="px-4 py-3">Público</th>
              <th className="px-4 py-3">Canal</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Enviada/agendada em</th>
              <th className="px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {campaigns.map((campaign) => (
              <tr className="border-t border-border align-top" key={campaign.id}>
                <td className="px-4 py-4">
                  <p className="font-black text-foreground">{campaign.title}</p>
                  <p className="mt-1 line-clamp-2 max-w-xs text-xs leading-5 text-muted">
                    {campaign.body}
                  </p>
                </td>
                <td className="px-4 py-4 font-bold text-muted">
                  {audienceLabel(campaign.audience)}
                </td>
                <td className="px-4 py-4">
                  <div className="flex flex-wrap gap-1.5">
                    {campaign.channels.map((channel) => (
                      <ChannelPill channel={channel} key={channel} />
                    ))}
                  </div>
                </td>
                <td className="px-4 py-4">
                  <StatusBadge status={campaign.status} />
                </td>
                <td className="px-4 py-4 text-sm font-bold text-muted">
                  {campaign.sent_at
                    ? formatDateTime(campaign.sent_at)
                    : formatDateTime(campaign.scheduled_at)}
                </td>
                <td className="px-4 py-4">
                  <div className="flex justify-end gap-2">
                    <button
                      className="grid h-10 w-10 place-items-center rounded-xl border border-border bg-surface text-primary transition hover:border-primary"
                      onClick={() => onDetails(campaign)}
                      title="Ver detalhes"
                      type="button"
                    >
                      <Eye aria-hidden className="h-4 w-4" />
                    </button>
                    {campaign.status === "draft" ? (
                      <button
                        className="grid h-10 w-10 place-items-center rounded-xl border border-border bg-surface text-muted transition hover:border-primary hover:text-primary"
                        onClick={() => onEdit(campaign)}
                        title="Editar rascunho"
                        type="button"
                      >
                        <Edit3 aria-hidden className="h-4 w-4" />
                      </button>
                    ) : null}
                    {campaign.status === "draft" || campaign.status === "scheduled" ? (
                      <button
                        className="grid h-10 w-10 place-items-center rounded-xl border border-border bg-surface text-danger transition hover:border-danger disabled:cursor-wait disabled:opacity-60"
                        disabled={Boolean(cancelingCampaignId)}
                        onClick={() => onCancel(campaign)}
                        title="Cancelar"
                        type="button"
                      >
                        {cancelingCampaignId === campaign.id ? (
                          <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 aria-hidden className="h-4 w-4" />
                        )}
                      </button>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
    <Pager disabled={isFetching} onNext={onNext} onPrev={onPrev} page={page} pages={pages} />
  </CardShell>
);

export const Pager = ({
  disabled = false,
  onNext,
  onPrev,
  page,
  pages,
}: {
  disabled?: boolean;
  onNext: () => void;
  onPrev: () => void;
  page: number;
  pages: number;
}) => (
  <div className="flex flex-col gap-3 border-t border-border p-4 sm:flex-row sm:items-center sm:justify-between">
    <p className="text-xs font-bold text-muted">
      Página {numberFormatter.format(page)} de {numberFormatter.format(Math.max(1, pages))}
    </p>
    <div className="flex gap-2">
      <button
        className="inline-flex h-10 items-center gap-2 rounded-control border border-border bg-surface px-3 text-sm font-black text-muted disabled:opacity-50"
        disabled={disabled || page <= 1}
        onClick={onPrev}
        type="button"
      >
        <ChevronLeft aria-hidden className="h-4 w-4" />
        Anterior
      </button>
      <button
        className="inline-flex h-10 items-center gap-2 rounded-control border border-border bg-surface px-3 text-sm font-black text-muted disabled:opacity-50"
        disabled={disabled || page >= pages}
        onClick={onNext}
        type="button"
      >
        Próxima
        <ChevronRight aria-hidden className="h-4 w-4" />
      </button>
    </div>
  </div>
);
