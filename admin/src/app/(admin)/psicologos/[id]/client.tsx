"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertTriangle,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  BadgeCheck,
  BarChart3,
  Bookmark,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  CreditCard,
  ExternalLink,
  Eye,
  FileText,
  Gift,
  Globe2,
  Heart,
  Info,
  Loader2,
  type LucideIcon,
  Mail,
  MessageCircle,
  Play,
  RefreshCw,
  Search,
  Share2,
  ShieldCheck,
  Star,
  Trophy,
  UserRound,
  Video,
  Wallet,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { FormProvider, type SubmitHandler, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import {
  useAdminPsychologistBilling,
  useAdminPsychologistDetail,
  useAdminPsychologistGrantCourtesy,
  useAdminPsychologistPublications,
  useAdminPsychologistStatistics,
} from "@/api/callers/psychologists";
import { resolveApiError } from "@/api/handle";
import type {
  AdminPsychologistBilling,
  AdminPsychologistCatalogItem,
  AdminPsychologistDetail,
  AdminPsychologistDetailMetric,
  AdminPsychologistDetailStatus,
  AdminPsychologistEngagementMetric,
  AdminPsychologistIntegrationStatus,
  AdminPsychologistPublicationItem,
  AdminPsychologistPublicationMetric,
  AdminPsychologistPublicationsQuery,
  AdminPsychologistStatistics,
} from "@/api/req/psychologists";
import { InputController, SelectController, TextareaController } from "@/components/controllers";
import { cn } from "@/lib/utils";

const numberFormatter = new Intl.NumberFormat("pt-BR");
const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  currency: "BRL",
  style: "currency",
});
const dateFormatter = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" });
const dateTimeFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
});
const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
const publicFrontendUrl = process.env.NEXT_PUBLIC_FRONTEND_URL || "http://localhost:3000";

const TABS = [
  { id: "geral", label: "Geral", ready: true },
  { id: "perfil", label: "Perfil e cadastro", ready: true },
  { id: "plano", label: "Plano e pagamentos", ready: true },
  { id: "estatisticas", label: "Estatísticas", ready: true },
  { id: "publicacoes", label: "Publicações", ready: true },
  { id: "avaliacoes", label: "Avaliações", ready: false, task: "TASK-58" },
  { id: "atividades", label: "Atividades", ready: false, task: "TASK-59" },
  { id: "denuncias", label: "Denúncias", ready: false, task: "TASK-58" },
] as const;

type ActiveTab = (typeof TABS)[number]["id"];

const STATUS_COPY: Record<AdminPsychologistDetailStatus, { className: string; label: string }> = {
  free: { className: "bg-blue-50 text-blue-700", label: "Gratuito" },
  pending: { className: "bg-orange-50 text-orange-700", label: "Pendente" },
  unpublished: { className: "bg-surface-muted text-muted", label: "Não publicado" },
  verified: { className: "bg-emerald-50 text-success", label: "Verificado" },
};

const INTEGRATION_TONE: Record<AdminPsychologistIntegrationStatus["status"], string> = {
  active: "bg-emerald-50 text-success",
  configured: "bg-blue-50 text-blue-700",
  missing: "bg-surface-muted text-muted",
  pending: "bg-orange-50 text-orange-700",
  synced: "bg-emerald-50 text-success",
  unavailable: "bg-surface-muted text-muted",
};

const METRIC_ICONS: Record<string, LucideIcon> = {
  favorites: Heart,
  profile_views: Eye,
  ranking: Trophy,
  rating_avg: Star,
  whatsapp_clicks: MessageCircle,
};

const CARD = "rounded-card border border-border bg-surface shadow-admin-soft";

const courtesyBaseSchema = z.object({
  crp_registration_date: z.string().optional(),
  notes: z.string().max(500, "Use no maximo 500 caracteres.").optional(),
  period_days: z.string().min(1, "Selecione o periodo."),
  reason: z.string().trim().min(3, "Informe o motivo da cortesia.").max(200),
});

type CourtesyFormValues = z.infer<typeof courtesyBaseSchema>;

const createCourtesySchema = (requiresCrpRegistrationDate: boolean) =>
  courtesyBaseSchema.superRefine((values, ctx) => {
    if (requiresCrpRegistrationDate && !values.crp_registration_date?.trim()) {
      ctx.addIssue({
        code: "custom",
        message: "Informe a data de inscricao no CRP.",
        path: ["crp_registration_date"],
      });
    }
  });

