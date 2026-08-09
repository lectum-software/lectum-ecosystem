"use client";

import {
  Bell,
  ChevronDown,
  Eye,
  Mail,
  MousePointerClick,
  Search,
  Send,
  Smartphone,
  UsersRound,
} from "lucide-react";
import type { FocusEventHandler, ReactNode } from "react";
import { type Control, useController } from "react-hook-form";
import type {
  AdminNotificationAutomaticLog,
  AdminNotificationCampaignStatus,
  AdminNotificationChannel,
  AdminNotificationMetrics,
  NotificationDeliveryStatus,
} from "@/api/req/notifications";
import { VerifiedBadgeIcon } from "@/components/admin-icons";
import { AdminQueryErrorState } from "@/components/admin-shell/query-error-state";
import { cn } from "@/lib/utils";

import {
  AUDIENCE_OPTIONS,
  campaignStatusCopy,
  cardClass,
  channelLabel,
  deliveryStatusCopy,
  formatDateTime,
  formatPercent,
  NOTIFICATION_PERIOD_OPTIONS,
  type NotificationFormValues,
  type NotificationPeriodPreset,
  type NotificationPeriodValue,
  type NotificationRange,
  type NotificationRecipient,
  type NotificationTableFilters,
  numberFormatter,
  recipientHasVerifiedBadge,
  recipientName,
  roleLabel,
} from "../modules/notification-support";

export const CardShell = ({
  children,
  className,
}: {
  children?: ReactNode;
  className?: string;
}) => <section className={cn(cardClass, className)}>{children}</section>;

export const StatusBadge = ({ status }: { status: AdminNotificationCampaignStatus }) => {
  const copy = campaignStatusCopy(status);

  return (
    <span className={cn("inline-flex rounded-full px-2.5 py-1 text-xs font-black", copy.className)}>
      {copy.label}
    </span>
  );
};

export const DeliveryStatusBadge = ({ status }: { status: NotificationDeliveryStatus }) => {
  const copy = deliveryStatusCopy(status);

  return (
    <span className={cn("inline-flex rounded-full px-2.5 py-1 text-xs font-black", copy.className)}>
      {copy.label}
    </span>
  );
};

export const EngagementCell = ({ log }: { log: AdminNotificationAutomaticLog }) => {
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

export const ChannelPill = ({ channel }: { channel: AdminNotificationChannel }) => (
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

export const RecipientCell = ({ user }: { user: NotificationRecipient }) => (
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

export const filterSelectClass =
  "h-11 w-full min-w-0 appearance-none rounded-control border border-border bg-surface py-0 pl-3 pr-11 text-sm font-semibold text-foreground shadow-control outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20";

export const FilterSelectChevron = () => (
  <ChevronDown
    aria-hidden
    className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground"
  />
);

export const MetricCard = ({
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

export const MetricsGrid = ({ metrics }: { metrics: AdminNotificationMetrics }) => {
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

export const Header = () => (
  <CardShell className="p-5 md:p-6">
    <div className="min-w-0">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">
        Campanhas e logs
      </p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground md:text-4xl">
        Notificações
      </h1>
      <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-muted md:text-base">
        Gerencie e envie notificações para usuários da plataforma. Esta área não é uma caixa de
        entrada do administrador.
      </p>
    </div>
  </CardShell>
);

export const NotificationTableFiltersBlock = ({
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

export const ErrorState = ({ message, onRetry }: { message: string; onRetry: () => void }) => (
  <AdminQueryErrorState
    message={message}
    onRetry={onRetry}
    title="Não foi possível carregar notificações"
  />
);

export const LoadingCards = () => (
  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
    {["sent", "users", "open", "click"].map((key) => (
      <CardShell className="h-36 animate-pulse bg-surface-muted" key={key} />
    ))}
  </div>
);

export const ChannelCheckbox = ({
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
