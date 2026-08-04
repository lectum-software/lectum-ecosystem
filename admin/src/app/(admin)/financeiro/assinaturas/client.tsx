"use client";

import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  RefreshCw,
  Search,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  type FocusEvent,
  Fragment,
  type KeyboardEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useAdminFinanceSubscriptions } from "@/api/callers/finance";
import { resolveApiError } from "@/api/handle";
import type {
  FinanceListQuery,
  FinancePaymentHealth,
  FinancePaymentHealthStatus,
  FinancePaymentHistoryItem,
  FinancePaymentHistoryStatus,
  FinancePaymentMethod,
  FinancePeriodValue,
  FinanceSubscriptionItem,
} from "@/api/req/finance";
import { cn } from "@/lib/utils";

type DateFilterDraft = {
  from: string;
  to: string;
};

type DateFilterFieldName = keyof DateFilterDraft;
type DateFilterDraftUpdate = DateFilterDraft | ((current: DateFilterDraft) => DateFilterDraft);

const LIST_LIMIT_OPTIONS = [10, 20, 50];
const SEARCH_DEBOUNCE_MS = 350;
const FINANCE_FILTER_MIN_YEAR = 1900;
const FINANCE_FILTER_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const validPeriods = new Set<FinancePeriodValue>([
  "all",
  "custom",
  "month",
  "today",
  "week",
  "year",
  "7d",
  "30d",
  "90d",
]);
const moneyFormatter = new Intl.NumberFormat("pt-BR", {
  currency: "BRL",
  style: "currency",
});
const numberFormatter = new Intl.NumberFormat("pt-BR");
const statusFilterOptions = [
  { label: "Todos os status", value: "all" },
  { label: "Ativas", value: "ativa" },
  { label: "Inadimplentes", value: "inadimplente" },
  { label: "Canceladas", value: "cancelada" },
] as const;
const paymentHealthFilterOptions = [
  { label: "Todas as confiabilidades", value: "all" },
  { label: "Confiável", value: "healthy" },
  { label: "Atenção", value: "attention" },
  { label: "Risco", value: "risk" },
  { label: "Crítica", value: "critical" },
  { label: "Histórico insuficiente", value: "insufficient_history" },
] as const;
const validSubscriptionStatuses = new Set<string>(
  statusFilterOptions.map((option) => option.value),
);
const validPaymentHealthStatuses = new Set<string>(
  paymentHealthFilterOptions.map((option) => option.value),
);

const parsePositiveNumber = (value: string | null, fallback: number) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;

  return Math.floor(parsed);
};

const isCompleteFinanceFilterDate = (value?: string | null): value is string => {
  if (!value || !FINANCE_FILTER_DATE_PATTERN.test(value)) return false;

  const [year, month, day] = value.split("-").map(Number);
  if (year < FINANCE_FILTER_MIN_YEAR) return false;

  const date = new Date(year, month - 1, day, 12, 0, 0, 0);

  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
};

const parseQuery = (params: URLSearchParams): FinanceListQuery => {
  const period = params.get("period") as FinancePeriodValue | null;
  const paymentHealth = params.get("paymentHealth");
  const q = params.get("q");
  const status = params.get("status");
  const from = params.get("from");
  const to = params.get("to");
  const validFrom = isCompleteFinanceFilterDate(from) ? from : undefined;
  const validTo = isCompleteFinanceFilterDate(to) ? to : undefined;
  const hasValidRange = Boolean(validFrom && validTo);
  const validPeriod = period && validPeriods.has(period) ? period : "all";

  return {
    from: hasValidRange ? validFrom : undefined,
    limit: Math.min(50, parsePositiveNumber(params.get("limit"), 20)),
    page: parsePositiveNumber(params.get("page"), 1),
    paymentHealth:
      paymentHealth && validPaymentHealthStatuses.has(paymentHealth) && paymentHealth !== "all"
        ? (paymentHealth as FinancePaymentHealthStatus)
        : undefined,
    period: validPeriod === "custom" && !hasValidRange ? "all" : validPeriod,
    q: q || undefined,
    status:
      status && validSubscriptionStatuses.has(status) && status !== "all" ? status : undefined,
    to: hasValidRange ? validTo : undefined,
  };
};

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
  }).format(new Date(value));

const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));