const toPublicHref = (url: string) => {
  if (/^https?:\/\//.test(url)) return url;

  return `${publicFrontendUrl.replace(/\/$/, "")}${url}`;
};

const canRenderImage = (src: string | null) => {
  if (!src) return false;
  if (src.startsWith("/")) return true;

  try {
    const url = new URL(src);
    const apiHost = new URL(apiUrl).hostname;

    return ["localhost", "127.0.0.1", apiHost].includes(url.hostname);
  } catch {
    return false;
  }
};

const initials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "PS";

const formatDate = (value?: string | null) => {
  if (!value) return "Não informado";

  return dateFormatter.format(new Date(value));
};

const formatDateTime = (value?: string | null) => {
  if (!value) return "Não informado";

  return dateTimeFormatter.format(new Date(value));
};

const formatNullable = (value?: string | number | null) => {
  if (value === null || value === undefined || value === "") return "Não informado";

  return String(value);
};

const formatMoney = (cents: number | null) => {
  if (cents === null) return "Não informado";

  return currencyFormatter.format(cents / 100);
};

const formatInputDate = (value?: string | null) => {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toISOString().slice(0, 10);
};

const formatPaymentMethod = (method: AdminPsychologistBilling["payment_method"]) => {
  if (!method) return "Nao informado";

  const brand = method.brand || "Cartao";
  const last4 = method.last4 ? `•••• ${method.last4}` : "final nao informado";
  const expiration =
    method.exp_month && method.exp_year
      ? ` · validade ${String(method.exp_month).padStart(2, "0")}/${method.exp_year}`
      : "";

  return `${brand} ${last4}${expiration}`;
};

const formatMetricValue = (metric: AdminPsychologistDetailMetric) => {
  if (metric.value === null) return "—";
  if (metric.unit === "decimal") {
    return metric.value.toLocaleString("pt-BR", {
      maximumFractionDigits: 1,
      minimumFractionDigits: 1,
    });
  }
  if (metric.unit === "position") return `#${numberFormatter.format(metric.value)}`;

  return numberFormatter.format(metric.value);
};

const formatEngagementMetricValue = (metric: AdminPsychologistEngagementMetric) => {
  if (!metric.available || metric.value === null) return "Indisponível";
  if (metric.unit === "percentage") {
    return `${metric.value.toLocaleString("pt-BR", {
      maximumFractionDigits: 1,
      minimumFractionDigits: 1,
    })}%`;
  }
  if (metric.unit === "seconds") return `${numberFormatter.format(metric.value)}s`;

  return numberFormatter.format(metric.value);
};

const engagementMetricTone = (metric: AdminPsychologistEngagementMetric) =>
  metric.available ? "bg-surface text-foreground" : "bg-surface-muted text-muted";

const listText = (items: string[] | AdminPsychologistCatalogItem[]) => {
  if (items.length === 0) return "Não informado";

  return items.map((item) => (typeof item === "string" ? item : item.name)).join(", ");
};

const CardShell = ({ children, className }: { children: ReactNode; className?: string }) => (
  <section className={cn(CARD, className)}>{children}</section>
);

const Badge = ({ children, className }: { children: ReactNode; className?: string }) => (
  <span
    className={cn(
      "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-black",
      className,
    )}
  >
    {children}
  </span>
);

const Avatar = ({ name, src }: { name: string; src: string | null }) => {
  if (!canRenderImage(src)) {
    return (
      <span className="grid h-24 w-24 shrink-0 place-items-center rounded-full bg-primary-soft text-2xl font-black text-primary md:h-28 md:w-28">
        {initials(name)}
      </span>
    );
  }

  return (
    <Image
      alt={`Foto de ${name}`}
      className="h-24 w-24 shrink-0 rounded-full object-cover md:h-28 md:w-28"
      height={112}
      priority
      src={src ?? ""}
      width={112}
    />
  );
};

const IconCircle = ({ icon: Icon }: { icon: LucideIcon }) => (
  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary-soft text-primary">
    <Icon aria-hidden className="h-5 w-5" />
  </span>
);

const LoadingState = () => (
  <div className="space-y-5" data-psychologist-detail-loading="true">
    <div className={cn(CARD, "h-48 animate-pulse bg-surface-muted")} />
    <div className="grid gap-5 xl:grid-cols-2">
      <div className={cn(CARD, "h-80 animate-pulse bg-surface-muted")} />
      <div className={cn(CARD, "h-80 animate-pulse bg-surface-muted")} />
    </div>
  </div>
);

const ErrorState = ({ message, onRetry }: { message: string; onRetry: () => void }) => (
  <CardShell className="p-6" data-psychologist-detail-error="true">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex gap-3">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-red-50 text-danger">
          <AlertTriangle aria-hidden className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-black text-foreground">
            Não foi possível carregar o psicólogo
          </h1>
          <p className="mt-1 text-sm text-muted">{message}</p>
        </div>
      </div>
      <button
        className="inline-flex h-11 items-center justify-center gap-2 rounded-control border border-border bg-surface px-4 text-sm font-black text-foreground transition hover:border-primary"
        onClick={onRetry}
        type="button"
      >
        <RefreshCw aria-hidden className="h-4 w-4" />
        Tentar novamente
      </button>
    </div>
  </CardShell>
);

const DetailHeader = ({ detail, tab }: { detail: AdminPsychologistDetail; tab: ActiveTab }) => {
  const pathname = usePathname();
  const header = detail.header;

  return (
    <CardShell className="overflow-hidden">
      <div className="flex flex-col gap-5 p-5 md:flex-row md:items-start md:justify-between md:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <Avatar name={header.name} src={header.avatar} />
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-3xl font-black tracking-tight text-foreground md:text-4xl">
                {header.name}
              </h1>
              {header.verified ? <BadgeCheck aria-hidden className="h-6 w-6 text-primary" /> : null}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm font-black text-muted">
              <span>Psicólogo(a)</span>
              <span aria-hidden>•</span>
              <span>{header.crp || "CRP não informado"}</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge className={STATUS_COPY[header.status].className}>
                {STATUS_COPY[header.status].label}
              </Badge>
              <Badge className="bg-primary-soft text-primary">
                {header.plan_name || "Sem plano ativo"}
              </Badge>
              <Badge className="bg-amber-50 text-amber-700">
                <Star aria-hidden className="mr-1 h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                {header.rating_avg.toLocaleString("pt-BR", {
                  maximumFractionDigits: 1,
                  minimumFractionDigits: 1,
                })}{" "}
                ({numberFormatter.format(header.rating_count)} avaliações)
              </Badge>
            </div>
            <p className="mt-3 inline-flex items-center gap-2 text-xs font-bold text-muted">
              <Clock aria-hidden className="h-4 w-4 text-primary" />
              Último acesso: {formatDateTime(header.last_access_at)}
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row md:flex-col xl:flex-row">
          <Link
            className="inline-flex h-11 items-center justify-center gap-2 rounded-control border border-border bg-surface px-4 text-sm font-black text-foreground transition hover:border-primary hover:text-primary"
            href="/psicologos/lista"
          >
            <ArrowLeft aria-hidden className="h-4 w-4" />
            Lista
          </Link>
          <a
            className="inline-flex h-11 items-center justify-center gap-2 rounded-control border border-primary bg-surface px-4 text-sm font-black text-primary transition hover:bg-primary-soft"
            href={toPublicHref(header.public_profile_url)}
            rel="noreferrer"
            target="_blank"
          >
            <ExternalLink aria-hidden className="h-4 w-4" />
            Ver perfil público
          </a>
        </div>
      </div>

      <div className="overflow-x-auto border-t border-border px-3">
        <nav aria-label="Abas do detalhe do psicólogo" className="flex min-w-max gap-1">
          {TABS.map((item) => {
            const active = item.id === tab;
            const className = cn(
              "relative inline-flex min-h-14 items-center justify-center px-3 text-sm font-black transition",
              active ? "text-primary" : "text-foreground hover:text-primary",
              !item.ready && "cursor-not-allowed text-muted hover:text-muted",
            );

            if (!item.ready) {
              return (
                <button
                  aria-disabled
                  className={className}
                  key={item.id}
                  title={`${item.label} será implementada em ${item.task}`}
                  type="button"
                >
                  {item.label}
                  <span className="ml-2 rounded-full bg-surface-muted px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-muted">
                    Em breve
                  </span>
                </button>
              );
            }

            return (
              <Link
                aria-current={active ? "page" : undefined}
                className={className}
                href={item.id === "geral" ? pathname : `${pathname}?tab=${item.id}`}
                key={item.id}
              >
                {item.label}
                {active ? (
                  <span className="absolute inset-x-3 bottom-0 h-1 rounded-t-full bg-primary" />
                ) : null}
              </Link>
            );
          })}
        </nav>
      </div>
    </CardShell>
  );
};

const MetricCard = ({ metric }: { metric: AdminPsychologistDetailMetric }) => {
  const Icon = METRIC_ICONS[metric.id] ?? Trophy;

  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <IconCircle icon={Icon} />
      <p className="mt-4 text-sm font-black text-muted">{metric.label}</p>
      <p className="mt-2 text-3xl font-black text-foreground">{formatMetricValue(metric)}</p>
      <p className="mt-2 text-xs font-bold text-muted">Fonte: {metric.source}</p>
    </div>
  );
};

