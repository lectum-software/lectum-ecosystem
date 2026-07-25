"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertTriangle,
  Bell,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  CopyCheck,
  Edit3,
  Eye,
  Loader2,
  Mail,
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
import {
  type FocusEventHandler,
  type ReactNode,
  type SVGProps,
  useEffect,
  useMemo,
  useState,
} from "react";
import { type Control, FormProvider, useController, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import {
  useAdminNotificationAutomaticLogs,
  useAdminNotificationCampaigns,
  useAdminNotificationCancelCampaign,
  useAdminNotificationCreateCampaign,
  useAdminNotificationEmailStatus,
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
  type AdminNotificationEmailStatus,
  type AdminNotificationMetrics,
  type AdminNotificationPushStatus,
  type AdminNotificationsRangeQuery,
  type NotificationDeliveryStatus,
} from "@/api/req/notifications";
import { InputController, SelectController, TextareaController } from "@/components/controllers";
import { useDateRangeCommitOnBlur } from "@/hooks/use-date-range-commit-on-blur";
import { cn } from "@/lib/utils";

type NotificationPeriodValue = NonNullable<AdminNotificationsRangeQuery["period"]>;
type NotificationPeriodPreset = Exclude<NotificationPeriodValue, "custom">;

const NOTIFICATION_PERIOD_OPTIONS = [
  { id: "today", label: "Hoje" },
  { id: "week", label: "Esta semana" },
  { id: "month", label: "Este mês" },
  { id: "year", label: "Este ano" },
  { id: "7d", label: "Últimos 7 dias" },
  { id: "30d", label: "Últimos 30 dias" },
  { id: "90d", label: "Últimos 90 dias" },
  { id: "all", label: "Todo o período" },
] as const satisfies ReadonlyArray<{
  id: NotificationPeriodPreset;
  label: string;
}>;
type NotificationRange = { from: string; to: string };
type NotificationTableFilters = {
  audience: "all" | AdminNotificationAudience;
  channel: "all" | AdminNotificationChannel;
  q: string;
};

const CAMPAIGN_LIMIT = 8;
const LOGS_LIMIT = 8;
const MAX_NOTIFICATION_PERIOD_DAYS = 3660;
const NOTIFICATION_DEFAULT_PERIOD: NotificationPeriodPreset = "all";
const tableRangeErrorMessage =
  "Informe um período de até 3660 dias, com data inicial menor ou igual à final.";
const cardClass =
  "rounded-card border border-border/80 bg-surface/95 shadow-admin-soft backdrop-blur";

const useDocumentScrollLock = (locked: boolean) => {
  useEffect(() => {
    if (!locked || typeof document === "undefined") return;

    const { body, documentElement } = document;
    const previousBodyOverflow = body.style.overflow;
    const previousDocumentOverflow = documentElement.style.overflow;
    const previousBodyOverscrollBehavior = body.style.overscrollBehavior;
    const previousDocumentOverscrollBehavior = documentElement.style.overscrollBehavior;

    body.style.overflow = "hidden";
    documentElement.style.overflow = "hidden";
    body.style.overscrollBehavior = "none";
    documentElement.style.overscrollBehavior = "none";

    return () => {
      body.style.overflow = previousBodyOverflow;
      documentElement.style.overflow = previousDocumentOverflow;
      body.style.overscrollBehavior = previousBodyOverscrollBehavior;
      documentElement.style.overscrollBehavior = previousDocumentOverscrollBehavior;
    };
  }, [locked]);
};

const AUDIENCE_OPTIONS: Array<{ label: string; value: AdminNotificationAudience }> = [
  { label: "Todos os usuários", value: "all_users" },
  { label: "Pacientes", value: "patients" },
  { label: "Psicólogos", value: "psychologists" },
  { label: "Pacientes ativos", value: "active_patients" },
  { label: "Psicólogos ativos", value: "active_psychologists" },
];

const CAMPAIGN_STATUS_OPTIONS: Array<{
  label: string;
  status?: AdminNotificationCampaignStatus;
  value: string;
}> = [
  { label: "Todas", value: "all" },
  { label: "Agendadas", status: "scheduled", value: "scheduled" },
  { label: "Enviadas", status: "sent", value: "sent" },
  { label: "Rascunhos", status: "draft", value: "draft" },
  { label: "Canceladas", status: "canceled", value: "canceled" },
];

const DELIVERY_STATUS_OPTIONS: Array<{
  label: string;
  status?: NotificationDeliveryStatus;
  value: string;
}> = [
  { label: "Todos", value: "all" },
  { label: "Na fila", status: "queued", value: "queued" },
  { label: "Enviadas", status: "sent", value: "sent" },
  { label: "Entregues", status: "delivered", value: "delivered" },
  { label: "Lidas", status: "read", value: "read" },
  { label: "Clicadas", status: "clicked", value: "clicked" },
  { label: "Falhas", status: "failed", value: "failed" },
  { label: "Omitidas", status: "skipped", value: "skipped" },
];

const STATUS_COPY: Record<AdminNotificationCampaignStatus, { label: string; className: string }> = {
  canceled: { className: "bg-danger/10 text-danger", label: "Cancelada" },
  draft: { className: "bg-surface-muted text-muted", label: "Rascunho" },
  failed: { className: "bg-danger/10 text-danger", label: "Falhou" },
  scheduled: { className: "bg-primary-soft text-primary", label: "Agendada" },
  sending: { className: "bg-warning/10 text-warning", label: "Enviando" },
  sent: { className: "bg-success/10 text-success", label: "Enviada" },
};
const DELIVERY_STATUS_COPY: Record<
  NotificationDeliveryStatus,
  { label: string; className: string }
> = {
  clicked: { className: "bg-primary-soft text-primary", label: "Clicada" },
  delivered: { className: "bg-success/10 text-success", label: "Entregue" },
  failed: { className: "bg-danger/10 text-danger", label: "Falhou" },
  queued: { className: "bg-surface-muted text-muted", label: "Na fila" },
  read: { className: "bg-success/10 text-success", label: "Lida" },
  sent: { className: "bg-primary-soft text-primary", label: "Enviada" },
  skipped: { className: "bg-warning/10 text-warning", label: "Omitida" },
};

const numberFormatter = new Intl.NumberFormat("pt-BR");
const percentFormatter = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });
const dateTimeFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
});
const pad = (value: number) => String(value).padStart(2, "0");
const toInputDate = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const startOfCurrentWeek = () => {
  const today = new Date();
  const day = today.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const start = new Date(today);
  start.setDate(today.getDate() + mondayOffset);

  return start;
};

