"use client";

import {
  AlertTriangle,
  ArrowLeft,
  BadgeCheck,
  BookOpen,
  CheckCircle2,
  Clock,
  CreditCard,
  ExternalLink,
  Eye,
  FileText,
  Globe2,
  Heart,
  Loader2,
  type LucideIcon,
  Mail,
  MessageCircle,
  Play,
  RefreshCw,
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
import type { ReactNode } from "react";
import { useAdminPsychologistDetail } from "@/api/callers/psychologists";
import { resolveApiError } from "@/api/handle";
import type {
  AdminPsychologistCatalogItem,
  AdminPsychologistDetail,
  AdminPsychologistDetailMetric,
  AdminPsychologistDetailStatus,
  AdminPsychologistIntegrationStatus,
} from "@/api/req/psychologists";
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
  { id: "plano", label: "Plano e pagamentos", ready: false, task: "TASK-56" },
  { id: "estatisticas", label: "Estatísticas", ready: false, task: "TASK-57" },
  { id: "publicacoes", label: "Publicações", ready: false, task: "TASK-57" },
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

    {tab === "perfil" ? <ProfileTab detail={detail} /> : <GeneralTab detail={detail} />}

    <p className="rounded-2xl bg-primary-soft/70 px-4 py-3 text-xs font-bold text-muted">
      Referências visuais: _product/proto/admin/Psicólogos/Detalhes do psicólogo/Geral.png e
      _product/proto/admin/Psicólogos/Detalhes do psicólogo/Perfil e Cadastro.png. Builder/Quick
      Copy não está disponível neste ambiente; a implementação foi feita a partir das imagens
      locais.
    </p>
  </main>
);

export const AdminPsychologistDetailClient = ({ id }: { id: string }) => {
  const searchParams = useSearchParams();
  const requestedTab = searchParams.get("tab") as ActiveTab | null;
  const tab: ActiveTab = requestedTab === "perfil" ? "perfil" : "geral";
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