const formatNullableDate = (value: string | null) => (value ? formatDate(value) : "—");
const isCancelledSubscription = (item: FinanceSubscriptionItem) =>
  item.status === "cancelada" || item.status_label.toLocaleLowerCase("pt-BR").includes("cancelad");
const shouldShowCancellationMetric = (item: FinanceSubscriptionItem) =>
  isCancelledSubscription(item) || Boolean(item.cancelled_at);
const formatNextChargeDate = (item: FinanceSubscriptionItem) =>
  isCancelledSubscription(item) ? "—" : formatNullableDate(item.next_charge_at);
const formatCancellationDate = (item: FinanceSubscriptionItem) =>
  formatNullableDate(item.cancelled_at ?? item.updated_at);
const formatMoney = (cents: number) => moneyFormatter.format(cents / 100);
const formatNullableMoney = (cents: number | null) =>
  typeof cents === "number" ? formatMoney(cents) : "Valor indisponível";
const formatPercent = (value: number | null) =>
  typeof value === "number" ? `${numberFormatter.format(value)}%` : "—";
const formatCardBrand = (brand: string | null) =>
  brand?.trim() ? brand.trim().replaceAll("_", " ").toUpperCase() : "Cartão";
const formatCardLabel = (method: FinancePaymentMethod) => {
  const last4 = method.last4?.trim() ? `final ${method.last4}` : "final não informado";

  return `${formatCardBrand(method.brand)} ${last4}`;
};
const formatCardExpiration = (method: FinancePaymentMethod) => {
  if (!method.exp_month || !method.exp_year) return "Validade não informada";

  return `Validade ${String(method.exp_month).padStart(2, "0")}/${method.exp_year}`;
};

const CardShell = ({ children, className }: { children?: ReactNode; className?: string }) => (
  <section
    className={cn(
      "min-w-0 max-w-full rounded-card border border-border/80 bg-surface/95 shadow-admin-soft backdrop-blur",
      className,
    )}
  >
    {children}
  </section>
);