const startOfCurrentMonth = () => {
  const today = new Date();
  return new Date(today.getFullYear(), today.getMonth(), 1);
};

const startOfCurrentYear = () => {
  const today = new Date();
  return new Date(today.getFullYear(), 0, 1);
};

const startOfLastDays = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() - (days - 1));

  return date;
};

const getRangeForPeriod = (period: NotificationPeriodPreset): NotificationRange => {
  const today = toInputDate(new Date());

  if (period === "today") return { from: today, to: today };
  if (period === "all") return { from: "", to: today };
  if (period === "month") return { from: toInputDate(startOfCurrentMonth()), to: today };
  if (period === "year") return { from: toInputDate(startOfCurrentYear()), to: today };
  if (period === "7d") return { from: toInputDate(startOfLastDays(7)), to: today };
  if (period === "30d") return { from: toInputDate(startOfLastDays(30)), to: today };
  if (period === "90d") return { from: toInputDate(startOfLastDays(90)), to: today };

  return { from: toInputDate(startOfCurrentWeek()), to: today };
};

const buildNotificationPeriodQuery = (
  period: NotificationPeriodValue,
  range: NotificationRange,
): AdminNotificationsRangeQuery =>
  period === "custom" ? { from: range.from, period, to: range.to } : { period };

const createDefaultTableFilters = (): NotificationTableFilters => ({
  audience: "all",
  channel: "all",
  q: "",
});
const dateFromInput = (value: string) => {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day, 12, 0, 0, 0);
};
const daysBetweenInclusive = (from: Date, to: Date) =>
  Math.floor((to.getTime() - from.getTime()) / 86_400_000) + 1;
const isValidRange = (range: { from?: string; to?: string }) => {
  if (!range.from || !range.to) return false;

  const from = dateFromInput(range.from);
  const to = dateFromInput(range.to);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to) return false;

  return daysBetweenInclusive(from, to) <= MAX_NOTIFICATION_PERIOD_DAYS;
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
const formatPercent = (value: number) => `${percentFormatter.format(value)}%`;
const audienceLabel = (value: AdminNotificationAudience) =>
  AUDIENCE_OPTIONS.find((item) => item.value === value)?.label ?? value;