const SubscriptionCard = ({ detail }: { detail: AdminPsychologistDetail }) => {
  const subscription = detail.general.subscription;
  const method = subscription.payment_method;

  return (
    <CardShell className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-foreground">Dados da assinatura</h2>
          <p className="mt-1 text-sm text-muted">Resumo somente leitura do plano atual.</p>
        </div>
        <IconCircle icon={Wallet} />
      </div>
      <dl className="mt-5 divide-y divide-border text-sm">
        {[
          ["Plano atual", subscription.plan_name || "Sem plano ativo"],
          ["Status", subscription.status || "Não informado"],
          ["Início da assinatura", formatDate(subscription.started_at)],
          ["Próxima renovação", formatDate(subscription.current_period_end)],
          ["Valor", formatMoney(subscription.price_cents)],
          ["Gateway", subscription.gateway_label || "Sem vínculo ativo"],
          [
            "Forma de pagamento",
            method
              ? `${method.brand || "Cartão"} •••• ${method.last4 || "----"}${
                  method.exp_month && method.exp_year
                    ? ` · validade ${String(method.exp_month).padStart(2, "0")}/${method.exp_year}`
                    : ""
                }`
              : "Não informado",
          ],
        ].map(([label, value]) => (
          <div className="grid gap-1 py-3 sm:grid-cols-[190px_1fr]" key={label}>
            <dt className="font-black text-muted">{label}</dt>
            <dd className="font-bold text-foreground">{value}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-4 rounded-2xl bg-primary-soft p-3 text-xs font-bold text-muted">
        Dados de pagamento sensíveis não são retornados. Onde houver gateway, o produto real usa
        Mercado Pago.
      </p>
    </CardShell>
  );
};

const IntegrationsCard = ({ detail }: { detail: AdminPsychologistDetail }) => (
  <CardShell className="p-5">
    <h2 className="text-lg font-black text-foreground">Integrações automáticas</h2>
    <div className="mt-4 overflow-x-auto">
      <table className="w-full min-w-[620px] text-left text-sm">
        <thead className="border-b border-border text-xs text-muted">
          <tr>
            <th className="py-3 pr-3 font-black">Integração</th>
            <th className="px-3 py-3 font-black">Status</th>
            <th className="px-3 py-3 font-black">Última sincronização</th>
            <th className="px-3 py-3 font-black">Fonte</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {detail.general.integrations.map((integration) => (
            <tr key={integration.id}>
              <td className="py-3 pr-3 font-black text-foreground">{integration.label}</td>
              <td className="px-3 py-3">
                <Badge className={INTEGRATION_TONE[integration.status]}>
                  {integration.status_label}
                </Badge>
              </td>
              <td className="px-3 py-3 font-bold text-muted">
                {formatDateTime(integration.checked_at)}
              </td>
              <td className="px-3 py-3 text-xs font-bold text-muted">{integration.source}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </CardShell>
);

const EventTimeline = ({
  events,
}: {
  events: AdminPsychologistDetail["general"]["account_history"];
}) => (
  <CardShell className="p-5">
    <h2 className="text-lg font-black text-foreground">Histórico da conta</h2>
    <p className="mt-1 text-sm text-muted">
      Eventos derivados de registros existentes; não é auditoria completa.
    </p>
    <ol className="mt-5 space-y-4">
      {events.map((event) => (
        <li className="grid gap-3 sm:grid-cols-[160px_1fr]" key={event.id}>
          <time className="text-sm font-black text-primary">
            {formatDateTime(event.created_at)}
          </time>
          <div className="rounded-2xl border border-border bg-surface-muted p-3">
            <p className="font-black text-foreground">{event.label}</p>
            <p className="mt-1 text-sm text-muted">{event.description}</p>
            <p className="mt-2 text-xs font-bold text-subtle">Fonte: {event.source}</p>
          </div>
        </li>
      ))}
    </ol>
  </CardShell>
);

const RecentActivity = ({
  events,
}: {
  events: AdminPsychologistDetail["general"]["recent_activity"];
}) => (
  <CardShell className="p-5">
    <div className="flex items-start justify-between gap-3">
      <div>
        <h2 className="text-lg font-black text-foreground">Atividades recentes</h2>
        <p className="mt-1 text-sm text-muted">
          Registro simples dos principais eventos reais encontrados.
        </p>
      </div>
      <Badge className="bg-surface-muted text-muted">Somente leitura</Badge>
    </div>
    {events.length === 0 ? (
      <p className="mt-5 rounded-2xl bg-surface-muted p-4 text-sm text-muted">
        Nenhuma atividade recente real encontrada para este psicólogo.
      </p>
    ) : (
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-border text-xs text-muted">
            <tr>
              <th className="py-3 pr-3 font-black">Data</th>
              <th className="px-3 py-3 font-black">Ação</th>
              <th className="px-3 py-3 font-black">Descrição</th>
              <th className="px-3 py-3 font-black">Fonte</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {events.map((event) => (
              <tr key={event.id}>
                <td className="py-3 pr-3 font-bold text-muted">
                  {formatDateTime(event.created_at)}
                </td>
                <td className="px-3 py-3 font-black text-foreground">{event.label}</td>
                <td className="px-3 py-3 text-muted">{event.description}</td>
                <td className="px-3 py-3 text-xs font-bold text-subtle">{event.source}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </CardShell>
);

const GeneralTab = ({ detail }: { detail: AdminPsychologistDetail }) => (
  <div className="space-y-5" data-psychologist-detail-tab="geral">
    <section>
      <h2 className="sr-only">Métricas principais</h2>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {detail.general.metrics.map((metric) => (
          <MetricCard key={metric.id} metric={metric} />
        ))}
      </div>
    </section>

    <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
      <SubscriptionCard detail={detail} />
      <IntegrationsCard detail={detail} />
    </div>

    <div className="grid gap-5 2xl:grid-cols-[0.9fr_1.1fr]">
      <EventTimeline events={detail.general.account_history} />
      <RecentActivity events={detail.general.recent_activity} />
    </div>
  </div>
);

const FieldRow = ({ label, value }: { label: string; value: ReactNode }) => (
  <div className="grid gap-1 border-b border-border py-3 last:border-0 sm:grid-cols-[190px_1fr]">
    <dt className="text-sm font-black text-muted">{label}</dt>
    <dd className="text-sm font-bold text-foreground">{value}</dd>
  </div>
);

const InfoCard = ({
  children,
  icon: Icon,
  title,
}: {
  children: ReactNode;
  icon: LucideIcon;
  title: string;
}) => (
  <CardShell className="p-5">
    <div className="flex items-center gap-3">
      <IconCircle icon={Icon} />
      <h2 className="text-lg font-black text-foreground">{title}</h2>
    </div>
    <dl className="mt-4">{children}</dl>
  </CardShell>
);

const FeatureLine = ({
  enabled,
  icon: Icon,
  label,
}: {
  enabled: boolean;
  icon: LucideIcon;
  label: string;
}) => (
  <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-surface-muted p-3">
    <span className="inline-flex items-center gap-3 text-sm font-black text-foreground">
      <Icon aria-hidden className="h-5 w-5 text-primary" />
      {label}
    </span>
    <Badge className={enabled ? "bg-emerald-50 text-success" : "bg-surface text-muted"}>
      {enabled ? "Sim" : "Não"}
    </Badge>
  </div>
);

const TextBlock = ({ children, empty }: { children?: string | null; empty: string }) => (
  <p className="whitespace-pre-line rounded-2xl bg-surface-muted p-4 text-sm leading-6 text-foreground">
    {children || empty}
  </p>
);

const VideoCard = ({ detail }: { detail: AdminPsychologistDetail }) => {
  const content = detail.profile.content;
  const canUseCover = canRenderImage(content.video_cover_url || content.cover_image_url);
  const cover = content.video_cover_url || content.cover_image_url;

  return (
    <CardShell className="p-5">
      <div className="flex items-center gap-3">
        <IconCircle icon={Video} />
        <h2 className="text-lg font-black text-foreground">Vídeo de apresentação</h2>
      </div>
      <div className="mt-5 max-w-sm overflow-hidden rounded-[1.6rem] border border-border bg-surface-muted">
        <div className="relative aspect-[3/4] w-full">
          {canUseCover ? (
            <Image
              alt={`Capa do vídeo de apresentação de ${detail.header.name}`}
              className="object-cover"
              fill
              sizes="(max-width: 640px) 100vw, 360px"
              src={cover ?? ""}
              unoptimized
            />
          ) : (
            <div className="grid h-full place-items-center bg-primary-soft text-primary">
              <Video aria-hidden className="h-14 w-14" />
            </div>
          )}
          <span className="absolute inset-0 grid place-items-center bg-overlay/20">
            <span className="grid h-16 w-16 place-items-center rounded-full bg-white/90 text-primary shadow-admin-soft">
              <Play aria-hidden className="ml-1 h-7 w-7 fill-current" />
            </span>
          </span>
        </div>
      </div>
      {content.video_url ? (
        <a
          className="mt-4 inline-flex h-11 items-center justify-center gap-2 rounded-control border border-border bg-surface px-4 text-sm font-black text-foreground transition hover:border-primary hover:text-primary"
          href={content.video_url}
          rel="noreferrer"
          target="_blank"
        >
          <ExternalLink aria-hidden className="h-4 w-4" />
          Abrir vídeo
        </a>
      ) : (
        <p className="mt-4 text-sm font-bold text-muted">Nenhum vídeo cadastrado.</p>
      )}
    </CardShell>
  );
};

const EngagementLoadingState = ({ rows = 3 }: { rows?: number }) => (
  <div className="space-y-5" data-psychologist-engagement-loading="true">
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {["card-1", "card-2", "card-3", "card-4"].map((key) => (
        <div className={cn(CARD, "h-36 animate-pulse bg-surface-muted")} key={key} />
      ))}
    </div>
    {Array.from({ length: rows }, (_, index) => `row-${index + 1}`).map((key) => (
      <div className={cn(CARD, "h-64 animate-pulse bg-surface-muted")} key={key} />
    ))}
  </div>
);

const EngagementMetricCard = ({
  icon: Icon,
  metric,
}: {
  icon: LucideIcon;
  metric: AdminPsychologistEngagementMetric;
}) => (
  <div className={cn("rounded-2xl border border-border p-4", engagementMetricTone(metric))}>
    <IconCircle icon={Icon} />
    <p className="mt-4 text-sm font-black text-muted">{metric.label}</p>
    <p className="mt-2 text-2xl font-black text-foreground">
      {formatEngagementMetricValue(metric)}
    </p>
    <p className="mt-2 text-xs font-bold text-muted">
      {metric.available ? `Fonte: ${metric.source}` : metric.unavailable_reason}
    </p>
  </div>
);

const StatsBars = ({
  keys,
  points,
}: {
  keys: {
    color: string;
    key: keyof AdminPsychologistStatistics["business"]["series"][number];
    label: string;
  }[];
  points: AdminPsychologistStatistics["business"]["series"];
}) => {
  const max = Math.max(
    1,
    ...points.flatMap((point) => keys.map((item) => Number(point[item.key] ?? 0))),
  );

  return (
    <div className="mt-5">
      <div className="mb-4 flex flex-wrap gap-3">
        {keys.map((item) => (
          <span
            className="inline-flex items-center gap-2 text-xs font-black text-muted"
            key={item.key}
          >
            <span className={cn("h-2.5 w-2.5 rounded-full", item.color)} />
            {item.label}
          </span>
        ))}
      </div>
      <div className="grid min-h-52 grid-cols-[repeat(30,minmax(22px,1fr))] items-end gap-2 overflow-x-auto rounded-2xl bg-surface-muted p-4">
        {points.map((point) => (
          <div className="flex min-w-6 flex-col items-center gap-1" key={point.date}>
            <div className="flex h-40 w-full items-end justify-center gap-1">
              {keys.map((item) => (
                <span
                  className={cn("w-1.5 rounded-t-full", item.color)}
                  key={item.key}
                  style={{
                    height: `${Math.max(4, (Number(point[item.key] ?? 0) / max) * 100)}%`,
                  }}
                  title={`${point.date} · ${item.label}: ${Number(point[item.key] ?? 0)}`}
                />
              ))}
            </div>
            <span className="-rotate-45 whitespace-nowrap text-[10px] font-bold text-subtle">
              {point.date.slice(5)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

const StatisticsVideoCard = ({
  detail,
  statistics,
}: {
  detail: AdminPsychologistDetail;
  statistics: AdminPsychologistStatistics;
}) => {
  const video = statistics.video;
  const canUseCover = canRenderImage(video.cover_url || detail.profile.content.cover_image_url);
  const cover = video.cover_url || detail.profile.content.cover_image_url;

  return (
    <CardShell className="p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-black text-foreground">Análises do vídeo de apresentação</h2>
          <p className="mt-1 text-sm text-muted">
            Retenção derivada de sessões reais de vídeo; sem sessões, a métrica fica indisponível.
          </p>
        </div>
        <Badge
          className={video.available ? "bg-emerald-50 text-success" : "bg-surface-muted text-muted"}
        >
          {video.available ? "Disponível" : "Indisponível"}
        </Badge>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[220px_1fr]">
        <div className="max-w-[220px] overflow-hidden rounded-[1.5rem] border border-border bg-surface-muted">
          <div className="relative aspect-[3/4]">
            {canUseCover ? (
              <Image
                alt={`Capa do vídeo de apresentação de ${detail.header.name}`}
                className="object-cover"
                fill
                sizes="220px"
                src={cover ?? ""}
                unoptimized
              />
            ) : (
              <div className="grid h-full place-items-center text-primary">
                <Video aria-hidden className="h-12 w-12" />
              </div>
            )}
            <span className="absolute inset-0 grid place-items-center bg-overlay/20">
              <span className="grid h-14 w-14 place-items-center rounded-full bg-white/90 text-primary shadow-admin-soft">
                <Play aria-hidden className="ml-1 h-6 w-6 fill-current" />
              </span>
            </span>
          </div>
        </div>

        <div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-surface-muted p-4">
              <p className="text-xs font-black text-muted">Visualizações</p>
              <p className="mt-1 text-2xl font-black text-foreground">
                {numberFormatter.format(video.metrics.sessions)}
              </p>
            </div>
            <div className="rounded-2xl bg-surface-muted p-4">
              <p className="text-xs font-black text-muted">Taxa de replays</p>
              <p className="mt-1 text-2xl font-black text-foreground">
                {video.metrics.replay_rate_percent.toLocaleString("pt-BR", {
                  maximumFractionDigits: 1,
                })}
                %
              </p>
            </div>
            <div className="rounded-2xl bg-surface-muted p-4">
              <p className="text-xs font-black text-muted">Retenção média</p>
              <p className="mt-1 text-2xl font-black text-foreground">
                {video.metrics.average_retention_percent.toLocaleString("pt-BR", {
                  maximumFractionDigits: 1,
                })}
                %
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {video.retention.map((bucket) => (
              <div className="grid gap-2 sm:grid-cols-[70px_1fr_60px]" key={bucket.label}>
                <span className="text-xs font-black text-muted">{bucket.label}</span>
                <span className="h-3 overflow-hidden rounded-full bg-surface-muted">
                  <span
                    className="block h-full rounded-full bg-primary"
                    style={{ width: `${Math.min(100, bucket.percentage)}%` }}
                  />
                </span>
                <span className="text-xs font-black text-foreground">
                  {bucket.percentage.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%
                </span>
              </div>
            ))}
          </div>

          {!video.available ? (
            <p className="mt-4 rounded-2xl border border-dashed border-border bg-surface-muted p-3 text-sm font-bold text-muted">
              {video.unavailable_reason}
            </p>
          ) : null}
        </div>
      </div>
    </CardShell>
  );
};

const StatisticsTab = ({ detail, id }: { detail: AdminPsychologistDetail; id: string }) => {
  const query = useAdminPsychologistStatistics(id);
  const errorMessage = query.error ? resolveApiError(query.error) : null;

  if (query.isLoading) return <EngagementLoadingState />;
  if (query.isError && errorMessage) {
    return <ErrorState message={errorMessage} onRetry={() => void query.refetch()} />;
  }
  if (!query.data) return null;

  const statistics = query.data;

  return (
    <div className="space-y-5" data-psychologist-detail-tab="estatisticas">
      <div className="flex flex-col gap-3 rounded-2xl border border-primary/20 bg-primary-soft p-4 text-sm font-bold text-muted sm:flex-row sm:items-center sm:justify-between">
        <span>
          Período: {statistics.period.label} · {statistics.period.from} a {statistics.period.to}
        </span>
        <span>Fontes reais: {statistics.source}</span>
      </div>

      <section>
        <h2 className="mb-3 text-xl font-black text-foreground">Estatísticas de negócio</h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {statistics.business.cards.map((item) => (
            <EngagementMetricCard
              icon={
                item.id === "profile_views"
                  ? Eye
                  : item.id === "whatsapp_clicks"
                    ? MessageCircle
                    : item.id === "favorites"
                      ? Heart
                      : Search
              }
              key={item.id}
              metric={item}
            />
          ))}
        </div>
        <CardShell className="mt-5 p-5">
          <h3 className="text-lg font-black text-foreground">Evolução do período</h3>
          <StatsBars
            keys={[
              { color: "bg-primary", key: "profile_views", label: "Visualizações" },
              { color: "bg-emerald-500", key: "whatsapp_clicks", label: "WhatsApp" },
              { color: "bg-pink-500", key: "favorites", label: "Favoritos" },
            ]}
            points={statistics.business.series}
          />
        </CardShell>
      </section>

      <StatisticsVideoCard detail={detail} statistics={statistics} />

      <section className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <CardShell className="p-5">
          <h2 className="text-xl font-black text-foreground">Estatísticas de comunidade</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {statistics.community.cards.map((item) => (
              <EngagementMetricCard
                icon={
                  item.id === "posts"
                    ? FileText
                    : item.id === "replies"
                      ? MessageCircle
                      : item.id === "saves"
                        ? Bookmark
                        : BookOpen
                }
                key={item.id}
                metric={item}
              />
            ))}
          </div>
          <StatsBars
            keys={[
              { color: "bg-primary", key: "posts", label: "Posts" },
              { color: "bg-blue-500", key: "replies", label: "Respostas" },
              { color: "bg-emerald-500", key: "saves", label: "Salvamentos" },
              { color: "bg-orange-500", key: "comments_received", label: "Comentários recebidos" },
            ]}
            points={statistics.community.series}
          />
        </CardShell>

        <CardShell className="p-5">
          <h2 className="text-xl font-black text-foreground">Comunidades em que participa</h2>
          {statistics.community.communities.length === 0 ? (
            <p className="mt-4 rounded-2xl bg-surface-muted p-4 text-sm font-bold text-muted">
              Nenhuma participação real em comunidade foi encontrada.
            </p>
          ) : (
            <div className="mt-4 divide-y divide-border">
              {statistics.community.communities.map((community) => (
                <div className="grid gap-3 py-4 sm:grid-cols-[1fr_auto]" key={community.id}>
                  <div>
                    <p className="flex items-center gap-2 font-black text-foreground">
                      <span
                        className="h-3 w-3 rounded-full bg-primary"
                        style={community.color ? { backgroundColor: community.color } : undefined}
                      />
                      {community.name}
                    </p>
                    <p className="mt-1 text-xs font-bold text-muted">
                      Membro desde {formatDate(community.member_since)}
                    </p>
                  </div>
                  <div className="flex gap-2 text-xs font-black">
                    <Badge className="bg-surface-muted text-muted">
                      {numberFormatter.format(community.posts)} posts
                    </Badge>
                    <Badge className="bg-surface-muted text-muted">
                      {numberFormatter.format(community.replies)} respostas
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardShell>
      </section>

      {statistics.unavailable.length > 0 ? (
        <CardShell className="p-4">
          <p className="text-sm font-black text-foreground">Métricas indisponíveis nesta etapa</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm font-bold text-muted">
            {statistics.unavailable.map((item) => (
              <li key={item.id}>
                {item.label}: {item.unavailable_reason}
              </li>
            ))}
          </ul>
        </CardShell>
      ) : null}
    </div>
  );
};

const publicationMetricIcon: Record<keyof AdminPsychologistPublicationItem["metrics"], LucideIcon> =
  {
    comments: MessageCircle,
    downvotes: ArrowDown,
    saves: Bookmark,
    shares: Share2,
    upvotes: ArrowUp,
    views: Eye,
  };

const PublicationMedia = ({ item }: { item: AdminPsychologistPublicationItem }) => {
  const src = item.media?.url ?? null;
  const looksLikeImage =
    item.media?.type?.startsWith("image") || /\.(png|jpe?g|webp|gif)$/i.test(src ?? "");

  if (src && looksLikeImage && canRenderImage(src)) {
    return (
      <Image
        alt={`Mídia da publicação ${item.title}`}
        className="h-14 w-14 rounded-2xl object-cover"
        height={56}
        src={src}
        unoptimized
        width={56}
      />
    );
  }

  return (
    <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-primary-soft text-primary">
      {item.type === "post" ? (
        <FileText aria-hidden className="h-6 w-6" />
      ) : (
        <MessageCircle aria-hidden className="h-6 w-6" />
      )}
    </span>
  );
};

const PublicationMetric = ({ metric }: { metric: AdminPsychologistPublicationMetric }) => {
  const Icon =
    publicationMetricIcon[metric.id as keyof AdminPsychologistPublicationItem["metrics"]] ??
    BarChart3;

  return (
    <span
      className="inline-flex items-center gap-1 rounded-full bg-surface-muted px-2 py-1 text-xs font-black text-muted"
      title={metric.available ? metric.source : (metric.unavailable_reason ?? metric.source)}
    >
      <Icon aria-hidden className="h-3.5 w-3.5" />
      {formatEngagementMetricValue(metric)}
    </span>
  );
};

const PublicationsPagination = ({
  page,
  pages,
  setPage,
}: {
  page: number;
  pages: number;
  setPage: (page: number) => void;
}) => (
  <div className="flex flex-wrap items-center justify-center gap-2">
    <button
      className="grid h-10 w-10 place-items-center rounded-control border border-border bg-surface text-foreground disabled:opacity-40"
      disabled={page <= 1}
      onClick={() => setPage(Math.max(1, page - 1))}
      type="button"
    >
      <ChevronLeft aria-hidden className="h-4 w-4" />
    </button>
    {Array.from({ length: Math.min(5, pages) }, (_, index) => {
      const start = Math.min(Math.max(page - 2, 1), Math.max(pages - 4, 1));
      const itemPage = start + index;
      if (itemPage > pages) return null;

      return (
        <button
          className={cn(
            "h-10 min-w-10 rounded-control border px-3 text-sm font-black",
            itemPage === page
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-surface text-foreground",
          )}
          key={itemPage}
          onClick={() => setPage(itemPage)}
          type="button"
        >
          {itemPage}
        </button>
      );
    })}
    <button
      className="grid h-10 w-10 place-items-center rounded-control border border-border bg-surface text-foreground disabled:opacity-40"
      disabled={page >= pages}
      onClick={() => setPage(Math.min(pages, page + 1))}
      type="button"
    >
      <ChevronRight aria-hidden className="h-4 w-4" />
    </button>
  </div>
);

const PublicationsTab = ({ id }: { id: string }) => {
  const [q, setQ] = useState("");
  const [community, setCommunity] = useState("all");
  const [type, setType] = useState<AdminPsychologistPublicationsQuery["type"]>("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const queryInput = useMemo<AdminPsychologistPublicationsQuery>(
    () => ({
      community: community === "all" ? undefined : community,
      from: from && to ? from : undefined,
      limit: 5,
      page,
      q: q || undefined,
      to: from && to ? to : undefined,
      type,
    }),
    [community, from, page, q, to, type],
  );
  const query = useAdminPsychologistPublications(id, queryInput);
  const errorMessage = query.error ? resolveApiError(query.error) : null;

  if (query.isLoading) return <EngagementLoadingState rows={2} />;
  if (query.isError && errorMessage) {
    return <ErrorState message={errorMessage} onRetry={() => void query.refetch()} />;
  }
  if (!query.data) return null;

  const publications = query.data;

  return (
    <div className="space-y-5" data-psychologist-detail-tab="publicacoes">
      <div className="rounded-2xl border border-primary/20 bg-primary-soft p-4 text-sm font-bold text-muted">
        Publicações vindas de community_post e post_reply reais. A tela é somente leitura: não há
        moderação, edição ou remoção nesta task.
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {publications.totals.cards.map((item) => (
          <EngagementMetricCard
            icon={
              item.id === "posts"
                ? FileText
                : item.id === "replies"
                  ? MessageCircle
                  : item.id === "upvotes"
                    ? ArrowUp
                    : item.id === "downvotes"
                      ? ArrowDown
                      : item.id === "views"
                        ? Eye
                        : item.id === "saves"
                          ? Bookmark
                          : Share2
            }
            key={item.id}
            metric={item}
          />
        ))}
      </div>

      <CardShell className="p-4">
        <div className="grid gap-3 lg:grid-cols-[1.5fr_1fr_1fr_1fr_1fr]">
          <label className="block text-sm font-black text-muted">
            Buscar
            <span className="mt-2 flex h-11 items-center gap-2 rounded-control border border-border bg-surface px-3">
              <Search aria-hidden className="h-4 w-4 text-muted" />
              <input
                className="w-full bg-transparent text-sm font-bold text-foreground outline-none placeholder:text-subtle"
                onChange={(event) => {
                  setQ(event.target.value);
                  setPage(1);
                }}
                placeholder="Título ou conteúdo"
                type="search"
                value={q}
              />
            </span>
          </label>
          <label className="block text-sm font-black text-muted">
            Comunidade
            <select
              className="mt-2 h-11 w-full rounded-control border border-border bg-surface px-3 text-sm font-bold text-foreground"
              onChange={(event) => {
                setCommunity(event.target.value);
                setPage(1);
              }}
              value={community}
            >
              <option value="all">Todas</option>
              {publications.filters.communities.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-black text-muted">
            Tipo
            <select
              className="mt-2 h-11 w-full rounded-control border border-border bg-surface px-3 text-sm font-bold text-foreground"
              onChange={(event) => {
                setType(event.target.value as AdminPsychologistPublicationsQuery["type"]);
                setPage(1);
              }}
              value={type}
            >
              {publications.filters.types.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-black text-muted">
            De
            <input
              className="mt-2 h-11 w-full rounded-control border border-border bg-surface px-3 text-sm font-bold text-foreground"
              onChange={(event) => {
                setFrom(event.target.value);
                setPage(1);
              }}
              type="date"
              value={from}
            />
          </label>
          <label className="block text-sm font-black text-muted">
            Até
            <input
              className="mt-2 h-11 w-full rounded-control border border-border bg-surface px-3 text-sm font-bold text-foreground"
              onChange={(event) => {
                setTo(event.target.value);
                setPage(1);
              }}
              type="date"
              value={to}
            />
          </label>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-bold text-muted">
          <Badge className="bg-surface-muted text-muted">
            {publications.active_filters_count} filtros ativos
          </Badge>
          <span>
            Período consultado: {publications.period.from} a {publications.period.to}
          </span>
          {from && !to ? <span>Informe a data final para aplicar período.</span> : null}
          {to && !from ? <span>Informe a data inicial para aplicar período.</span> : null}
        </div>
      </CardShell>

      <CardShell className="overflow-hidden">
        <div className="flex flex-col gap-2 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-black text-foreground">Publicações</h2>
            <p className="mt-1 text-sm text-muted">
              Mostrando {numberFormatter.format(publications.data.length)} de{" "}
              {numberFormatter.format(publications.count)} registros.
            </p>
          </div>
          <Badge className="bg-primary-soft text-primary">Somente leitura</Badge>
        </div>

        {publications.data.length === 0 ? (
          <p className="p-5 text-sm font-bold text-muted">
            Nenhuma publicação real encontrada para os filtros atuais.
          </p>
        ) : (
          <div className="divide-y divide-border">
            {publications.data.map((item) => (
              <article
                className="grid gap-4 p-4 lg:grid-cols-[1fr_auto]"
                key={`${item.type}-${item.id}`}
              >
                <div className="flex gap-3">
                  <PublicationMedia item={item} />
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className="bg-primary-soft text-primary">
                        {item.type === "post" ? "Post" : "Resposta"}
                      </Badge>
                      <span className="text-xs font-bold text-muted">
                        {item.community.name} · {formatDateTime(item.created_at)}
                      </span>
                    </div>
                    <h3 className="mt-2 font-black text-foreground">{item.title}</h3>
                    <p className="mt-1 text-sm font-bold leading-6 text-muted">{item.excerpt}</p>
                    <a
                      className="mt-2 inline-flex items-center gap-1 text-xs font-black text-primary"
                      href={toPublicHref(item.public_url)}
                      rel="noreferrer"
                      target="_blank"
                    >
                      Ver no site público
                      <ExternalLink aria-hidden className="h-3.5 w-3.5" />
                    </a>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 lg:max-w-md lg:justify-end">
                  {Object.values(item.metrics).map((metric) => (
                    <PublicationMetric key={metric.id} metric={metric} />
                  ))}
                </div>
              </article>
            ))}
          </div>
        )}

        <div className="border-t border-border p-4">
          <PublicationsPagination
            page={publications.page}
            pages={publications.pages}
            setPage={setPage}
          />
        </div>
      </CardShell>

      {publications.unavailable.length > 0 ? (
        <CardShell className="p-4">
          <p className="text-sm font-black text-foreground">Métricas indisponíveis nesta etapa</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm font-bold text-muted">
            {publications.unavailable.map((item) => (
              <li key={item.id}>
                {item.label}: {item.unavailable_reason}
              </li>
            ))}
          </ul>
        </CardShell>
      ) : null}
    </div>
  );
};

const BillingStatusBadge = ({ status }: { status: string | null }) => {
  const normalized = (status || "").toLowerCase();
  const className =
    normalized === "ativa"
      ? "bg-emerald-50 text-success"
      : normalized.includes("cancel")
        ? "bg-red-50 text-danger"
        : "bg-surface-muted text-muted";

  return <Badge className={className}>{status || "Nao informado"}</Badge>;
};

const PaymentHistoryBadge = ({
  status,
  label,
}: {
  label: string;
  status: AdminPsychologistBilling["payment_history"]["items"][number]["status"];
}) => {
  const className =
    status === "pago"
      ? "bg-emerald-50 text-success"
      : status === "recusado" || status === "cancelado"
        ? "bg-red-50 text-danger"
        : status === "pendente"
          ? "bg-orange-50 text-orange-700"
          : "bg-surface-muted text-muted";

  return <Badge className={className}>{label}</Badge>;
};

const BillingLoadingState = () => (
  <div className="grid gap-5 xl:grid-cols-2" data-psychologist-billing-loading="true">
    <div className={cn(CARD, "h-72 animate-pulse bg-surface-muted")} />
    <div className={cn(CARD, "h-72 animate-pulse bg-surface-muted")} />
    <div className={cn(CARD, "h-96 animate-pulse bg-surface-muted xl:col-span-2")} />
  </div>
);

const CurrentPlanCard = ({ billing }: { billing: AdminPsychologistBilling }) => {
  const plan = billing.plan;

  return (
    <CardShell className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-foreground">Plano atual</h2>
          <p className="mt-1 text-sm text-muted">
            Dados reais de professional_subscription, sem simulacao de pagamento.
          </p>
        </div>
        <IconCircle icon={Wallet} />
      </div>

      <div className="mt-5 rounded-[1.5rem] border border-primary/10 bg-primary-soft/60 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-lg font-black text-foreground">
              {plan.plan_name || "Sem plano ativo"}
            </p>
            <p className="mt-1 text-sm font-bold text-muted">
              {formatMoney(plan.price_cents)}
              {plan.interval ? ` / ${plan.interval}` : ""}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <BillingStatusBadge status={plan.status} />
            {plan.source_label ? (
              <Badge className="bg-primary-soft text-primary">{plan.source_label}</Badge>
            ) : null}
          </div>
        </div>
      </div>

      <dl className="mt-5 divide-y divide-border text-sm">
        <FieldRow label="Inicio" value={formatDate(plan.started_at)} />
        <FieldRow label="Proxima renovacao" value={formatDate(plan.current_period_end)} />
        <FieldRow label="Gateway" value={plan.gateway_label || "Sem vinculo ativo"} />
        <FieldRow label="Cortesia" value={plan.is_courtesy ? "Sim" : "Nao"} />
        {plan.is_courtesy ? (
          <>
            <FieldRow label="Concedida por" value={formatNullable(plan.granted_by)} />
            <FieldRow label="Motivo" value={formatNullable(plan.grant_reason)} />
          </>
        ) : null}
      </dl>

      <div className="mt-5 rounded-2xl bg-primary-soft p-4 text-sm font-bold text-muted">
        <span className="inline-flex items-center gap-2 font-black text-primary">
          <Info aria-hidden className="h-4 w-4" />
          Acoes financeiras pelo Admin
        </span>
        <p className="mt-1">
          Alteracoes de cobranca e troca de cartao ficam fora desta V1. Cartao continua sendo
          tokenizado pelo usuario no gateway.
        </p>
      </div>
    </CardShell>
  );
};

const PaymentMethodCard = ({ billing }: { billing: AdminPsychologistBilling }) => (
  <CardShell className="p-5">
    <div className="flex items-start justify-between gap-4">
      <div>
        <h2 className="text-xl font-black text-foreground">Forma de pagamento</h2>
        <p className="mt-1 text-sm text-muted">Somente brand, final e validade quando existirem.</p>
      </div>
      <IconCircle icon={CreditCard} />
    </div>

    <div className="mt-5 rounded-[1.5rem] border border-border bg-surface-muted p-4">
      {billing.payment_method ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-lg font-black text-foreground">
              {formatPaymentMethod(billing.payment_method)}
            </p>
            <p className="mt-1 text-sm font-bold text-muted">
              Gateway: {billing.payment_method.gateway}
            </p>
          </div>
          <Badge className="bg-emerald-50 text-success">Mascarado</Badge>
        </div>
      ) : (
        <p className="text-sm font-bold text-muted">
          Nenhuma forma de pagamento real vinculada foi encontrada para exibicao segura.
        </p>
      )}
    </div>

    <p className="mt-4 text-xs font-bold text-subtle">
      O endpoint nao retorna credenciais do gateway nem dados sensiveis do cartao.
    </p>
  </CardShell>
);

const PaymentHistoryCard = ({ billing }: { billing: AdminPsychologistBilling }) => (
  <CardShell className="p-5 xl:col-span-2">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h2 className="text-xl font-black text-foreground">Historico de pagamentos</h2>
        <p className="mt-1 text-sm text-muted">
          Fonte real: payment_event reconciliado com a assinatura.
        </p>
      </div>
      <Badge
        className={
          billing.payment_history.available
            ? "bg-emerald-50 text-success"
            : "bg-surface-muted text-muted"
        }
      >
        {billing.payment_history.available ? "Disponivel" : "Indisponivel"}
      </Badge>
    </div>

    {!billing.payment_history.available ? (
      <div className="mt-5 rounded-2xl border border-dashed border-border bg-surface-muted p-4 text-sm font-bold text-muted">
        {billing.payment_history.reason ||
          "Historico financeiro indisponivel para este psicologo no momento."}
      </div>
    ) : (
      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="border-b border-border text-xs text-muted">
            <tr>
              <th className="py-3 pr-3 font-black">Data</th>
              <th className="px-3 py-3 font-black">Descricao</th>
              <th className="px-3 py-3 font-black">Valor</th>
              <th className="px-3 py-3 font-black">Metodo</th>
              <th className="px-3 py-3 font-black">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {billing.payment_history.items.map((item) => (
              <tr key={item.id}>
                <td className="py-3 pr-3 font-bold text-muted">{formatDate(item.occurred_at)}</td>
                <td className="px-3 py-3">
                  <p className="font-black text-foreground">{item.title}</p>
                  <p className="text-xs font-bold text-muted">{item.description}</p>
                </td>
                <td className="px-3 py-3 font-black text-foreground">
                  {formatMoney(item.amount_cents)}
                </td>
                <td className="px-3 py-3 font-bold text-muted">{item.gateway}</td>
                <td className="px-3 py-3">
                  <PaymentHistoryBadge label={item.status_label} status={item.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </CardShell>
);

const CourtesyForm = ({ billing, id }: { billing: AdminPsychologistBilling; id: string }) => {
  const mutation = useAdminPsychologistGrantCourtesy(id);
  const form = useForm<CourtesyFormValues>({
    defaultValues: {
      crp_registration_date: formatInputDate(billing.courtesy.crp_registration_date),
      notes: "",
      period_days: String(billing.courtesy.period_options[1]?.days ?? 90),
      reason: "",
    },
    mode: "onSubmit",
    resolver: zodResolver(createCourtesySchema(billing.courtesy.requires_crp_registration_date)),
  });
  const disabled = !billing.courtesy.can_grant || mutation.isPending;

  useEffect(() => {
    form.reset({
      crp_registration_date: formatInputDate(billing.courtesy.crp_registration_date),
      notes: "",
      period_days: String(billing.courtesy.period_options[1]?.days ?? 90),
      reason: "",
    });
  }, [billing.courtesy, form]);

  const onSubmit: SubmitHandler<CourtesyFormValues> = async (values) => {
    const confirmed = window.confirm(
      "Confirmar concessao de cortesia profissional para este psicologo?",
    );
    if (!confirmed) return;

    try {
      await mutation.mutateAsync({
        crp_registration_date: values.crp_registration_date?.trim() || null,
        notes: values.notes?.trim() || null,
        period_days: Number(values.period_days),
        reason: values.reason.trim(),
      });
      toast.success("Cortesia concedida com sucesso.");
    } catch (error) {
      toast.error(resolveApiError(error));
    }
  };

  return (
    <CardShell className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-foreground">Conceder cortesia</h2>
          <p className="mt-1 text-sm text-muted">
            Usa a mesma regra operacional do comando subscription:grant.
          </p>
        </div>
        <IconCircle icon={Gift} />
      </div>

      {billing.courtesy.blocked_reason ? (
        <div className="mt-5 rounded-2xl border border-orange-200 bg-orange-50 p-4 text-sm font-bold text-orange-800">
          {billing.courtesy.blocked_reason}
        </div>
      ) : null}

      <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-surface-muted p-3">
          <dt className="font-black text-muted">CPF</dt>
          <dd className="mt-1 font-bold text-foreground">{formatNullable(billing.courtesy.cpf)}</dd>
        </div>
        <div className="rounded-2xl border border-border bg-surface-muted p-3">
          <dt className="font-black text-muted">Regional</dt>
          <dd className="mt-1 font-bold text-foreground">
            {formatNullable(billing.courtesy.regional_crp)}
          </dd>
        </div>
        <div className="rounded-2xl border border-border bg-surface-muted p-3">
          <dt className="font-black text-muted">CRP</dt>
          <dd className="mt-1 font-bold text-foreground">
            {formatNullable(billing.courtesy.registration_number || billing.courtesy.crp)}
          </dd>
        </div>
      </dl>

      <FormProvider {...form}>
        <form className="mt-5 space-y-4" noValidate onSubmit={form.handleSubmit(onSubmit)}>
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectController<CourtesyFormValues>
              disabled={disabled}
              label="Periodo de cortesia"
              name="period_days"
              options={billing.courtesy.period_options.map((option) => ({
                label: option.label,
                value: String(option.days),
              }))}
              required
            />
            <InputController<CourtesyFormValues>
              disabled={disabled}
              label="Data de inscricao no CRP"
              name="crp_registration_date"
              required={billing.courtesy.requires_crp_registration_date}
              type="date"
            />
          </div>
          <InputController<CourtesyFormValues>
            disabled={disabled}
            label="Motivo da cortesia"
            name="reason"
            placeholder="Informe o motivo administrativo"
            required
          />
          <TextareaController<CourtesyFormValues>
            disabled={disabled}
            label="Notas internas"
            name="notes"
            placeholder="Observacoes opcionais para auditoria"
            rows={3}
          />

          <button
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-control border border-primary bg-surface px-4 text-sm font-black text-primary transition hover:bg-primary-soft disabled:cursor-not-allowed disabled:border-border disabled:text-muted"
            disabled={disabled}
            type="submit"
          >
            {mutation.isPending ? (
              <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
            ) : (
              <Gift aria-hidden className="h-4 w-4" />
            )}
            Conceder cortesia
          </button>
        </form>
      </FormProvider>

      <div className="mt-5 rounded-2xl bg-primary-soft p-4 text-sm font-bold text-muted">
        <span className="inline-flex items-center gap-2 font-black text-primary">
          <CalendarDays aria-hidden className="h-4 w-4" />
          Regra de cobranca
        </span>
        <p className="mt-1">
          A cortesia cria source=admin_grant, status=ativa e nao conta como receita.
        </p>
      </div>
    </CardShell>
  );
};

const PlanBillingTab = ({ id }: { detail: AdminPsychologistDetail; id: string }) => {
  const query = useAdminPsychologistBilling(id);
  const errorMessage = query.error ? resolveApiError(query.error) : null;

  if (query.isLoading) return <BillingLoadingState />;

  if (query.isError && errorMessage) {
    return <ErrorState message={errorMessage} onRetry={() => void query.refetch()} />;
  }

  if (!query.data) return null;

  return (
    <div className="space-y-5" data-psychologist-detail-tab="plano">
      <div className="grid gap-5 xl:grid-cols-2">
        <CurrentPlanCard billing={query.data} />
        <PaymentMethodCard billing={query.data} />
        <CourtesyForm billing={query.data} id={id} />
        <PaymentHistoryCard billing={query.data} />
      </div>
    </div>
  );
};

const ProfileTab = ({ detail }: { detail: AdminPsychologistDetail }) => {
  const profile = detail.profile;
  const professional = profile.professional;
  const personal = profile.personal;

  return (
    <div className="space-y-5" data-psychologist-detail-tab="perfil">
      <div className="rounded-2xl border border-primary/20 bg-primary-soft p-4 text-sm font-bold text-muted">
        <span className="inline-flex items-center gap-2 font-black text-primary">
          <ShieldCheck aria-hidden className="h-4 w-4" />
          Dados sensíveis — acesso administrativo
        </span>
        <p className="mt-1">
          CPF, telefone e endereço são exibidos somente neste painel autenticado e não são usados em
          telas públicas.
        </p>
      </div>

      <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="space-y-5">
          <InfoCard icon={UserRound} title="Dados pessoais">
            <FieldRow label="CPF" value={formatNullable(personal.cpf)} />
            <FieldRow label="E-mail" value={personal.email} />
            <FieldRow label="Telefone" value={formatNullable(personal.phone)} />
            <FieldRow label="Data de nascimento" value={formatDate(personal.birthdate)} />
            <FieldRow label="Cadastro via" value={formatNullable(personal.provider)} />
            <FieldRow
              label="Endereço completo"
              value={
                <span className="whitespace-pre-line">{formatNullable(personal.address.full)}</span>
              }
            />
            <FieldRow label="CEP" value={formatNullable(personal.address.zip)} />
          </InfoCard>

          <InfoCard icon={FileText} title="Dados profissionais">
            <FieldRow label="Regional CRP" value={formatNullable(professional.regional_crp)} />
            <FieldRow
              label="Nº de registro"
              value={formatNullable(professional.registration_number)}
            />
            <FieldRow label="CRP completo" value={formatNullable(professional.crp)} />
            <FieldRow label="Status CRP" value={formatNullable(professional.crp_status)} />
            <FieldRow label="Registro CRP" value={formatDate(professional.crp_registration_date)} />
            <FieldRow
              label="Tempo de experiência"
              value={
                professional.experience_years === null
                  ? "Não informado"
                  : `${professional.experience_years} anos`
              }
            />
            <FieldRow label="Especialidades" value={listText(professional.specialties)} />
            <FieldRow label="Abordagens" value={listText(professional.approaches)} />
            <FieldRow label="Serviços" value={listText(professional.services)} />
            <FieldRow label="Público atendido" value={listText(professional.target_audience)} />
            <FieldRow label="Idiomas" value={listText(professional.languages)} />
            <FieldRow label="Modalidade" value={formatNullable(professional.modality)} />
            <FieldRow label="Gênero" value={formatNullable(professional.gender)} />
            <FieldRow label="Raça/Cor" value={formatNullable(professional.race_color)} />
            <FieldRow label="Religião" value={formatNullable(professional.religion)} />
            <FieldRow label="Data de cadastro" value={formatDate(detail.header.created_at)} />
          </InfoCard>

          <CardShell className="p-5">
            <div className="flex items-center gap-3">
              <IconCircle icon={CheckCircle2} />
              <h2 className="text-lg font-black text-foreground">Selos e facilidades</h2>
            </div>
            <div className="mt-4 grid gap-3">
              <FeatureLine
                enabled={profile.features.discount_first_session}
                icon={CreditCard}
                label="Desconto 1ª sessão"
              />
              <FeatureLine
                enabled={profile.features.accepts_insurance}
                icon={ShieldCheck}
                label="Aceita convênios"
              />
              <FeatureLine
                enabled={profile.features.social_value}
                icon={Heart}
                label="Valor social"
              />
            </div>
          </CardShell>
        </div>

        <div className="space-y-5">
          <InfoCard icon={BookOpen} title="Formação e títulos">
            <FieldRow label="Título" value={formatNullable(profile.academic.title)} />
            <FieldRow label="Instituição" value={formatNullable(profile.academic.institution)} />
            <FieldRow
              label="Ano de formação"
              value={formatNullable(profile.academic.graduation_year)}
            />
            <div className="border-b border-border py-3 last:border-0">
              <dt className="text-sm font-black text-muted">Formações adicionais</dt>
              <dd className="mt-2 text-sm font-bold text-foreground">
                {profile.academic.formations.length === 0 ? (
                  "Não informado"
                ) : (
                  <ul className="list-disc space-y-1 pl-5">
                    {profile.academic.formations.map((formation) => (
                      <li key={formation}>{formation}</li>
                    ))}
                  </ul>
                )}
              </dd>
            </div>
          </InfoCard>

          <CardShell className="p-5">
            <div className="flex items-center gap-3">
              <IconCircle icon={Mail} />
              <h2 className="text-lg font-black text-foreground">Bio</h2>
            </div>
            <div className="mt-4">
              <TextBlock empty="Nenhuma bio cadastrada.">{profile.content.bio}</TextBlock>
            </div>
          </CardShell>

          <CardShell className="p-5">
            <div className="flex items-center gap-3">
              <IconCircle icon={Globe2} />
              <h2 className="text-lg font-black text-foreground">Texto de apresentação</h2>
            </div>
            <div className="mt-4">
              <TextBlock empty="Nenhum texto de apresentação cadastrado.">
                {profile.content.headline}
              </TextBlock>
            </div>
          </CardShell>

          <VideoCard detail={detail} />
        </div>
      </div>
    </div>
  );
};

const Content = ({
  detail,
  id,
  tab,
}: {
  detail: AdminPsychologistDetail;
  id: string;
  tab: ActiveTab;
}) => (
  <main className="space-y-5" data-psychologist-detail-id={id}>
    <nav
      aria-label="Breadcrumb"
      className="flex flex-wrap items-center gap-2 text-sm font-bold text-muted"
    >
      <Link className="hover:text-primary" href="/dashboard">
        Dashboard
      </Link>
      <span>/</span>
      <Link className="hover:text-primary" href="/psicologos/lista">
        Psicólogos
      </Link>
      <span>/</span>
      <span className="text-foreground">Detalhes do psicólogo</span>
    </nav>

    <DetailHeader detail={detail} tab={tab} />

    {tab === "perfil" ? (
      <ProfileTab detail={detail} />
    ) : tab === "plano" ? (
      <PlanBillingTab detail={detail} id={id} />
    ) : tab === "estatisticas" ? (
      <StatisticsTab detail={detail} id={id} />
    ) : tab === "publicacoes" ? (
      <PublicationsTab id={id} />
    ) : (
      <GeneralTab detail={detail} />
    )}

    <p className="rounded-2xl bg-primary-soft/70 px-4 py-3 text-xs font-bold text-muted">
      Referências visuais: _product/proto/admin/Psicólogos/Detalhes do psicólogo/Geral.png,
      _product/proto/admin/Psicólogos/Detalhes do psicólogo/Perfil e Cadastro.png e
      _product/proto/admin/Psicólogos/Detalhes do psicólogo/Plano e pagamentos.png,
      _product/proto/admin/Psicólogos/Detalhes do psicólogo/Estatísticas.png e
      _product/proto/admin/Psicólogos/Detalhes do psicólogo/Publicações.png. Builder/Quick Copy não
      está disponível neste ambiente; a implementação foi feita a partir das imagens locais.
    </p>
  </main>
);

export const AdminPsychologistDetailClient = ({ id }: { id: string }) => {
  const searchParams = useSearchParams();
  const requestedTab = searchParams.get("tab") as ActiveTab | null;
  const tab: ActiveTab =
    requestedTab === "perfil" ||
    requestedTab === "plano" ||
    requestedTab === "estatisticas" ||
    requestedTab === "publicacoes"
      ? requestedTab
      : "geral";
  const query = useAdminPsychologistDetail(id);
  const errorMessage = query.error ? resolveApiError(query.error) : null;

  return (
    <div className="space-y-5">
      {query.isLoading ? <LoadingState /> : null}
      {query.isError && errorMessage ? (
        <ErrorState message={errorMessage} onRetry={() => void query.refetch()} />
      ) : null}
      {query.data ? <Content detail={query.data} id={id} tab={tab} /> : null}
      {query.isFetching && !query.isLoading ? (
        <div className="fixed bottom-4 right-4 inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2 text-xs font-black text-muted shadow-admin-soft">
          <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
          Atualizando dados reais
        </div>
      ) : null}
    </div>
  );
};
