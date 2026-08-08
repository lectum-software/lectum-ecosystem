"use client";

import { Trophy, Wallet } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import type {
  AdminPsychologistBilling,
  AdminPsychologistDetail,
  AdminPsychologistDetailMetric,
  AdminPsychologistStatistics,
} from "@/api/req/psychologists";
import { cn } from "@/lib/utils";
import { CardShell, IconCircle, MetricIconCircle } from "../../components/shared";
import { METRIC_ICONS } from "../../support/config";
import { formatDate } from "../../support/date-period";
import {
  capitalizeOptionLabel,
  formatMetricLabel,
  formatMetricValue,
  formatMoney,
  formatProfileConversionSupport,
  getHeaderPlanLabel,
} from "../../support/formatters";

export const MetricCard = ({
  footer,
  footerPlacement = "below",
  metric,
}: {
  footer?: ReactNode;
  footerPlacement?: "below" | "inline";
  metric: AdminPsychologistDetailMetric;
}) => {
  const Icon = METRIC_ICONS[metric.id] ?? Trophy;

  return (
    <div className="rounded-card border border-border/75 bg-surface/95 p-4 shadow-admin-soft">
      <MetricIconCircle icon={Icon} metricId={metric.id} />
      <p className="mt-4 text-sm font-extrabold text-muted">{formatMetricLabel(metric)}</p>
      <p className="mt-2 flex items-baseline gap-2 text-3xl font-extrabold text-foreground">
        <span>{formatMetricValue(metric)}</span>
        {footer && footerPlacement === "inline" ? (
          <span className="text-xs font-bold text-subtle">{footer}</span>
        ) : null}
      </p>
      {footer && footerPlacement === "below" ? (
        <p className="mt-2 text-xs font-bold text-subtle">{footer}</p>
      ) : null}
    </div>
  );
};

export const ProfileConversionMetricCard = ({
  isError,
  isLoading,
  statistics,
}: {
  isError: boolean;
  isLoading: boolean;
  statistics?: AdminPsychologistStatistics;
}) => {
  const profileConversion = statistics?.business.profile_conversion;
  const value =
    profileConversion?.quality.label ?? (isLoading ? "Carregando" : isError ? "Indisponível" : "—");

  return (
    <div
      aria-busy={isLoading && !profileConversion}
      className="rounded-card border border-border/75 bg-surface/95 p-4 shadow-admin-soft"
    >
      <MetricIconCircle icon={METRIC_ICONS.profile_conversion} metricId="profile_conversion" />
      <p className="mt-4 text-sm font-extrabold text-muted">Conversão</p>
      <p className="mt-2 text-2xl font-extrabold leading-tight text-foreground sm:text-3xl">
        {value}
      </p>
      {profileConversion && profileConversion.quality.id !== "insufficient_data" ? (
        <div className="mt-2 space-y-1 text-xs font-bold leading-5 text-subtle">
          <p>{profileConversion.platform_position.label}</p>
          <p>{formatProfileConversionSupport(profileConversion)}</p>
        </div>
      ) : null}
    </div>
  );
};

export const EngagementMetricCard = ({
  isError,
  isLoading,
  statistics,
}: {
  isError: boolean;
  isLoading: boolean;
  statistics?: AdminPsychologistStatistics;
}) => {
  const diagnosis = statistics?.community.engagement_diagnosis;
  const value = diagnosis?.label ?? (isLoading ? "Carregando" : isError ? "Indisponível" : "—");

  return (
    <div
      aria-busy={isLoading && !diagnosis}
      className="rounded-card border border-border/75 bg-surface/95 p-4 shadow-admin-soft"
    >
      <MetricIconCircle icon={METRIC_ICONS.engagement} metricId="engagement" />
      <p className="mt-4 text-sm font-extrabold text-muted">Engajamento</p>
      <p className="mt-2 text-2xl font-extrabold leading-tight text-foreground sm:text-3xl">
        {value}
      </p>
    </div>
  );
};