const roleLabel = (value?: null | string) => {
  if (value === "psicologo") return "Psicólogo";
  if (value === "paciente") return "Paciente";

  return "Usuário";
};
const VerifiedBadgeIcon = ({ className, ...props }: SVGProps<SVGSVGElement>) => (
  <svg
    className={cn("h-4 w-4 shrink-0 text-primary", className)}
    fill="none"
    viewBox="0 0 30 28"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <title>Perfil verificado</title>
    <path
      d="M10.3636 28L7.77273 23.7333L2.86364 22.6667L3.34091 17.7333L0 14L3.34091 10.2667L2.86364 5.33333L7.77273 4.26667L10.3636 0L15 1.93333L19.6364 0L22.2273 4.26667L27.1364 5.33333L26.6591 10.2667L30 14L26.6591 17.7333L27.1364 22.6667L22.2273 23.7333L19.6364 28L15 26.0667L10.3636 28ZM13.5682 18.7333L21.2727 11.2L19.3636 9.26667L13.5682 14.9333L10.6364 12.1333L8.72727 14L13.5682 18.7333Z"
      fill="currentColor"
    />
  </svg>
);
type NotificationRecipient = AdminNotificationAutomaticLog["user"];
const recipientName = (user: NotificationRecipient) => user.name?.trim() || user.email || "Usuário";
const recipientHasVerifiedBadge = (user: NotificationRecipient) =>
  user.role === "psicologo" &&
  (Boolean(user.psychologist_profile?.cfp_verified_at) ||
    user.psychologist_profile?.crp_status === "aprovado");
