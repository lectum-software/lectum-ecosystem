"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertTriangle,
  Bell,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  CopyCheck,
  Edit3,
  Eye,
  Loader2,
  Megaphone,
  MousePointerClick,
  Plus,
  RefreshCw,
  Search,
  Send,
  Smartphone,
  Trash2,
  UsersRound,
  X,
} from "lucide-react";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { type Control, FormProvider, useController, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import {
  useAdminNotificationAutomaticLogs,
  useAdminNotificationCampaigns,
  useAdminNotificationCancelCampaign,
  useAdminNotificationCreateCampaign,
  useAdminNotificationMetrics,
  useAdminNotificationPushStatus,
  useAdminNotificationScheduleCampaign,
  useAdminNotificationSendCampaign,
  useAdminNotificationUpdateCampaign,
} from "@/api/callers/notifications";
import { resolveApiError } from "@/api/handle";
import {
  ADMIN_NOTIFICATION_AUDIENCES,
  type AdminNotificationAudience,
  type AdminNotificationAutomaticLog,
  type AdminNotificationCampaign,
  type AdminNotificationCampaignPayload,
  type AdminNotificationCampaignStatus,
  type AdminNotificationChannel,
  type AdminNotificationMetrics,
  type AdminNotificationPushStatus,
} from "@/api/req/notifications";
import { InputController, SelectController, TextareaController } from "@/components/controllers";
import { cn } from "@/lib/utils";

const QUICK_RANGES = [7, 30, 90] as const;
const CAMPAIGN_LIMIT = 8;
const LOGS_LIMIT = 8;
const cardClass = "rounded-card border border-border bg-surface shadow-admin-soft";

const AUDIENCE_OPTIONS: Array<{ label: string; value: AdminNotificationAudience }> = [
  { label: "Todos os usuários", value: "all_users" },
  { label: "Pacientes", value: "patients" },
  { label: "Psicólogos", value: "psychologists" },
  { label: "Pacientes ativos", value: "active_patients" },
  { label: "Psicólogos ativos", value: "active_psychologists" },
];

const TABS: Array<{ label: string; status?: AdminNotificationCampaignStatus; value: string }> = [
  { label: "Todas", value: "all" },
  { label: "Agendadas", status: "scheduled", value: "scheduled" },
  { label: "Enviadas", status: "sent", value: "sent" },
  { label: "Rascunhos", status: "draft", value: "draft" },
  { label: "Canceladas", status: "canceled", value: "canceled" },
];

const STATUS_COPY: Record<AdminNotificationCampaignStatus, { label: string; className: string }> = {
  canceled: { className: "bg-red-50 text-danger", label: "Cancelada" },
  draft: { className: "bg-surface-muted text-muted", label: "Rascunho" },
  failed: { className: "bg-red-50 text-danger", label: "Falhou" },
  scheduled: { className: "bg-blue-50 text-blue-700", label: "Agendada" },
  sending: { className: "bg-yellow-50 text-yellow-700", label: "Enviando" },
  sent: { className: "bg-emerald-50 text-success", label: "Enviada" },
};

const numberFormatter = new Intl.NumberFormat("pt-BR");
const percentFormatter = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });
const dateTimeFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
});
const dateFormatter = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" });
const pad = (value: number) => String(value).padStart(2, "0");
const toInputDate = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const getQuickRange = (days: number) => {
  const today = new Date();
  const from = new Date(today);
  from.setDate(today.getDate() - (days - 1));
  return { from: toInputDate(from), to: toInputDate(today) };
};
const toInputDateTime = (value?: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};
const formatDateTime = (value?: string | null) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : dateTimeFormatter.format(date);
};
const formatDate = (value: string) => dateFormatter.format(new Date(value));
const formatPercent = (value: number) => `${percentFormatter.format(value)}%`;
const audienceLabel = (value: AdminNotificationAudience) =>
  AUDIENCE_OPTIONS.find((item) => item.value === value)?.label ?? value;
const channelLabel = (value: AdminNotificationChannel) => (value === "in_app" ? "In-app" : "Push");
const channelText = (channels: AdminNotificationChannel[]) =>
  channels.map(channelLabel).join(" + ");

const internalRedirect = z
  .string()
  .trim()
  .max(512, "Use até 512 caracteres.")
  .optional()
  .refine(
    (value) => !value || (value.startsWith("/") && !value.startsWith("//")),
    "Use uma rota interna iniciada por /.",
  );