const isFreeOrCourtesySubscription = (
  subscription: AdminPsychologistDetail["general"]["subscription"],
) => {
  const planSlug = subscription.plan_slug?.trim().toLowerCase();
  const planName = subscription.plan_name?.trim().toLowerCase();
  const source = subscription.source?.trim().toLowerCase();

  return (
    source === "admin_grant" ||
    source === "free_signup" ||
    planSlug === "gratuito" ||
    planName === "plano gratuito"
  );
};

const formatSubscriptionRenewal = (
  subscription: AdminPsychologistDetail["general"]["subscription"],
) => {
  if (isFreeOrCourtesySubscription(subscription)) return "Não se aplica";

  return formatDate(subscription.current_period_end);
};

const formatSubscriptionLtv = (
  billing: AdminPsychologistBilling | undefined,
  billingLoading: boolean,
  billingError: boolean,
) => {
  if (billing?.plan.lifetime_value_available) {
    return formatMoney(billing.plan.lifetime_value_cents ?? 0);
  }

  if (billing?.plan.lifetime_value_unavailable_reason) {
    return (
      <span className="flex flex-col gap-1">
        <span>Indisponível</span>
        <span className="text-xs font-bold text-subtle">
          {billing.plan.lifetime_value_unavailable_reason}
        </span>
      </span>
    );
  }

  if (billingLoading) return "Carregando";
  if (billingError) return "Indisponível";

  return "Não informado";
};

const SUBSCRIPTION_STATUS_BADGE_CLASS: Record<string, string> = {
  ativa: "bg-emerald-50 text-success",
  cancelada: "bg-red-50 text-danger",
  inadimplente: "bg-orange-50 text-orange-700",
  inativa: "bg-surface-muted text-muted",
};

const formatSubscriptionStatusLabel = (status?: string | null) => {
  const normalized = String(status ?? "").trim();
  if (!normalized) return "Sem plano";

  return capitalizeOptionLabel(normalized.replace(/_/g, " "));
};

const getSubscriptionSituation = (
  detail: AdminPsychologistDetail,
  billing?: AdminPsychologistBilling,
) => {
  const subscription = detail.general.subscription;
  const plan = billing?.plan;
  const status = plan?.status ?? subscription.status;
  const normalizedStatus = String(status ?? "")
    .trim()
    .toLowerCase();
  const source = plan?.source ?? subscription.source;
  const planSlug = plan?.plan_slug ?? subscription.plan_slug;
  const priceCents = plan?.price_cents ?? subscription.price_cents;
  const isActive = normalizedStatus === "ativa";
  const isCourtesy =
    Boolean(plan?.is_courtesy) ||
    Boolean(billing?.courtesy.can_revoke) ||
    (isActive && source === "admin_grant" && planSlug !== "gratuito");
  const isFree = isActive && planSlug === "gratuito";
  const isPaid =
    isActive &&
    !isCourtesy &&
    planSlug !== "gratuito" &&
    (Boolean(plan?.is_paid) || source === "mercadopago" || (priceCents ?? 0) > 0);

  if (isCourtesy) {
    return {
      badgeClassName: SUBSCRIPTION_STATUS_BADGE_CLASS.ativa,
      badgeLabel: "Ativa",
      helperText:
        "Cortesia administrativa ativa sem cobrança. Revogação e detalhes ficam em Plano e pagamentos.",
      label: "Cortesia ativa",
    };
  }

  if (isPaid) {
    return {
      badgeClassName: SUBSCRIPTION_STATUS_BADGE_CLASS.ativa,
      badgeLabel: "Ativa",
      helperText:
        "Assinatura profissional paga ativa. Cobranças e LTV ficam em Plano e pagamentos.",
      label: "Assinatura paga ativa",
    };
  }

  if (isFree) {
    return {
      badgeClassName: SUBSCRIPTION_STATUS_BADGE_CLASS.ativa,
      badgeLabel: "Ativa",
      helperText:
        "Plano gratuito ativo sem cobrança financeira. Cortesia ou upgrade ficam em Plano e pagamentos.",
      label: "Plano gratuito ativo",
    };
  }

  if (normalizedStatus === "inadimplente") {
    return {
      badgeClassName: SUBSCRIPTION_STATUS_BADGE_CLASS.inadimplente,
      badgeLabel: formatSubscriptionStatusLabel(status),
      helperText:
        "Assinatura com pendência financeira. Revise gateway e histórico em Plano e pagamentos.",
      label: "Assinatura inadimplente",
    };
  }

  if (normalizedStatus === "cancelada") {
    return {
      badgeClassName: SUBSCRIPTION_STATUS_BADGE_CLASS.cancelada,
      badgeLabel: formatSubscriptionStatusLabel(status),
      helperText:
        "Assinatura cancelada. Direitos profissionais dependem de novo plano ativo ou cortesia.",
      label: "Assinatura cancelada",
    };
  }

  if (normalizedStatus === "inativa") {
    return {
      badgeClassName: SUBSCRIPTION_STATUS_BADGE_CLASS.inativa,
      badgeLabel: formatSubscriptionStatusLabel(status),
      helperText: "Nenhuma assinatura profissional ativa liberando cobrança neste momento.",
      label: "Assinatura inativa",
    };
  }

  return {
    badgeClassName:
      SUBSCRIPTION_STATUS_BADGE_CLASS[normalizedStatus] ?? "bg-surface-muted text-muted",
    badgeLabel: formatSubscriptionStatusLabel(status),
    helperText: isActive
      ? "Assinatura ativa registrada no resumo administrativo atual."
      : "Sem assinatura ativa registrada para este psicólogo no resumo atual.",
    label: isActive ? "Assinatura ativa" : "Sem assinatura ativa",
  };
};