const CHANNEL_LABELS: Record<AdminNotificationChannel, string> = {
  email: "E-mail",
  in_app: "In-app",
  push: "Push",
};
const channelLabel = (value: AdminNotificationChannel) => CHANNEL_LABELS[value] ?? value;
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
    email: z.boolean(),
    in_app: z.boolean(),
    push: z.boolean(),
    redirect: internalRedirect,
    scheduled_at: z.string().optional(),
    title: z.string().trim().min(3, "Informe o título.").max(120, "Use até 120 caracteres."),
  })
  .superRefine((values, context) => {
    if (!values.email && !values.in_app && !values.push) {
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

const DeliveryStatusBadge = ({ status }: { status: NotificationDeliveryStatus }) => (
  <span
    className={cn(
      "inline-flex rounded-full px-2.5 py-1 text-xs font-black",
      DELIVERY_STATUS_COPY[status].className,
    )}
  >
    {DELIVERY_STATUS_COPY[status].label}
  </span>
);

const EngagementCell = ({ log }: { log: AdminNotificationAutomaticLog }) => {
  const clicked = Boolean(log.clicked_at || log.status === "clicked");
  const read = Boolean(log.read_at || clicked || log.status === "read");
  const engagementDateTime = log.clicked_at || log.read_at;
  const formattedEngagementDateTime = engagementDateTime
    ? formatDateTime(engagementDateTime)
    : "Data de engajamento não registrada";

  if (clicked) {
    return (
      <div>
        <span className="inline-flex rounded-full bg-primary-soft px-2.5 py-1 text-xs font-black text-primary">
          Clicada
        </span>
        <p className="mt-1 text-xs font-bold text-muted">{formattedEngagementDateTime}</p>
      </div>
    );
  }

  if (read) {
    return (
      <div>
        <span className="inline-flex rounded-full bg-success/10 px-2.5 py-1 text-xs font-black text-success">
          Lida
        </span>
        <p className="mt-1 text-xs font-bold text-muted">{formattedEngagementDateTime}</p>
      </div>
    );
  }

  return (
    <div>
      <span className="inline-flex rounded-full bg-surface-muted px-2.5 py-1 text-xs font-black text-muted">
        Sem engajamento
      </span>
      <p className="mt-1 text-xs font-bold text-muted">
        {log.channel === "email" ? "Sem data; e-mail sem tracking" : "Sem data de engajamento"}
      </p>
    </div>
  );
};

const ChannelPill = ({ channel }: { channel: AdminNotificationChannel }) => (
  <span className="inline-flex items-center gap-1 rounded-full bg-primary-soft px-2 py-1 text-xs font-black text-primary">
    {channel === "email" ? (
      <Mail aria-hidden className="h-3 w-3" />
    ) : channel === "push" ? (
      <Smartphone aria-hidden className="h-3 w-3" />
    ) : (
      <Bell aria-hidden className="h-3 w-3" />
    )}
    {channelLabel(channel)}
  </span>
);

const RecipientCell = ({ user }: { user: NotificationRecipient }) => (
  <div className="min-w-0">
    <div className="flex min-w-0 items-center gap-1.5">
      <span className="min-w-0 truncate font-black text-foreground">{recipientName(user)}</span>
      {recipientHasVerifiedBadge(user) ? (
        <VerifiedBadgeIcon aria-label="Perfil verificado" className="h-3.5 w-3.5" />
      ) : null}
    </div>
    <p className="mt-0.5 truncate text-xs font-bold text-muted">{roleLabel(user.role)}</p>
  </div>
);

const filterSelectClass =
  "h-11 w-full min-w-0 appearance-none rounded-control border border-border bg-surface py-0 pl-3 pr-11 text-sm font-semibold text-foreground shadow-control outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20";

const FilterSelectChevron = () => (
  <ChevronDown
    aria-hidden
    className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground"
  />
);

const MetricCard = ({
  available = true,
  icon,
  label,
  value,
}: {
  available?: boolean;
  icon: ReactNode;
  label: string;
  value: string;
}) => (
  <CardShell className="min-h-36 p-5">
    <div className="grid h-12 w-12 place-items-center rounded-full bg-primary-soft text-primary">
      {icon}
    </div>
    <p className="mt-4 text-sm font-black text-foreground">{label}</p>
    <p className={cn("mt-2 text-3xl font-black tracking-tight", !available && "text-muted")}>
      {value}
    </p>
  </CardShell>
);

const MetricsGrid = ({ metrics }: { metrics: AdminNotificationMetrics }) => {
  const hasReach = metrics.deliveries.reached > 0;
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <MetricCard
        icon={<Send aria-hidden className="h-5 w-5" />}
        label="Notificações enviadas"
        value={numberFormatter.format(metrics.deliveries.reached)}
      />
      <MetricCard
        icon={<UsersRound aria-hidden className="h-5 w-5" />}
        label="Usuários alcançados"
        value={numberFormatter.format(metrics.deliveries.reached_users)}
      />
      <MetricCard
        available={hasReach}
        icon={<Eye aria-hidden className="h-5 w-5" />}
        label="Taxa de abertura"
        value={hasReach ? formatPercent(metrics.rates.open_rate_percent) : "—"}
      />
      <MetricCard
        available={hasReach}
        icon={<MousePointerClick aria-hidden className="h-5 w-5" />}
        label="Taxa de cliques por abertura"
        value={hasReach ? formatPercent(metrics.rates.click_rate_percent) : "—"}
      />
    </div>
  );
};

const Header = () => (
  <CardShell className="p-5 md:p-6">
    <div className="min-w-0">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">
        Campanhas e logs
      </p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground md:text-4xl">
        Notificações
      </h1>
      <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-muted md:text-base">
        Gerencie e envie notificações reais para usuários da plataforma. Esta área não é uma caixa
        de entrada do administrador.
      </p>
    </div>
  </CardShell>
);

const NotificationTableFiltersBlock = ({
  filters,
  onDateChange,
  onDateControlsBlur,
  onFiltersChange,
  onPeriodChange,
  onStatusChange,
  period,
  range,
  rangeError,
  searchPlaceholder,
  status,
  statusOptions,
}: {
  filters: NotificationTableFilters;
  onDateChange: (field: keyof NotificationRange, value: string) => void;
  onDateControlsBlur: FocusEventHandler<HTMLDivElement>;
  onFiltersChange: (filters: NotificationTableFilters) => void;
  onPeriodChange: (period: NotificationPeriodPreset) => void;
  onStatusChange?: (value: string) => void;
  period: NotificationPeriodValue;
  range: NotificationRange;
  rangeError: string | null;
  searchPlaceholder: string;
  status?: string;
  statusOptions?: ReadonlyArray<{ label: string; value: string }>;
}) => {
  const hasStatusFilter = Boolean(statusOptions && status !== undefined && onStatusChange);

  return (
    <div className="bg-surface/80 p-4 md:p-5">
      <div
        className={cn(
          "grid gap-3 md:grid-cols-2 xl:grid-cols-3",
          hasStatusFilter
            ? "2xl:grid-cols-[minmax(14rem,1.3fr)_minmax(8.5rem,0.75fr)_minmax(8rem,0.7fr)_minmax(8.5rem,0.75fr)_minmax(9.5rem,0.8fr)_minmax(20rem,1.25fr)]"
            : "2xl:grid-cols-[minmax(14rem,1.4fr)_minmax(8.5rem,0.8fr)_minmax(8rem,0.75fr)_minmax(9.5rem,0.8fr)_minmax(20rem,1.25fr)]",
        )}
      >
        <label className="min-w-0 text-xs font-bold text-muted md:col-span-2 xl:col-span-1">
          Barra de pesquisa
          <span className="relative mt-1 block min-w-0">
            <Search
              aria-hidden
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle"
            />
            <input
              className="h-11 w-full min-w-0 rounded-control border border-border bg-surface pl-9 pr-3 text-sm font-semibold text-foreground shadow-control outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              onChange={(event) => onFiltersChange({ ...filters, q: event.target.value })}
              placeholder={searchPlaceholder}
              value={filters.q}
            />
          </span>
        </label>
        <label className="min-w-0 text-xs font-bold text-muted">
          Público
          <span className="relative mt-1 block min-w-0">
            <select
              className={filterSelectClass}
              onChange={(event) =>
                onFiltersChange({
                  ...filters,
                  audience: event.target.value as NotificationTableFilters["audience"],
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
            <FilterSelectChevron />
          </span>
        </label>
        <label className="min-w-0 text-xs font-bold text-muted">
          Canal
          <span className="relative mt-1 block min-w-0">
            <select
              className={filterSelectClass}
              onChange={(event) =>
                onFiltersChange({
                  ...filters,
                  channel: event.target.value as NotificationTableFilters["channel"],
                })
              }
              value={filters.channel}
            >
              <option value="all">Todos</option>
              <option value="in_app">In-app</option>
              <option value="push">Push</option>
              <option value="email">E-mail</option>
            </select>
            <FilterSelectChevron />
          </span>
        </label>
        {hasStatusFilter ? (
          <label className="min-w-0 text-xs font-bold text-muted">
            Status
            <span className="relative mt-1 block min-w-0">
              <select
                className={filterSelectClass}
                onChange={(event) => onStatusChange?.(event.target.value)}
                value={status}
              >
                {statusOptions?.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <FilterSelectChevron />
            </span>
          </label>
        ) : null}
        <label className="min-w-0 text-xs font-bold text-muted">
          Período
          <span className="relative mt-1 block min-w-0">
            <select
              className={filterSelectClass}
              onChange={(event) => onPeriodChange(event.target.value as NotificationPeriodPreset)}
              value={period}
            >
              {period === "custom" ? (
                <option disabled hidden value="custom">
                  Personalizado
                </option>
              ) : null}
              {NOTIFICATION_PERIOD_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
            <FilterSelectChevron />
          </span>
        </label>
        <div className="grid min-w-0 gap-3 sm:grid-cols-2" onBlur={onDateControlsBlur}>
          <label className="min-w-0 text-xs font-bold text-muted">
            De
            <input
              className="mt-1 h-11 w-full min-w-0 rounded-control border border-border bg-surface px-3 text-sm font-semibold text-foreground shadow-control outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              max={range.to || undefined}
              onChange={(event) => onDateChange("from", event.target.value)}
              type="date"
              value={range.from}
            />
          </label>
          <label className="min-w-0 text-xs font-bold text-muted">
            Até
            <input
              className="mt-1 h-11 w-full min-w-0 rounded-control border border-border bg-surface px-3 text-sm font-semibold text-foreground shadow-control outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              min={range.from || undefined}
              onChange={(event) => onDateChange("to", event.target.value)}
              type="date"
              value={range.to}
            />
          </label>
        </div>
      </div>
      {period === "custom" && rangeError ? (
        <p className="mt-3 text-xs font-bold text-danger">{rangeError}</p>
      ) : null}
    </div>
  );
};

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
  name: "email" | "in_app" | "push";
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
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-control bg-primary px-4 text-sm font-bold text-white shadow-admin-soft transition hover:bg-primary-hover sm:w-auto"
          onClick={onNew}
          type="button"
        >
          <Plus aria-hidden className="h-4 w-4" />
          Nova notificação
        </button>
      </div>
    </div>
    {filtersSlot}
    {campaigns.length === 0 ? (
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
    {data.length === 0 ? (
      <div className="p-6 text-sm font-bold text-muted">
        Nenhum log automático real encontrado para os filtros atuais.
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
              const title =
                log.notification?.message_key || log.trigger_key || "notificação automática";
              return (
                <tr className="border-t border-border align-top" key={log.id}>
                  <td className="px-4 py-4 font-black text-foreground">{title}</td>
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
                    {log.failure_reason ? (
                      <p className="mt-1 max-w-56 text-xs font-bold leading-5 text-muted">
                        {log.failure_reason}
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
    <Pager onNext={onNext} onPrev={onPrev} page={page} pages={pages} />
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

const emailUnavailableCopy = (email?: AdminNotificationEmailStatus) => {
  if (!email) return "Verificando disponibilidade real de e-mail no backend.";
  if (email.available) return null;
  return "E-mail oculto: SMTP não está configurado no backend.";
};

const NewNotificationModal = ({
  campaign,
  email,
  onClose,
  push,
}: {
  campaign?: AdminNotificationCampaign | null;
  email?: AdminNotificationEmailStatus;
  onClose: () => void;
  push?: AdminNotificationPushStatus;
}) => {
  const createCampaign = useAdminNotificationCreateCampaign();
  const updateCampaign = useAdminNotificationUpdateCampaign();
  const sendCampaign = useAdminNotificationSendCampaign();
  const scheduleCampaign = useAdminNotificationScheduleCampaign();
  const [intent, setIntent] = useState<SubmitIntent>("draft");
  const emailAvailable = Boolean(email?.available);
  const emailVisible = emailAvailable || Boolean(campaign?.channels.includes("email"));
  const pushAvailable = Boolean(push?.available);
  const form = useForm<NotificationFormValues>({
    defaultValues: {
      audience: campaign?.audience ?? "all_users",
      body: campaign?.body ?? "",
      delivery_mode: "draft",
      email: emailAvailable ? (campaign?.channels.includes("email") ?? false) : false,
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
    form.setValue(
      "email",
      emailAvailable ? (campaign?.channels.includes("email") ?? false) : false,
    );
    form.setValue("push", pushAvailable ? (campaign?.channels.includes("push") ?? false) : false);
  }, [campaign, emailAvailable, form, pushAvailable]);
  const preview = useWatch({ control: form.control });
  const pending =
    createCampaign.isPending ||
    updateCampaign.isPending ||
    sendCampaign.isPending ||
    scheduleCampaign.isPending;
  const unavailableEmail = emailUnavailableCopy(email);
  const unavailablePush = pushUnavailableCopy(push);
  const previewChannels = [
    preview.in_app ? "In-app" : null,
    preview.push && pushAvailable ? "Push" : null,
    preview.email && emailAvailable ? "E-mail" : null,
  ].filter(Boolean);

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
      ...(values.email && emailAvailable ? ["email" as const] : []),
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
          `Notificação enviada. Entregas reais: ${numberFormatter.format(result.summary.total_deliveries)}.`,
        );
      } else if (values.delivery_mode === "schedule") {
        await scheduleCampaign.mutateAsync({
          id: saved.id,
          scheduledAt: new Date(values.scheduled_at || "").toISOString(),
        });
        toast.success("Notificação agendada com dados reais.");
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
              E-mail e push aparecem somente quando o backend confirma provedores reais. Logs
              automáticos são somente leitura.
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
                placeholder="Escreva a mensagem curta exibida nos canais selecionados."
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
                <div className="grid gap-3 sm:grid-cols-3">
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
                  {emailVisible ? (
                    <ChannelCheckbox
                      control={form.control}
                      disabled={pending || !emailAvailable}
                      label="E-mail"
                      name="email"
                    />
                  ) : null}
                </div>
                <span className="mt-1 block min-h-5 text-xs font-medium text-danger">
                  {form.formState.errors.in_app?.message || ""}
                </span>
                {unavailableEmail ? (
                  <p className="rounded-2xl border border-border bg-surface-muted p-3 text-xs font-bold text-muted">
                    {unavailableEmail}
                  </p>
                ) : null}
                {unavailablePush ? (
                  <p className="mt-2 rounded-2xl border border-border bg-surface-muted p-3 text-xs font-bold text-muted">
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
                  <li>Canais: {previewChannels.length > 0 ? previewChannels.join(" + ") : "—"}</li>
                  {preview.email && emailAvailable ? (
                    <li>Assunto do e-mail: {preview.title || "título da notificação"}</li>
                  ) : null}
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
  const [campaignStatus, setCampaignStatus] = useState("all");
  const [logStatus, setLogStatus] = useState("all");
  const [campaignFilters, setCampaignFilters] = useState<NotificationTableFilters>(() =>
    createDefaultTableFilters(),
  );
  const [logFilters, setLogFilters] = useState<NotificationTableFilters>(() =>
    createDefaultTableFilters(),
  );
  const [page, setPage] = useState(1);
  const [logsPage, setLogsPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AdminNotificationCampaign | null>(null);
  const [details, setDetails] = useState<AdminNotificationCampaign | null>(null);
  const [campaignPeriod, setCampaignPeriod] = useState<NotificationPeriodValue>(
    NOTIFICATION_DEFAULT_PERIOD,
  );
  const [logsPeriod, setLogsPeriod] = useState<NotificationPeriodValue>(
    NOTIFICATION_DEFAULT_PERIOD,
  );
  useDocumentScrollLock(modalOpen || Boolean(details));
  const selectedCampaignStatus =
    CAMPAIGN_STATUS_OPTIONS.find((item) => item.value === campaignStatus) ??
    CAMPAIGN_STATUS_OPTIONS[0];
  const selectedLogStatus =
    DELIVERY_STATUS_OPTIONS.find((item) => item.value === logStatus) ?? DELIVERY_STATUS_OPTIONS[0];
  const resetCampaignPage = () => setPage(1);
  const resetLogsPage = () => setLogsPage(1);
  const campaignRangeControls = useDateRangeCommitOnBlur({
    errorMessage: tableRangeErrorMessage,
    initialRange: () => getRangeForPeriod(NOTIFICATION_DEFAULT_PERIOD),
    isValidRange,
    onApply: resetCampaignPage,
  });
  const logsRangeControls = useDateRangeCommitOnBlur({
    errorMessage: tableRangeErrorMessage,
    initialRange: () => getRangeForPeriod(NOTIFICATION_DEFAULT_PERIOD),
    isValidRange,
    onApply: resetLogsPage,
  });
  const campaignRangeIsValid =
    campaignPeriod === "custom" ? isValidRange(campaignRangeControls.appliedRange) : true;
  const logsRangeIsValid =
    logsPeriod === "custom" ? isValidRange(logsRangeControls.appliedRange) : true;
  const metricQuery = useMemo<AdminNotificationsRangeQuery>(
    () => ({ period: NOTIFICATION_DEFAULT_PERIOD }),
    [],
  );
  const campaignQuery = useMemo(
    () => ({
      audience: campaignFilters.audience === "all" ? undefined : campaignFilters.audience,
      channel: campaignFilters.channel === "all" ? undefined : campaignFilters.channel,
      limit: CAMPAIGN_LIMIT,
      page,
      ...buildNotificationPeriodQuery(campaignPeriod, campaignRangeControls.appliedRange),
      q: campaignFilters.q.trim() || undefined,
      status: selectedCampaignStatus.status,
    }),
    [
      campaignFilters,
      campaignPeriod,
      campaignRangeControls.appliedRange,
      page,
      selectedCampaignStatus.status,
    ],
  );
  const logsQuery = useMemo(
    () => ({
      audience: logFilters.audience === "all" ? undefined : logFilters.audience,
      channel: logFilters.channel === "all" ? undefined : logFilters.channel,
      limit: LOGS_LIMIT,
      page: logsPage,
      ...buildNotificationPeriodQuery(logsPeriod, logsRangeControls.appliedRange),
      q: logFilters.q.trim() || undefined,
      status: selectedLogStatus.status,
    }),
    [logFilters, logsPage, logsPeriod, logsRangeControls.appliedRange, selectedLogStatus.status],
  );
  const metrics = useAdminNotificationMetrics(metricQuery);
  const campaigns = useAdminNotificationCampaigns(campaignQuery, { enabled: campaignRangeIsValid });
  const logs = useAdminNotificationAutomaticLogs(logsQuery, { enabled: logsRangeIsValid });
  const push = useAdminNotificationPushStatus();
  const email = useAdminNotificationEmailStatus();
  const cancelCampaign = useAdminNotificationCancelCampaign();
  const firstError = metrics.error || campaigns.error || logs.error || push.error || email.error;

  const updateCampaignPeriod = (nextPeriod: NotificationPeriodPreset) => {
    setCampaignPeriod(nextPeriod);
    campaignRangeControls.applyRange(getRangeForPeriod(nextPeriod));
  };
  const updateCampaignDateRange = (field: keyof NotificationRange, value: string) => {
    setCampaignPeriod("custom");
    campaignRangeControls.handleDateChange(field, value);
  };
  const updateLogsPeriod = (nextPeriod: NotificationPeriodPreset) => {
    setLogsPeriod(nextPeriod);
    logsRangeControls.applyRange(getRangeForPeriod(nextPeriod));
  };
  const updateLogsDateRange = (field: keyof NotificationRange, value: string) => {
    setLogsPeriod("custom");
    logsRangeControls.handleDateChange(field, value);
  };
  const updateCampaignFilters = (nextFilters: NotificationTableFilters) => {
    setCampaignFilters(nextFilters);
    setPage(1);
  };
  const updateLogFilters = (nextFilters: NotificationTableFilters) => {
    setLogFilters(nextFilters);
    setLogsPage(1);
  };
  const updateCampaignStatus = (nextStatus: string) => {
    setCampaignStatus(nextStatus);
    setPage(1);
  };
  const updateLogStatus = (nextStatus: string) => {
    setLogStatus(nextStatus);
    setLogsPage(1);
  };
  const openCreateModal = () => {
    setEditing(null);
    setModalOpen(true);
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
      <Header />
      {firstError ? (
        <ErrorState
          message={resolveApiError(firstError)}
          onRetry={() => {
            void metrics.refetch();
            void campaigns.refetch();
            void logs.refetch();
            void push.refetch();
            void email.refetch();
          }}
        />
      ) : null}
      {metrics.isLoading ? (
        <LoadingCards />
      ) : metrics.data ? (
        <MetricsGrid metrics={metrics.data} />
      ) : null}
      <CampaignsList
        campaigns={campaigns.data?.data ?? []}
        count={campaigns.data?.count ?? 0}
        filtersSlot={
          <NotificationTableFiltersBlock
            filters={campaignFilters}
            onDateChange={updateCampaignDateRange}
            onDateControlsBlur={campaignRangeControls.handleDateControlsBlur}
            onFiltersChange={updateCampaignFilters}
            onPeriodChange={updateCampaignPeriod}
            onStatusChange={updateCampaignStatus}
            period={campaignPeriod}
            range={campaignRangeControls.draftRange}
            rangeError={campaignRangeControls.rangeError}
            searchPlaceholder="Buscar campanha por título ou conteúdo..."
            status={campaignStatus}
            statusOptions={CAMPAIGN_STATUS_OPTIONS}
          />
        }
        isFetching={campaigns.isFetching}
        onCancel={handleCancel}
        onDetails={setDetails}
        onEdit={(campaign) => {
          setEditing(campaign);
          setModalOpen(true);
        }}
        onNew={openCreateModal}
        onNext={() => setPage((current) => current + 1)}
        onPrev={() => setPage((current) => Math.max(1, current - 1))}
        page={campaigns.data?.page ?? page}
        pages={campaigns.data?.pages ?? 1}
      />
      <AutomaticLogs
        count={logs.data?.count ?? 0}
        data={logs.data?.data ?? []}
        filtersSlot={
          <NotificationTableFiltersBlock
            filters={logFilters}
            onDateChange={updateLogsDateRange}
            onDateControlsBlur={logsRangeControls.handleDateControlsBlur}
            onFiltersChange={updateLogFilters}
            onPeriodChange={updateLogsPeriod}
            onStatusChange={updateLogStatus}
            period={logsPeriod}
            range={logsRangeControls.draftRange}
            rangeError={logsRangeControls.rangeError}
            searchPlaceholder="Buscar log por notificação ou usuário..."
            status={logStatus}
            statusOptions={DELIVERY_STATUS_OPTIONS}
          />
        }
        isFetching={logs.isFetching}
        onNext={() => setLogsPage((current) => current + 1)}
        onPrev={() => setLogsPage((current) => Math.max(1, current - 1))}
        page={logs.data?.page ?? logsPage}
        pages={logs.data?.pages ?? 1}
      />
      {modalOpen ? (
        <NewNotificationModal
          campaign={editing}
          email={email.data}
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