const notificationFormSchema = z
  .object({
    audience: z.enum(ADMIN_NOTIFICATION_AUDIENCES),
    body: z.string().trim().min(3, "Informe a mensagem.").max(500, "Use até 500 caracteres."),
    delivery_mode: z.enum(["draft", "send_now", "schedule"]),
    in_app: z.boolean(),
    push: z.boolean(),
    redirect: internalRedirect,
    scheduled_at: z.string().optional(),
    title: z.string().trim().min(3, "Informe o título.").max(120, "Use até 120 caracteres."),
  })
  .superRefine((values, context) => {
    if (!values.in_app && !values.push) {
      context.addIssue({
        code: "custom",
        message: "Selecione ao menos um canal.",
        path: ["in_app"],
      });
    }
    if (values.delivery_mode === "schedule") {
      const date = values.scheduled_at ? new Date(values.scheduled_at) : null;
      if (!date || Number.isNaN(date.getTime()) || date <= new Date()) {
        context.addIssue({
          code: "custom",
          message: "Informe uma data futura para agendar.",
          path: ["scheduled_at"],
        });
      }
    }
  });

type NotificationFormValues = z.infer<typeof notificationFormSchema>;
type SubmitIntent = NotificationFormValues["delivery_mode"];
type NotificationsFilters = {
  audience: "all" | AdminNotificationAudience;
  channel: "all" | AdminNotificationChannel;
  q: string;
};

const CardShell = ({ children, className }: { children?: ReactNode; className?: string }) => (
  <section className={cn(cardClass, className)}>{children}</section>
);

const StatusBadge = ({ status }: { status: AdminNotificationCampaignStatus }) => (
  <span
    className={cn(
      "inline-flex rounded-full px-2.5 py-1 text-xs font-black",
      STATUS_COPY[status].className,
    )}
  >
    {STATUS_COPY[status].label}
  </span>
);

const ChannelPill = ({ channel }: { channel: AdminNotificationChannel }) => (
  <span className="inline-flex items-center gap-1 rounded-full bg-primary-soft px-2 py-1 text-xs font-black text-primary">
    {channel === "push" ? (
      <Smartphone aria-hidden className="h-3 w-3" />
    ) : (
      <Bell aria-hidden className="h-3 w-3" />
    )}
    {channelLabel(channel)}
  </span>
);

const MetricCard = ({
  available = true,
  description,
  icon,
  label,
  value,
}: {
  available?: boolean;
  description: string;
  icon: ReactNode;
  label: string;
  value: string;
}) => (
  <CardShell className="min-h-36 p-5">
    <div className="flex items-start justify-between gap-3">
      <div className="grid h-12 w-12 place-items-center rounded-full bg-primary-soft text-primary">
        {icon}
      </div>
      <span className="rounded-full bg-surface-muted px-2 py-1 text-[0.65rem] font-bold text-muted">
        real
      </span>
    </div>
    <p className="mt-4 text-sm font-black text-foreground">{label}</p>
    <p className={cn("mt-2 text-3xl font-black tracking-tight", !available && "text-muted")}>
      {value}
    </p>
    <p className="mt-2 text-xs leading-relaxed text-muted">{description}</p>
  </CardShell>
);

const MetricsGrid = ({ metrics }: { metrics: AdminNotificationMetrics }) => {
  const hasReach = metrics.deliveries.reached > 0;
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <MetricCard
        description={`${metrics.campaigns.sent} campanhas enviadas; card conta entregas com status real de alcance.`}
        icon={<Send aria-hidden className="h-5 w-5" />}
        label={`Entregas enviadas (${metrics.period.days} dias)`}
        value={numberFormatter.format(metrics.deliveries.reached)}
      />
      <MetricCard
        description="Usuários únicos com entrega real no período. Push sem subscription não entra no alcance."
        icon={<UsersRound aria-hidden className="h-5 w-5" />}
        label="Usuários alcançados"
        value={numberFormatter.format(metrics.deliveries.reached_users)}
      />
      <MetricCard
        available={hasReach}
        description={
          hasReach
            ? "Baseada em read_at/click real persistido."
            : "Indisponível sem entrega real no período."
        }
        icon={<Eye aria-hidden className="h-5 w-5" />}
        label="Taxa de abertura média"
        value={hasReach ? formatPercent(metrics.rates.open_rate_percent) : "—"}
      />
      <MetricCard
        available={hasReach}
        description={
          hasReach
            ? "Baseada apenas em clicked_at real."
            : "Indisponível sem entrega real no período."
        }
        icon={<MousePointerClick aria-hidden className="h-5 w-5" />}
        label="Taxa de cliques média"
        value={hasReach ? formatPercent(metrics.rates.click_rate_percent) : "—"}
      />
    </div>
  );
};