export const SubscriptionCard = ({
  billing,
  billingError,
  billingLoading,
  detail,
}: {
  billing?: AdminPsychologistBilling;
  billingError: boolean;
  billingLoading: boolean;
  detail: AdminPsychologistDetail;
}) => {
  const pathname = usePathname();
  const subscription = detail.general.subscription;
  const situation = getSubscriptionSituation(detail, billing);
  const rows: Array<[string, ReactNode]> = [
    ["Plano atual", getHeaderPlanLabel(detail)],
    ["Início", formatDate(subscription.started_at)],
    ["Tempo até assinatura", subscription.time_to_first_paid_subscription.label],
    ["Próxima renovação", formatSubscriptionRenewal(subscription)],
    ["LTV", formatSubscriptionLtv(billing, billingLoading, billingError)],
  ];

  return (
    <CardShell className="flex h-full flex-col p-5">
      <div className="rounded-[28px] border border-primary/15 bg-primary-soft/55 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.12em] text-primary">
              Assinatura
            </p>
            <p className="mt-1 text-xl font-black text-foreground">{situation.label}</p>
          </div>
          <IconCircle icon={Wallet} />
        </div>
        <p className="mt-3 text-sm font-bold leading-6 text-muted">{situation.helperText}</p>
      </div>
      <dl className="mt-4 flex-1 divide-y divide-border text-sm">
        {rows.map(([label, value]) => (
          <div className="grid gap-1 py-3 sm:grid-cols-[190px_1fr]" key={label}>
            <dt className={cn("font-black text-muted", label === "LTV" ? "text-primary" : "")}>
              {label}
            </dt>
            <dd
              className={cn(
                "font-bold text-foreground",
                label === "LTV" ? "text-lg font-black text-primary" : "",
              )}
            >
              {value}
            </dd>
          </div>
        ))}
      </dl>
      <Link
        className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-control border border-primary/45 bg-surface px-4 text-sm font-black text-primary shadow-control transition hover:bg-primary-soft sm:w-auto"
        href={`${pathname}?tab=plano`}
      >
        Abrir assinatura
      </Link>
    </CardShell>
  );
};