const SearchBox = ({ onSearch, value }: { onSearch: (value: string) => void; value?: string }) => {
  const [draft, setDraft] = useState(value || "");
  const onSearchRef = useRef(onSearch);

  useEffect(() => {
    onSearchRef.current = onSearch;
  }, [onSearch]);

  useEffect(() => {
    const normalized = draft.trim();
    const current = value || "";

    if (normalized === current) return;

    const timer = window.setTimeout(() => {
      onSearchRef.current(normalized);
    }, SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [draft, value]);

  return (
    <label className="relative block h-12 w-full min-w-0 text-sm font-medium text-foreground">
      <span className="sr-only">Buscar por nome, e-mail ou identificador</span>
      <Search
        aria-hidden
        className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle"
      />
      <input
        className="h-full w-full appearance-none rounded-full border border-border bg-surface py-0 pl-10 pr-4 text-sm font-medium text-foreground shadow-control outline-none transition placeholder:text-subtle focus:border-primary focus:ring-2 focus:ring-primary/15"
        onChange={(event) => setDraft(event.target.value)}
        placeholder="Nome, e-mail ou ID..."
        type="search"
        value={draft}
      />
    </label>
  );
};

const DateFilterField = ({
  label,
  max,
  min,
  onChange,
  onCommit,
  value,
}: {
  label: string;
  max?: string;
  min?: string;
  onChange: (value: string) => void;
  onCommit: () => void;
  value?: string;
}) => {
  const invalidDraft = Boolean(value && !isCompleteFinanceFilterDate(value));

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter") return;

    event.preventDefault();
    onCommit();
    event.currentTarget.blur();
  };

  return (
    <label className="flex min-w-0 flex-col gap-1 text-xs font-medium text-muted sm:min-w-[150px]">
      {label}
      <input
        aria-invalid={invalidDraft || undefined}
        className="h-12 w-full min-w-0 rounded-full border border-border bg-surface px-4 py-0 text-sm font-medium text-foreground shadow-control outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15 aria-[invalid=true]:border-danger aria-[invalid=true]:focus:ring-danger/15"
        max={max}
        min={min}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={handleKeyDown}
        title="Informe a data completa para aplicar o filtro."
        type="date"
        value={value || ""}
      />
    </label>
  );
};

const StatusFilterField = ({
  onChange,
  value,
}: {
  onChange: (value: string) => void;
  value?: string;
}) => (
  <label className="flex min-w-0 flex-col gap-1 text-xs font-medium text-muted sm:min-w-[170px]">
    Status
    <span className="relative block text-sm font-medium text-foreground">
      <select
        className="h-12 w-full min-w-0 appearance-none rounded-full border border-border bg-surface py-0 pl-4 pr-12 text-sm font-medium text-foreground shadow-control outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
        onChange={(event) => onChange(event.target.value)}
        value={value || "all"}
      >
        {statusFilterOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronRight
        aria-hidden
        className="pointer-events-none absolute right-5 top-1/2 h-4 w-4 -translate-y-1/2 rotate-90 text-foreground"
      />
    </span>
  </label>
);

const hiddenHealthNotePrefixes = [
  "Nenhum payment_event de cobrança foi reconciliado pelo id local da assinatura",
  "Amostra pequena:",
];

const PaymentHealthFilterField = ({
  onChange,
  value,
}: {
  onChange: (value: string) => void;
  value?: string;
}) => (
  <label className="flex min-w-0 flex-col gap-1 text-xs font-medium text-muted sm:min-w-[220px]">
    Confiabilidade
    <span className="relative block text-sm font-medium text-foreground">
      <select
        className="h-12 w-full min-w-0 appearance-none rounded-full border border-border bg-surface py-0 pl-4 pr-12 text-sm font-medium text-foreground shadow-control outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
        onChange={(event) => onChange(event.target.value)}
        value={value || "all"}
      >
        {paymentHealthFilterOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronRight
        aria-hidden
        className="pointer-events-none absolute right-5 top-1/2 h-4 w-4 -translate-y-1/2 rotate-90 text-foreground"
      />
    </span>
  </label>
);

const InitialsAvatar = ({ name }: { name: string }) => {
  const initials =
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "PS";

  return (
    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-primary-soft text-sm font-black text-primary">
      {initials}
    </span>
  );
};

const statusClassName = {
  ativa: "bg-emerald-50 text-success",
  cancelada: "bg-red-50 text-danger",
  inadimplente: "bg-yellow-50 text-yellow-700",
  inativa: "bg-surface-muted text-muted",
} as const;

const StatusBadge = ({ item }: { item: FinanceSubscriptionItem }) => (
  <span
    className={cn(
      "inline-flex rounded-full px-2 py-1 text-xs font-black",
      statusClassName[item.status as keyof typeof statusClassName] ?? "bg-surface-muted text-muted",
    )}
  >
    {item.status_label}
  </span>
);

const paymentHealthClassName: Record<FinancePaymentHealth["status"], string> = {
  attention: "border-yellow-100 bg-yellow-50 text-yellow-700",
  critical: "border-danger/20 bg-danger/5 text-danger",
  healthy: "border-emerald-100 bg-emerald-50 text-success",
  insufficient_history: "border-border bg-surface-muted text-muted",
  risk: "border-orange-200 bg-orange-50 text-orange-700",
};

const paymentHistoryStatusClassName: Record<FinancePaymentHistoryStatus, string> = {
  failed: "border-danger/20 bg-danger/5 text-danger",
  pending: "border-yellow-100 bg-yellow-50 text-yellow-700",
  processed: "border-border bg-surface-muted text-muted",
  successful: "border-emerald-100 bg-emerald-50 text-success",
};

const PaymentHealthBadge = ({ health }: { health: FinancePaymentHealth }) => (
  <span
    className={cn(
      "inline-flex max-w-full items-center rounded-full border px-3 py-1.5 text-xs font-black leading-none",
      paymentHealthClassName[health.status],
    )}
    title={health.summary}
  >
    {health.label}
  </span>
);

const PaymentHistoryStatusBadge = ({ item }: { item: FinancePaymentHistoryItem }) => (
  <span
    className={cn(
      "inline-flex rounded-full border px-2 py-1 text-xs font-black",
      paymentHistoryStatusClassName[item.status],
    )}
  >
    {item.status_label}
  </span>
);

const IdentifierLine = ({
  className,
  label,
  value,
}: {
  className?: string;
  label: string;
  value: string;
}) => (
  <p
    className={cn("min-w-0 break-all text-[11px] font-semibold leading-5 text-muted", className)}
    title={`${label}: ${value}`}
  >
    <span>{label}: </span>
    <code className="font-mono text-foreground">{value}</code>
  </p>
);

const HealthMetric = ({ label, value }: { label: string; value: ReactNode }) => (
  <div className="rounded-3xl border border-border bg-surface px-4 py-3">
    <dt className="text-xs font-semibold text-muted">{label}</dt>
    <dd className="mt-1 text-sm font-black text-foreground">{value}</dd>
  </div>
);

const SavedPaymentMethodCard = ({
  className,
  method,
}: {
  className?: string;
  method: FinancePaymentMethod | null;
}) => (
  <div className={cn("mt-4 rounded-3xl border border-border bg-surface p-4", className)}>
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex min-w-0 gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-primary-soft text-primary">
          <CreditCard aria-hidden className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-primary">
            Dados do cartão salvo
          </p>
          {method ? (
            <>
              <h4 className="mt-1 text-base font-black text-foreground">
                {formatCardLabel(method)}
              </h4>
              <p className="mt-1 text-sm font-semibold text-muted">
                {formatCardExpiration(method)}
                {method.saved_at ? ` · Salvo em ${formatDate(method.saved_at)}` : ""}
              </p>
            </>
          ) : (
            <>
              <h4 className="mt-1 text-base font-black text-foreground">
                Nenhum cartão salvo encontrado
              </h4>
              <p className="mt-1 text-sm font-semibold text-muted">
                Não há bandeira, final ou validade seguros salvos para este psicólogo.
              </p>
            </>
          )}
        </div>
      </div>
      {method ? (
        <span className="inline-flex w-fit rounded-full border border-border bg-surface-muted px-3 py-1 text-xs font-black text-muted">
          {method.matches_subscription ? "Vinculado à assinatura" : "Último cartão salvo"}
        </span>
      ) : null}
    </div>
  </div>
);

const PaymentHistoryRow = ({ item }: { item: FinancePaymentHistoryItem }) => (
  <li className="rounded-3xl border border-border bg-surface p-4">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-black text-foreground">{item.title}</p>
          <PaymentHistoryStatusBadge item={item} />
        </div>
        <p className="mt-1 text-xs font-semibold text-muted">
          <time dateTime={item.occurred_at}>{formatDateTime(item.occurred_at)}</time> ·{" "}
          {item.gateway}
        </p>
        <IdentifierLine className="mt-1" label="ID" value={item.event_id} />
      </div>
      <div className="text-left sm:text-right">
        <p className="text-sm font-black text-foreground">
          {formatNullableMoney(item.amount_cents)}
        </p>
      </div>
    </div>
    {item.unavailable_reason ? (
      <p className="mt-3 rounded-2xl border border-yellow-100 bg-yellow-50 px-3 py-2 text-xs font-semibold text-yellow-700">
        Pagamento confirmado sem valor monetário extraível no payload.
      </p>
    ) : null}
  </li>
);

const PaymentHealthDetails = ({ item }: { item: FinanceSubscriptionItem }) => {
  const { payment_health: health, payment_history: history } = item;
  const visibleHealthNotes = health.notes.filter(
    (note) => !hiddenHealthNotePrefixes.some((prefix) => note.startsWith(prefix)),
  );

  return (
    <div className="rounded-3xl border border-primary/10 bg-primary-soft/25 p-4 lg:p-5">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(320px,420px)] lg:items-start">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">
            Confiabilidade do pagamento
          </p>
          <h3 className="mt-1 text-lg font-black text-foreground">{health.summary}</h3>
          <p className="mt-1 max-w-2xl text-sm font-medium leading-6 text-muted">
            A confiabilidade do pagamento resume a estabilidade das cobranças da assinatura.
          </p>
        </div>

        <SavedPaymentMethodCard className="mt-0 lg:justify-self-end" method={item.payment_method} />

        <dl className="grid gap-3 sm:grid-cols-2 lg:col-span-2 lg:grid-cols-4">
          <HealthMetric
            label="Taxa de sucesso"
            value={formatPercent(health.success_rate_percent)}
          />
          <HealthMetric
            label="Tentativas finais"
            value={numberFormatter.format(health.final_attempts)}
          />
          <HealthMetric
            label="Falhas consecutivas"
            value={numberFormatter.format(health.consecutive_failures)}
          />
          <HealthMetric
            label="Dias em atraso"
            value={health.days_overdue === null ? "—" : numberFormatter.format(health.days_overdue)}
          />
          <HealthMetric
            label="Pagamentos aprovados"
            value={numberFormatter.format(health.successful_payments)}
          />
          <HealthMetric
            label="Pagamentos recusados"
            value={numberFormatter.format(health.failed_payments)}
          />
          <HealthMetric label="Pendentes" value={numberFormatter.format(health.pending_payments)} />
          <HealthMetric label="Último sucesso" value={formatNullableDate(health.last_success_at)} />
          <HealthMetric label="Última falha" value={formatNullableDate(health.last_failure_at)} />
          {shouldShowCancellationMetric(item) ? (
            <HealthMetric label="Cancelamento" value={formatCancellationDate(item)} />
          ) : null}
        </dl>

        {visibleHealthNotes.length > 0 ? (
          <ul className="space-y-2 text-xs font-semibold leading-5 text-muted lg:col-span-2">
            {visibleHealthNotes.map((note) => (
              <li className="rounded-2xl bg-surface/80 px-3 py-2" key={note}>
                {note}
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <div className="mt-5">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <h4 className="text-sm font-black text-foreground">Histórico de pagamentos</h4>
        </div>
        {history.available ? (
          <ul className="mt-3 grid gap-3">
            {history.items.map((historyItem) => (
              <PaymentHistoryRow item={historyItem} key={historyItem.event_id} />
            ))}
          </ul>
        ) : (
          <div className="mt-3 rounded-3xl border border-dashed border-border bg-surface p-5 text-sm font-semibold text-muted">
            {history.reason || "Histórico de pagamentos indisponível para esta assinatura."}
          </div>
        )}
      </div>
    </div>
  );
};

const ErrorState = ({ message, onRetry }: { message: string; onRetry: () => void }) => (
  <CardShell className="p-6">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex gap-3">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-red-50 text-danger">
          <AlertTriangle aria-hidden className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Não foi possível carregar assinaturas</h2>
          <p className="mt-1 text-sm text-muted">{message}</p>
        </div>
      </div>
      <button
        className="inline-flex h-11 items-center justify-center gap-2 rounded-control border border-border bg-surface px-4 text-sm font-semibold text-foreground transition hover:border-border-strong"
        onClick={onRetry}
        type="button"
      >
        <RefreshCw aria-hidden className="h-4 w-4" />
        Tentar novamente
      </button>
    </div>
  </CardShell>
);

const LoadingState = () => (
  <div className="space-y-4 p-4">
    {["subscription-loading-1", "subscription-loading-2", "subscription-loading-3"].map((key) => (
      <div className="h-24 animate-pulse rounded-3xl bg-surface-muted" key={key} />
    ))}
  </div>
);

const EmptyState = () => (
  <div className="rounded-3xl border border-dashed border-border bg-surface-muted p-8 text-center">
    <UsersRound aria-hidden className="mx-auto h-10 w-10 text-primary" />
    <h2 className="mt-3 text-lg font-semibold text-foreground">
      Nenhuma assinatura paga encontrada
    </h2>
    <p className="mt-1 text-sm text-muted">
      A lista exclui plano gratuito e cortesia administrativa.
    </p>
  </div>
);

const pageNumbers = (current: number, pages: number) => {
  const window = new Set([1, pages, current - 1, current, current + 1, current + 2]);

  return [...window]
    .filter((value) => value >= 1 && value <= pages)
    .sort((left, right) => left - right);
};

const SubscriptionsTable = ({ items }: { items: FinanceSubscriptionItem[] }) => {
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
                  <IdentifierLine className="mt-2" label="ID" value={item.id} />
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
                      <IdentifierLine label="ID" value={item.id} />
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

export const AdminFinanceSubscriptionsClient = () => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchString = searchParams.toString();
  const query = useMemo(() => parseQuery(new URLSearchParams(searchString)), [searchString]);
  const dateQueryKey = `${query.from ?? ""}|${query.to ?? ""}`;
  const queryDateDraft = useMemo<DateFilterDraft>(
    () => ({ from: query.from ?? "", to: query.to ?? "" }),
    [query.from, query.to],
  );
  const [dateDraftState, setDateDraftState] = useState(() => ({
    key: dateQueryKey,
    range: queryDateDraft,
  }));
  const dateDraft = dateDraftState.key === dateQueryKey ? dateDraftState.range : queryDateDraft;
  const lastEditedDateFieldRef = useRef<DateFilterFieldName>("from");
  const subscriptionsQuery = useAdminFinanceSubscriptions(query);
  const queryError = subscriptionsQuery.error ? resolveApiError(subscriptionsQuery.error) : null;
  const summary = subscriptionsQuery.data;
  const items = summary?.data ?? [];

  const setDateDraft = (update: DateFilterDraftUpdate) => {
    setDateDraftState((currentState) => {
      const currentRange = currentState.key === dateQueryKey ? currentState.range : queryDateDraft;
      const range = typeof update === "function" ? update(currentRange) : update;

      return { key: dateQueryKey, range };
    });
  };

  const replaceParams = (
    updates: Partial<Record<keyof FinanceListQuery, string | number | null>>,
    options: { resetPage?: boolean } = { resetPage: true },
  ) => {
    const params = new URLSearchParams(searchString);

    for (const [key, value] of Object.entries(updates)) {
      if (value === null || value === undefined || value === "") {
        params.delete(key);
      } else {
        params.set(key, String(value));
      }
    }

    const from = params.get("from");
    const to = params.get("to");
    const hasDateParams = params.has("from") || params.has("to");
    const hasCompleteRange = isCompleteFinanceFilterDate(from) && isCompleteFinanceFilterDate(to);

    if (hasDateParams && !hasCompleteRange) {
      params.delete("from");
      params.delete("to");
      if (params.get("period") === "custom") params.set("period", "all");
    }

    if (options.resetPage !== false) params.delete("page");
    const next = params.toString();
    router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false });
  };

  const hasTableFilters = Boolean(
    query.q || query.status || query.paymentHealth || query.from || query.to,
  );
  const commitStartDateFilters = () => {
    const hasIncompleteDraft =
      (dateDraft.from && !isCompleteFinanceFilterDate(dateDraft.from)) ||
      (dateDraft.to && !isCompleteFinanceFilterDate(dateDraft.to));

    if (hasIncompleteDraft) return;

    if (!dateDraft.from && !dateDraft.to) {
      replaceParams({ from: null, period: "all", to: null });
      return;
    }

    let nextFrom = dateDraft.from || dateDraft.to;
    let nextTo = dateDraft.to || dateDraft.from;

    if (nextFrom > nextTo) {
      if (lastEditedDateFieldRef.current === "from") nextTo = nextFrom;
      else nextFrom = nextTo;
    }

    replaceParams({ from: nextFrom, period: "custom", to: nextTo });
    setDateDraft({ from: nextFrom, to: nextTo });
  };
  const handleStartDateDraftChange = (field: DateFilterFieldName, value: string) => {
    lastEditedDateFieldRef.current = field;
    setDateDraft((current) => ({ ...current, [field]: value }));
  };
  const handleDateFiltersBlur = (event: FocusEvent<HTMLDivElement>) => {
    const currentTarget = event.currentTarget;
    const nextFocusedElement = event.relatedTarget as Node | null;

    if (nextFocusedElement && currentTarget.contains(nextFocusedElement)) return;

    window.setTimeout(() => {
      const activeElement = document.activeElement;

      if (activeElement && currentTarget.contains(activeElement)) return;

      commitStartDateFilters();
    }, 0);
  };
  const clearTableFilters = () => {
    setDateDraft({ from: "", to: "" });
    replaceParams({
      from: null,
      paymentHealth: null,
      period: "all",
      q: null,
      status: null,
      to: null,
    });
  };

  const pages = summary?.pages ?? 1;
  const page = Math.min(query.page ?? 1, pages);

  return (
    <div className="min-w-0 max-w-full space-y-7 overflow-x-clip">
      <header className="rounded-card border border-border/70 bg-surface/90 p-5 shadow-admin-soft backdrop-blur md:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">
              Financeiro
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground md:text-4xl">
              Assinaturas
            </h1>
            <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-muted">
              Relação de assinaturas do plano profissional
            </p>
          </div>
        </div>
      </header>

      <CardShell className="overflow-hidden">
        <div className="space-y-4 border-b border-border px-4 py-4">
          <div className="flex min-w-0 flex-col gap-4 2xl:flex-row 2xl:items-start 2xl:justify-between">
            <div className="min-w-0 2xl:w-[320px] 2xl:max-w-[320px] 2xl:flex-none 2xl:pt-5">
              <SearchBox
                key={query.q ?? ""}
                onSearch={(value) => replaceParams({ q: value || null })}
                value={query.q}
              />
              <p className="mt-2 pl-1 text-sm font-semibold text-foreground">
                {summary ? numberFormatter.format(summary.count) : "—"} assinaturas encontradas
              </p>
            </div>
            <div className="flex min-w-0 flex-col gap-2 text-sm font-medium text-foreground sm:flex-row sm:flex-wrap sm:items-end 2xl:flex-1 2xl:justify-end">
              <div
                className="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end"
                onBlur={handleDateFiltersBlur}
              >
                <DateFilterField
                  label="Início de"
                  max={isCompleteFinanceFilterDate(dateDraft.to) ? dateDraft.to : undefined}
                  onChange={(value) => handleStartDateDraftChange("from", value)}
                  onCommit={commitStartDateFilters}
                  value={dateDraft.from}
                />
                <DateFilterField
                  label="Início até"
                  min={isCompleteFinanceFilterDate(dateDraft.from) ? dateDraft.from : undefined}
                  onChange={(value) => handleStartDateDraftChange("to", value)}
                  onCommit={commitStartDateFilters}
                  value={dateDraft.to}
                />
              </div>
              <StatusFilterField
                onChange={(value) => replaceParams({ status: value === "all" ? null : value })}
                value={query.status}
              />
              <PaymentHealthFilterField
                onChange={(value) =>
                  replaceParams({ paymentHealth: value === "all" ? null : value })
                }
                value={query.paymentHealth}
              />
              {hasTableFilters ? (
                <button
                  className="inline-flex h-12 items-center justify-center rounded-full border border-border bg-surface px-5 text-sm font-semibold text-foreground shadow-control transition hover:border-primary hover:text-primary"
                  onClick={clearTableFilters}
                  type="button"
                >
                  Limpar
                </button>
              ) : null}
            </div>
          </div>
        </div>
        {subscriptionsQuery.isLoading ? <LoadingState /> : null}
        {subscriptionsQuery.isError && queryError ? (
          <div className="p-4">
            <ErrorState message={queryError} onRetry={() => void subscriptionsQuery.refetch()} />
          </div>
        ) : null}
        {summary && items.length === 0 ? <EmptyState /> : null}
        {summary && items.length > 0 ? <SubscriptionsTable items={items} /> : null}

        {summary ? (
          <div className="flex flex-col gap-4 border-t border-border px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <button
                className="grid h-10 w-10 place-items-center rounded-2xl border border-border bg-surface text-foreground disabled:opacity-40"
                disabled={page <= 1}
                onClick={() => replaceParams({ page: page - 1 }, { resetPage: false })}
                type="button"
              >
                <ChevronLeft aria-hidden className="h-4 w-4" />
                <span className="sr-only">Página anterior</span>
              </button>
              {pageNumbers(page, pages).map((number) => (
                <button
                  aria-current={number === page ? "page" : undefined}
                  className={cn(
                    "grid h-10 min-w-10 place-items-center rounded-2xl border border-border bg-surface px-3 text-sm font-semibold text-foreground",
                    number === page && "border-primary bg-primary text-white",
                  )}
                  key={number}
                  onClick={() => replaceParams({ page: number }, { resetPage: false })}
                  type="button"
                >
                  {number}
                </button>
              ))}
              <button
                className="grid h-10 w-10 place-items-center rounded-2xl border border-border bg-surface text-foreground disabled:opacity-40"
                disabled={page >= pages}
                onClick={() => replaceParams({ page: page + 1 }, { resetPage: false })}
                type="button"
              >
                <ChevronRight aria-hidden className="h-4 w-4" />
                <span className="sr-only">Próxima página</span>
              </button>
            </div>
            <label className="text-xs font-semibold text-muted">
              Itens por página
              <select
                className="ml-2 h-10 rounded-control border border-border bg-surface px-3 text-sm font-bold text-foreground shadow-control"
                onChange={(event) =>
                  replaceParams(
                    { limit: Number(event.target.value), page: 1 },
                    { resetPage: false },
                  )
                }
                value={summary.per_page}
              >
                {LIST_LIMIT_OPTIONS.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
          </div>
        ) : null}
      </CardShell>
    </div>
  );
};
