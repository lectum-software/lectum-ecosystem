"use client";

import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  CreditCard,
  Info,
  Loader2,
  RefreshCw,
} from "lucide-react";
import type { ReactNode } from "react";
import { useAdminSubscriptionPlanSetting } from "@/api/callers/settings";
import { resolveApiError } from "@/api/handle";
import type { AdminSubscriptionPlanSetting } from "@/api/req/settings";
import { cn } from "@/lib/utils";

const cardClass =
  "rounded-card border border-border/80 bg-surface/95 shadow-admin-soft backdrop-blur";

const moneyFormatter = new Intl.NumberFormat("pt-BR", {
  currency: "BRL",
  style: "currency",
});

const formatMoney = (cents: number) => moneyFormatter.format(cents / 100);

const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));

const intervalLabel = (interval: string) => {
  const normalized = interval.toLowerCase();
  if (normalized.includes("month")) return "mês";
  if (normalized.includes("year")) return "ano";
  if (normalized.includes("week")) return "semana";

  return interval;
};

const cadenceLabel = (interval: string) => {
  const normalized = interval.toLowerCase();
  if (normalized.includes("month")) return "Cobrança mensal";
  if (normalized.includes("year")) return "Cobrança anual";
  if (normalized.includes("week")) return "Cobrança semanal";

  return `Intervalo: ${interval}`;
};

const SettingsHeader = () => (
  <section className={cn(cardClass, "p-5 md:p-6")}>
    <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">
          Configurações
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground md:text-4xl">
          Assinatura
        </h1>
        <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-muted md:text-base">
          Consulte o valor atual do Plano Profissional. A edição do preço será disponibilizada
          quando o fluxo de cobrança estiver habilitado.
        </p>
      </div>
      <div className="rounded-[1.35rem] border border-primary/15 bg-primary-soft p-4 text-sm text-primary lg:max-w-sm">
        <div className="flex gap-3">
          <Info className="mt-0.5 h-5 w-5 shrink-0" />
          <p className="font-semibold leading-6">
            O valor exibido abaixo é o vigente para novas assinaturas.
          </p>
        </div>
      </div>
    </div>
  </section>
);

const LoadingPlanCard = () => (
  <section className={cn(cardClass, "grid place-items-center p-8 text-center")}>
    <Loader2 aria-hidden className="h-8 w-8 animate-spin text-primary" />
    <p className="mt-3 text-sm font-semibold text-muted">Carregando plano atual...</p>
  </section>
);

const ErrorPlanCard = ({ message, onRetry }: { message: string; onRetry: () => void }) => (
  <section className={cn(cardClass, "p-5 md:p-6")}>
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-danger/10 text-danger">
          <AlertTriangle aria-hidden className="h-5 w-5" />
        </span>
        <div>
          <h2 className="text-lg font-bold text-foreground">Não foi possível carregar o plano</h2>
          <p className="mt-1 text-sm font-medium leading-6 text-muted">{message}</p>
        </div>
      </div>
      <button
        className="inline-flex h-11 items-center justify-center gap-2 rounded-control border border-border bg-surface px-4 text-sm font-semibold text-foreground transition hover:border-primary hover:text-primary"
        onClick={onRetry}
        type="button"
      >
        <RefreshCw aria-hidden className="h-4 w-4" />
        Tentar novamente
      </button>
    </div>
  </section>
);

const StatusBadge = ({ active }: { active: boolean }) => (
  <span
    className={cn(
      "inline-flex w-fit items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold",
      active
        ? "border-success/15 bg-success/10 text-success"
        : "border-warning/20 bg-warning/10 text-warning",
    )}
  >
    <CheckCircle2 aria-hidden className="h-3.5 w-3.5" />
    {active ? "Plano ativo" : "Plano inativo"}
  </span>
);

const PlanDetail = ({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
}) => (
  <div className="rounded-[1.35rem] border border-border bg-surface-muted/60 p-4">
    <div className="flex items-start gap-3">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-primary-soft text-primary">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-[0.1em] text-muted">{label}</p>
        <div className="mt-1 text-sm font-bold leading-6 text-foreground">{value}</div>
      </div>
    </div>
  </div>
);

const CurrentPlanCard = ({ plan }: { plan: AdminSubscriptionPlanSetting }) => (
  <section className={cn(cardClass, "overflow-hidden")}>
    <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_minmax(280px,360px)]">
      <div className="p-5 md:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">
              Valor atual do plano
            </p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-foreground md:text-3xl">
              {plan.name}
            </h2>
          </div>
          <StatusBadge active={plan.active} />
        </div>

        <div className="mt-6 rounded-[1.75rem] border border-primary/15 bg-primary-soft p-5 md:p-6">
          <p className="text-sm font-semibold text-primary">{cadenceLabel(plan.interval)}</p>
          <div className="mt-2 flex flex-wrap items-end gap-x-3 gap-y-1">
            <strong className="text-4xl font-bold tracking-tight text-foreground md:text-5xl">
              {formatMoney(plan.price_cents)}
            </strong>
            <span className="pb-1 text-base font-bold text-muted">
              / {intervalLabel(plan.interval)}
            </span>
          </div>
          <p className="mt-3 text-sm font-medium leading-6 text-muted">
            Valor mensal cadastrado e disponível somente para leitura.
          </p>
        </div>
      </div>

      <aside className="border-t border-border bg-surface-muted/50 p-5 md:p-6 lg:border-l lg:border-t-0">
        <div className="grid gap-3">
          <PlanDetail
            icon={<Clock3 aria-hidden className="h-5 w-5" />}
            label="Atualizado em"
            value={formatDateTime(plan.updated_at)}
          />
          <PlanDetail
            icon={<CreditCard aria-hidden className="h-5 w-5" />}
            label="Integração de cobrança"
            value={
              plan.gateway_plan_configured
                ? "Plano de cobrança vinculado"
                : "Sem vínculo externo fixo"
            }
          />
        </div>
      </aside>
    </div>
  </section>
);

export const AdminSubscriptionSettingsClient = () => {
  const subscriptionPlanQuery = useAdminSubscriptionPlanSetting();
  const queryError = subscriptionPlanQuery.isError
    ? resolveApiError(subscriptionPlanQuery.error)
    : null;

  return (
    <div className="min-w-0 max-w-full space-y-7 overflow-x-clip">
      <SettingsHeader />

      {subscriptionPlanQuery.isLoading ? <LoadingPlanCard /> : null}
      {subscriptionPlanQuery.isError && queryError ? (
        <ErrorPlanCard message={queryError} onRetry={() => void subscriptionPlanQuery.refetch()} />
      ) : null}
      {subscriptionPlanQuery.data?.plan ? (
        <CurrentPlanCard plan={subscriptionPlanQuery.data.plan} />
      ) : null}
    </div>
  );
};