const Header = ({
  onNew,
  range,
  setRange,
}: {
  onNew: () => void;
  range: { from: string; to: string };
  setRange: (range: { from: string; to: string }) => void;
}) => (
  <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
    <div>
      <h1 className="text-3xl font-black tracking-tight text-foreground md:text-4xl">
        Notificações
      </h1>
      <p className="mt-2 max-w-2xl text-sm font-medium text-muted">
        Gerencie e envie notificações reais para usuários da plataforma. Esta área não é uma caixa
        de entrada do administrador.
      </p>
      <p className="mt-2 text-xs font-bold text-muted">
        Referência visual usada: _product/proto/admin/Notificações.png.
      </p>
    </div>
    <div className="flex flex-col gap-3 xl:items-end">
      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
        <label className="text-xs font-black text-muted">
          De
          <input
            className="mt-1 h-11 w-full rounded-control border border-border bg-surface px-3 text-sm font-bold text-foreground shadow-control focus:border-primary"
            max={range.to}
            onChange={(event) => setRange({ ...range, from: event.target.value })}
            type="date"
            value={range.from}
          />
        </label>
        <label className="text-xs font-black text-muted">
          Até
          <input
            className="mt-1 h-11 w-full rounded-control border border-border bg-surface px-3 text-sm font-bold text-foreground shadow-control focus:border-primary"
            min={range.from}
            onChange={(event) => setRange({ ...range, to: event.target.value })}
            type="date"
            value={range.to}
          />
        </label>
        <button
          className="inline-flex h-11 items-center justify-center gap-2 self-end rounded-control bg-primary px-4 text-sm font-black text-white shadow-admin-soft transition hover:bg-primary-hover"
          onClick={onNew}
          type="button"
        >
          <Plus aria-hidden className="h-4 w-4" />
          Nova notificação
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {QUICK_RANGES.map((days) => (
          <button
            className="rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-black text-muted transition hover:border-primary hover:text-primary"
            key={days}
            onClick={() => setRange(getQuickRange(days))}
            type="button"
          >
            Últimos {days} dias
          </button>
        ))}
      </div>
    </div>
  </div>
);

const FiltersBar = ({
  filters,
  setFilters,
}: {
  filters: NotificationsFilters;
  setFilters: (filters: NotificationsFilters) => void;
}) => (
  <CardShell className="p-4">
    <div className="grid gap-3 lg:grid-cols-[1.2fr_1fr_1fr_1.6fr]">
      <label className="text-xs font-black text-muted">
        Público
        <select
          className="mt-1 h-11 w-full rounded-control border border-border bg-surface px-3 text-sm font-bold text-foreground shadow-control outline-none focus:border-primary"
          onChange={(event) =>
            setFilters({
              ...filters,
              audience: event.target.value as NotificationsFilters["audience"],
            })
          }
          value={filters.audience}
        >
          <option value="all">Todos</option>
          {AUDIENCE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <label className="text-xs font-black text-muted">
        Canal
        <select
          className="mt-1 h-11 w-full rounded-control border border-border bg-surface px-3 text-sm font-bold text-foreground shadow-control outline-none focus:border-primary"
          onChange={(event) =>
            setFilters({
              ...filters,
              channel: event.target.value as NotificationsFilters["channel"],
            })
          }
          value={filters.channel}
        >
          <option value="all">Todos</option>
          <option value="in_app">In-app</option>
          <option value="push">Push</option>
        </select>
      </label>
      <button
        className="h-11 self-end rounded-control border border-border bg-surface px-4 text-sm font-black text-muted transition hover:border-border-strong hover:text-foreground"
        onClick={() => setFilters({ audience: "all", channel: "all", q: "" })}
        type="button"
      >
        Limpar filtros
      </button>
      <label className="text-xs font-black text-muted">
        Buscar por título ou conteúdo
        <span className="relative mt-1 block">
          <Search
            aria-hidden
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle"
          />
          <input
            className="h-11 w-full rounded-control border border-border bg-surface pl-9 pr-3 text-sm font-bold text-foreground shadow-control outline-none focus:border-primary"
            onChange={(event) => setFilters({ ...filters, q: event.target.value })}
            placeholder="Buscar campanha..."
            value={filters.q}
          />
        </span>
      </label>
    </div>
  </CardShell>
);

const ErrorState = ({ message, onRetry }: { message: string; onRetry: () => void }) => (
  <CardShell className="p-5">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex gap-3">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-red-50 text-danger">
          <AlertTriangle aria-hidden className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-black">Não foi possível carregar notificações</h2>
          <p className="mt-1 text-sm text-muted">{message}</p>
        </div>
      </div>
      <button
        className="inline-flex h-11 items-center justify-center gap-2 rounded-control border border-border bg-surface px-4 text-sm font-black text-foreground transition hover:border-border-strong"
        onClick={onRetry}
        type="button"
      >
        <RefreshCw aria-hidden className="h-4 w-4" />
        Tentar novamente
      </button>
    </div>
  </CardShell>
);

const LoadingCards = () => (
  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
    {["sent", "users", "open", "click"].map((key) => (
      <CardShell className="h-36 animate-pulse bg-surface-muted" key={key} />
    ))}
  </div>
);

const ChannelCheckbox = ({
  control,
  disabled,
  label,
  name,
}: {
  control: Control<NotificationFormValues>;
  disabled?: boolean;
  label: string;
  name: "in_app" | "push";
}) => {
  const { field } = useController({ control, name });

  return (
    <label className="flex min-h-12 items-center gap-3 rounded-2xl border border-border bg-surface px-4 text-sm font-black text-foreground shadow-control">
      <input
        checked={Boolean(field.value)}
        className="h-5 w-5 accent-primary"
        disabled={disabled}
        onChange={(event) => field.onChange(event.target.checked)}
        type="checkbox"
      />
      {label}
    </label>
  );
};

const CampaignDetailsModal = ({
  campaign,
  onClose,
}: {
  campaign: AdminNotificationCampaign;
  onClose: () => void;
}) => (
  <div className="fixed inset-0 z-50 flex items-end justify-center bg-overlay p-3 sm:items-center">
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
          ["Status", STATUS_COPY[campaign.status].label],
          ["Público", audienceLabel(campaign.audience)],
          ["Canais", channelText(campaign.channels)],
          ["Redirect", campaign.redirect || "—"],
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

const CampaignsList = ({
  campaigns,
  count,
  isFetching,
  onCancel,
  onDetails,
  onEdit,
  onNext,
  onPrev,
  page,
  pages,
}: {
  campaigns: AdminNotificationCampaign[];
  count: number;
  isFetching: boolean;
  onCancel: (campaign: AdminNotificationCampaign) => void;
  onDetails: (campaign: AdminNotificationCampaign) => void;
  onEdit: (campaign: AdminNotificationCampaign) => void;
  onNext: () => void;
  onPrev: () => void;
  page: number;
  pages: number;
}) => (
  <CardShell className="overflow-hidden">
    <div className="flex flex-col gap-2 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 className="text-lg font-black">Campanhas manuais</h2>
        <p className="text-sm text-muted">
          {numberFormatter.format(count)} campanha(s) encontrada(s). Status e entregas vêm do
          backend real.
        </p>
      </div>
      {isFetching ? (
        <span className="inline-flex items-center gap-2 text-xs font-black text-muted">
          <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
          Atualizando
        </span>
      ) : null}
    </div>
    {campaigns.length === 0 ? (
      <div className="p-6 text-sm font-bold text-muted">
        Nenhuma campanha manual encontrada para os filtros atuais.
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
                        className="grid h-10 w-10 place-items-center rounded-xl border border-border bg-surface text-danger transition hover:border-danger"
                        onClick={() => onCancel(campaign)}
                        title="Cancelar"
                        type="button"
                      >
                        <Trash2 aria-hidden className="h-4 w-4" />
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
    <Pager onNext={onNext} onPrev={onPrev} page={page} pages={pages} />
  </CardShell>
);

const Pager = ({
  onNext,
  onPrev,
  page,
  pages,
}: {
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
        disabled={page <= 1}
        onClick={onPrev}
        type="button"
      >
        <ChevronLeft aria-hidden className="h-4 w-4" />
        Anterior
      </button>
      <button
        className="inline-flex h-10 items-center gap-2 rounded-control border border-border bg-surface px-3 text-sm font-black text-muted disabled:opacity-50"
        disabled={page >= pages}
        onClick={onNext}
        type="button"
      >
        Próxima
        <ChevronRight aria-hidden className="h-4 w-4" />
      </button>
    </div>
  </div>
);

const AutomaticLogs = ({
  count,
  data,
  isFetching,
  onNext,
  onPrev,
  page,
  pages,
}: {
  count: number;
  data: AdminNotificationAutomaticLog[];
  isFetching: boolean;
  onNext: () => void;
  onPrev: () => void;
  page: number;
  pages: number;
}) => (
  <CardShell className="overflow-hidden">
    <div className="flex flex-col gap-2 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 className="text-lg font-black">Logs de notificações automáticas</h2>
        <p className="text-sm text-muted">
          Histórico somente leitura gerado pelo dispatcher real da plataforma.
        </p>
      </div>
      {isFetching ? (
        <span className="inline-flex items-center gap-2 text-xs font-black text-muted">
          <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
          Atualizando
        </span>
      ) : null}
    </div>
    {data.length === 0 ? (
      <div className="p-6 text-sm font-bold text-muted">
        Nenhum log automático real encontrado para o período atual.
      </div>
    ) : (
      <div className="overflow-x-auto">
        <table className="min-w-[960px] w-full border-collapse text-left text-sm">
          <thead className="bg-surface-muted text-xs uppercase tracking-[0.08em] text-muted">
            <tr>
              <th className="px-4 py-3">Notificação automática</th>
              <th className="px-4 py-3">Disparo</th>
              <th className="px-4 py-3">Público</th>
              <th className="px-4 py-3">Canal</th>
              <th className="px-4 py-3">Enviada em</th>
              <th className="px-4 py-3">Alcance</th>
              <th className="px-4 py-3">Abertura</th>
              <th className="px-4 py-3">Cliques</th>
            </tr>
          </thead>
          <tbody>
            {data.map((log) => {
              const reached = ["sent", "delivered", "read", "clicked"].includes(log.status);
              const opened = Boolean(
                log.read_at || log.clicked_at || ["read", "clicked"].includes(log.status),
              );
              const clicked = Boolean(log.clicked_at || log.status === "clicked");
              const title =
                log.notification?.message_key || log.trigger_key || "notificação automática";
              return (
                <tr className="border-t border-border align-top" key={log.id}>
                  <td className="px-4 py-4 font-black text-foreground">{title}</td>
                  <td className="px-4 py-4 text-sm font-bold text-muted">
                    {log.trigger_key || "—"}
                  </td>
                  <td className="px-4 py-4 text-sm font-bold text-muted">
                    {log.user?.role || "usuário"}
                  </td>
                  <td className="px-4 py-4">
                    <ChannelPill channel={log.channel} />
                  </td>
                  <td className="px-4 py-4 text-sm font-bold text-muted">
                    {formatDateTime(log.sent_at || log.delivered_at || log.created_at)}
                  </td>
                  <td className="px-4 py-4 font-black">{reached ? "1" : "—"}</td>
                  <td className="px-4 py-4 font-black">{opened ? "1" : "—"}</td>
                  <td className="px-4 py-4 font-black">{clicked ? "1" : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    )}
    <div className="border-t border-border">
      <div className="px-4 pt-4 text-xs font-bold text-muted">
        Mostrando logs reais: {numberFormatter.format(count)} registro(s)
      </div>
      <Pager onNext={onNext} onPrev={onPrev} page={page} pages={pages} />
    </div>
  </CardShell>
);

const pushUnavailableCopy = (push?: AdminNotificationPushStatus) => {
  if (!push) return "Verificando disponibilidade real de push no backend.";
  if (push.available) return null;
  if (!push.configured) return "Push oculto: VAPID não está configurado no backend.";
  if (push.active_subscriptions === 0)
    return "Push oculto: nenhum usuário possui subscription real ativa.";
  return "Push oculto por indisponibilidade real do backend.";
};

const NewNotificationModal = ({
  campaign,
  onClose,
  push,
}: {
  campaign?: AdminNotificationCampaign | null;
  onClose: () => void;
  push?: AdminNotificationPushStatus;
}) => {
  const createCampaign = useAdminNotificationCreateCampaign();
  const updateCampaign = useAdminNotificationUpdateCampaign();
  const sendCampaign = useAdminNotificationSendCampaign();
  const scheduleCampaign = useAdminNotificationScheduleCampaign();
  const [intent, setIntent] = useState<SubmitIntent>("draft");
  const pushAvailable = Boolean(push?.available);
  const form = useForm<NotificationFormValues>({
    defaultValues: {
      audience: campaign?.audience ?? "all_users",
      body: campaign?.body ?? "",
      delivery_mode: "draft",
      in_app: campaign?.channels.includes("in_app") ?? true,
      push: pushAvailable ? (campaign?.channels.includes("push") ?? false) : false,
      redirect: campaign?.redirect ?? "",
      scheduled_at: toInputDateTime(campaign?.scheduled_at),
      title: campaign?.title ?? "",
    },
    mode: "onSubmit",
    resolver: zodResolver(notificationFormSchema),
  });
  useEffect(() => {
    form.setValue("push", pushAvailable ? (campaign?.channels.includes("push") ?? false) : false);
  }, [campaign, form, pushAvailable]);
  const preview = useWatch({ control: form.control });
  const pending =
    createCampaign.isPending ||
    updateCampaign.isPending ||
    sendCampaign.isPending ||
    scheduleCampaign.isPending;
  const unavailablePush = pushUnavailableCopy(push);

  const submit = async (values: NotificationFormValues) => {
    if (
      values.delivery_mode === "send_now" &&
      !window.confirm(
        "Enviar esta notificação agora para o público selecionado? Esta ação materializa entregas reais.",
      )
    )
      return;
    const channels: AdminNotificationChannel[] = [
      ...(values.in_app ? ["in_app" as const] : []),
      ...(values.push && pushAvailable ? ["push" as const] : []),
    ];
    const payload: AdminNotificationCampaignPayload = {
      audience: values.audience,
      body: values.body.trim(),
      channels,
      redirect: values.redirect?.trim() || null,
      title: values.title.trim(),
    };
    try {
      const saved = campaign
        ? await updateCampaign.mutateAsync({ id: campaign.id, input: payload })
        : await createCampaign.mutateAsync(payload);
      if (values.delivery_mode === "send_now") {
        const result = await sendCampaign.mutateAsync(saved.id);
        toast.success(
          `Campanha enviada. Entregas reais: ${numberFormatter.format(result.summary.total_deliveries)}.`,
        );
      } else if (values.delivery_mode === "schedule") {
        await scheduleCampaign.mutateAsync({
          id: saved.id,
          scheduledAt: new Date(values.scheduled_at || "").toISOString(),
        });
        toast.success("Campanha agendada com dados reais.");
      } else {
        toast.success("Rascunho salvo.");
      }
      onClose();
    } catch (error) {
      toast.error(resolveApiError(error));
    }
  };

  const submitWithIntent = (nextIntent: SubmitIntent) => {
    setIntent(nextIntent);
    form.setValue("delivery_mode", nextIntent, { shouldDirty: true, shouldValidate: false });
    void form.handleSubmit(submit)();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-overlay p-3 sm:items-center">
      <CardShell className="max-h-[94dvh] w-full max-w-3xl overflow-y-auto p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-primary">
              {campaign ? "Editar rascunho" : "Nova notificação"}
            </p>
            <h2 className="mt-2 text-2xl font-black text-foreground">
              Criar campanha manual para usuários
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              Canais de e-mail, SMS e WhatsApp estão fora da V1. Logs automáticos são somente
              leitura.
            </p>
          </div>
          <button
            aria-label="Fechar criação de notificação"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-border bg-surface text-muted transition hover:text-foreground"
            disabled={pending}
            onClick={onClose}
            type="button"
          >
            <X aria-hidden className="h-5 w-5" />
          </button>
        </div>
        <FormProvider {...form}>
          <form
            className="mt-6 grid gap-5 lg:grid-cols-[1.1fr_0.9fr]"
            noValidate
            onSubmit={form.handleSubmit(submit)}
          >
            <div className="space-y-4">
              <InputController<NotificationFormValues>
                disabled={pending}
                label="Título"
                name="title"
                placeholder="Ex.: Nova comunidade: TDAH"
                required
              />
              <TextareaController<NotificationFormValues>
                disabled={pending}
                label="Mensagem"
                name="body"
                placeholder="Escreva a mensagem curta exibida na notificação in-app."
                required
                rows={5}
              />
              <SelectController<NotificationFormValues>
                disabled={pending}
                label="Público"
                name="audience"
                options={AUDIENCE_OPTIONS}
                required
              />
              <div>
                <p className="mb-2 text-sm font-semibold text-foreground">Canais *</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <ChannelCheckbox
                    control={form.control}
                    disabled={pending}
                    label="In-app"
                    name="in_app"
                  />
                  {pushAvailable ? (
                    <ChannelCheckbox
                      control={form.control}
                      disabled={pending}
                      label="Push"
                      name="push"
                    />
                  ) : null}
                </div>
                <span className="mt-1 block min-h-5 text-xs font-medium text-danger">
                  {form.formState.errors.in_app?.message || ""}
                </span>
                {unavailablePush ? (
                  <p className="rounded-2xl border border-border bg-surface-muted p-3 text-xs font-bold text-muted">
                    {unavailablePush}
                  </p>
                ) : null}
              </div>
              <InputController<NotificationFormValues>
                disabled={pending}
                label="Redirect interno opcional"
                name="redirect"
                placeholder="/app/comunidades"
              />
              <InputController<NotificationFormValues>
                disabled={pending || intent !== "schedule"}
                label="Data de agendamento"
                name="scheduled_at"
                type="datetime-local"
              />
            </div>
            <aside className="space-y-4">
              <div className="rounded-2xl border border-border bg-surface-muted p-4">
                <p className="text-sm font-black text-foreground">Preview simples</p>
                <div className="mt-3 rounded-2xl border border-border bg-surface p-4 shadow-control">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-primary">
                    Lectum
                  </p>
                  <h3 className="mt-2 text-lg font-black text-foreground">
                    {preview.title || "Título da notificação"}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-muted">
                    {preview.body || "Mensagem que será enviada aos usuários selecionados."}
                  </p>
                </div>
              </div>
              <div className="rounded-2xl border border-border bg-surface-muted p-4 text-sm leading-6 text-muted">
                <p className="font-black text-foreground">Resumo do envio</p>
                <ul className="mt-2 space-y-1">
                  <li>Público: {preview.audience ? audienceLabel(preview.audience) : "—"}</li>
                  <li>
                    Canais: {preview.in_app ? "In-app" : ""}
                    {preview.in_app && preview.push ? " + " : ""}
                    {preview.push && pushAvailable ? "Push" : !preview.in_app ? "—" : ""}
                  </li>
                  <li>Redirect: {preview.redirect || "sem redirect"}</li>
                </ul>
              </div>
              <div className="grid gap-3">
                <button
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-control border border-border bg-surface px-4 text-sm font-black text-foreground transition hover:border-border-strong disabled:opacity-60"
                  disabled={pending}
                  onClick={() => submitWithIntent("draft")}
                  type="button"
                >
                  <CopyCheck aria-hidden className="h-4 w-4" />
                  Salvar rascunho
                </button>
                <button
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-control border border-border bg-surface px-4 text-sm font-black text-foreground transition hover:border-border-strong disabled:opacity-60"
                  disabled={pending}
                  onClick={() => submitWithIntent("schedule")}
                  type="button"
                >
                  <Clock3 aria-hidden className="h-4 w-4" />
                  Agendar
                </button>
                <button
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-control bg-primary px-4 text-sm font-black text-white shadow-admin-soft transition hover:bg-primary-hover disabled:opacity-60"
                  disabled={pending}
                  onClick={() => submitWithIntent("send_now")}
                  type="button"
                >
                  {pending ? (
                    <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send aria-hidden className="h-4 w-4" />
                  )}
                  Enviar agora
                </button>
              </div>
            </aside>
          </form>
        </FormProvider>
      </CardShell>
    </div>
  );
};

export const AdminNotificationsClient = () => {
  const [range, setRange] = useState(getQuickRange(30));
  const [tab, setTab] = useState("all");
  const [filters, setFilters] = useState<NotificationsFilters>({
    audience: "all",
    channel: "all",
    q: "",
  });
  const [page, setPage] = useState(1);
  const [logsPage, setLogsPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AdminNotificationCampaign | null>(null);
  const [details, setDetails] = useState<AdminNotificationCampaign | null>(null);
  const currentTab = TABS.find((item) => item.value === tab) ?? TABS[0];
  const campaignQuery = useMemo(
    () => ({
      audience: filters.audience === "all" ? undefined : filters.audience,
      channel: filters.channel === "all" ? undefined : filters.channel,
      from: range.from,
      limit: CAMPAIGN_LIMIT,
      page,
      q: filters.q.trim() || undefined,
      status: currentTab.status,
      to: range.to,
    }),
    [currentTab.status, filters, page, range],
  );
  const logsQuery = useMemo(
    () => ({
      channel: filters.channel === "all" ? undefined : filters.channel,
      from: range.from,
      limit: LOGS_LIMIT,
      page: logsPage,
      to: range.to,
    }),
    [filters.channel, logsPage, range],
  );
  const metrics = useAdminNotificationMetrics(range);
  const campaigns = useAdminNotificationCampaigns(campaignQuery);
  const logs = useAdminNotificationAutomaticLogs(logsQuery);
  const push = useAdminNotificationPushStatus();
  const cancelCampaign = useAdminNotificationCancelCampaign();
  const firstError = metrics.error || campaigns.error || logs.error || push.error;

  const resetPagination = () => {
    setPage(1);
    setLogsPage(1);
  };
  const updateRange = (nextRange: { from: string; to: string }) => {
    setRange(nextRange);
    resetPagination();
  };
  const updateFilters = (nextFilters: NotificationsFilters) => {
    setFilters(nextFilters);
    resetPagination();
  };
  const updateTab = (nextTab: string) => {
    setTab(nextTab);
    resetPagination();
  };

  const handleCancel = async (campaign: AdminNotificationCampaign) => {
    if (!window.confirm(`Cancelar a campanha "${campaign.title}"?`)) return;
    try {
      await cancelCampaign.mutateAsync(campaign.id);
      toast.success("Campanha cancelada.");
    } catch (error) {
      toast.error(resolveApiError(error));
    }
  };

  return (
    <div className="space-y-6">
      <Header
        onNew={() => {
          setEditing(null);
          setModalOpen(true);
        }}
        range={range}
        setRange={updateRange}
      />
      {firstError ? (
        <ErrorState
          message={resolveApiError(firstError)}
          onRetry={() => {
            void metrics.refetch();
            void campaigns.refetch();
            void logs.refetch();
            void push.refetch();
          }}
        />
      ) : null}
      {metrics.isLoading ? (
        <LoadingCards />
      ) : metrics.data ? (
        <MetricsGrid metrics={metrics.data} />
      ) : null}
      <CardShell className="p-4">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {TABS.map((item) => (
            <button
              className={cn(
                "h-11 shrink-0 rounded-full px-4 text-sm font-black transition",
                item.value === tab
                  ? "bg-primary text-white shadow-admin-soft"
                  : "bg-surface-muted text-muted hover:text-foreground",
              )}
              key={item.value}
              onClick={() => updateTab(item.value)}
              type="button"
            >
              {item.label}
            </button>
          ))}
        </div>
      </CardShell>
      <FiltersBar filters={filters} setFilters={updateFilters} />
      <div className="rounded-2xl border border-border bg-surface-muted p-4 text-sm leading-6 text-muted">
        <div className="flex gap-3">
          <Megaphone aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <p>
            Esta tela cria campanhas manuais com entregas reais. Métricas de abertura e clique só
            aparecem quando existem eventos persistidos de leitura ou clique. E-mail não existe
            nesta V1.
          </p>
        </div>
      </div>
      <CampaignsList
        campaigns={campaigns.data?.data ?? []}
        count={campaigns.data?.count ?? 0}
        isFetching={campaigns.isFetching}
        onCancel={handleCancel}
        onDetails={setDetails}
        onEdit={(campaign) => {
          setEditing(campaign);
          setModalOpen(true);
        }}
        onNext={() => setPage((current) => current + 1)}
        onPrev={() => setPage((current) => Math.max(1, current - 1))}
        page={campaigns.data?.page ?? page}
        pages={campaigns.data?.pages ?? 1}
      />
      <AutomaticLogs
        count={logs.data?.count ?? 0}
        data={logs.data?.data ?? []}
        isFetching={logs.isFetching}
        onNext={() => setLogsPage((current) => current + 1)}
        onPrev={() => setLogsPage((current) => Math.max(1, current - 1))}
        page={logs.data?.page ?? logsPage}
        pages={logs.data?.pages ?? 1}
      />
      <div className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-4 text-xs font-bold text-muted sm:flex-row sm:items-center sm:justify-between">
        <span className="inline-flex items-center gap-2">
          <CheckCircle2 aria-hidden className="h-4 w-4 text-success" />
          Mobile-first: cards empilhados, abas roláveis e tabelas com scroll horizontal acessível.
        </span>
        <span>
          <CalendarDays aria-hidden className="mr-1 inline h-4 w-4" />
          {formatDate(range.from)} — {formatDate(range.to)}
        </span>
      </div>
      {modalOpen ? (
        <NewNotificationModal
          campaign={editing}
          onClose={() => {
            setModalOpen(false);
            setEditing(null);
          }}
          push={push.data}
        />
      ) : null}
      {details ? (
        <CampaignDetailsModal campaign={details} onClose={() => setDetails(null)} />
      ) : null}
    </div>
  );
};
