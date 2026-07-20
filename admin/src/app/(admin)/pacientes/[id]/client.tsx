"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertTriangle,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileText,
  Heart,
  KeyRound,
  Loader2,
  Lock,
  LockKeyhole,
  LogOut,
  type LucideIcon,
  Mail,
  MapPin,
  MessageCircle,
  Pencil,
  RefreshCw,
  Send,
  ShieldCheck,
  ThumbsDown,
  ThumbsUp,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { type ReactNode, useMemo, useState } from "react";
import { FormProvider, type SubmitHandler, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import {
  useAdminPatientAccount,
  useAdminPatientChangeAccountEmail,
  useAdminPatientDeactivateAccount,
  useAdminPatientDeleteAccount,
  useAdminPatientDetail,
  useAdminPatientRevokeSessions,
  useAdminPatientSendEmailConfirmation,
  useAdminPatientSendPasswordReset,
  useAdminPatientSetTemporaryPassword,
  useAdminPatientSuspendAccount,
  useAdminPatientUpdatePersonalData,
} from "@/api/callers/patients";
import { resolveApiError } from "@/api/handle";
import type {
  AdminPatientAccount,
  AdminPatientDetail,
  PatientsDetailActivity,
  PatientsDetailCommunity,
  PatientsDetailMetric,
} from "@/api/req/patients";
import { InputController, SelectController, TextareaController } from "@/components/controllers";
import { aggregateCalendarChartPoints, buildSmoothSvgPath } from "@/lib/chart-time-series";
import { cn } from "@/lib/utils";

const LOADING_PLACEHOLDERS = ["profile", "engagement", "activity", "communities"] as const;
const PATIENT_DETAIL_TABS = [
  { id: "geral", label: "Geral" },
  { id: "perfil", label: "Perfil e cadastro" },
  { id: "estatisticas", label: "EstatÃ­sticas" },
  { id: "publicacoes", label: "PublicaÃ§Ãµes" },
  { id: "denuncias", label: "DenÃºncias" },
  { id: "atividades", label: "Atividades" },
  { id: "conta", label: "Conta" },
] as const;
type PatientDetailTab = (typeof PATIENT_DETAIL_TABS)[number]["id"];
const numberFormatter = new Intl.NumberFormat("pt-BR");
const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
const CARD = "rounded-card border border-border/80 bg-surface/95 shadow-admin-soft backdrop-blur";
const metricIcons: Record<PatientsDetailMetric["id"], LucideIcon> = {
  comments_created: MessageCircle,
  downvotes_received: ThumbsDown,
  posts_created: FileText,
  responses_received: Heart,
  upvotes_received: ThumbsUp,
};
const activitySourceLabels: Record<PatientsDetailActivity["source"], string> = {
  community_member: "Comunidade",
  community_post: "Post",
  post_reply: "ComentÃ¡rio",
  post_reply_save: "Resposta salva",
  post_save: "Post salvo",
  post_vote: "Voto",
  professional_review: "AvaliaÃ§Ã£o",
};
const seriesConfig = [
  { color: "var(--admin-primary)", key: "posts_created", label: "Posts" },
  { color: "#5d9df6", key: "comments_created", label: "ComentÃ¡rios" },
  { color: "var(--admin-success)", key: "upvotes_received", label: "Upvotes recebidos" },
  { color: "var(--admin-danger)", key: "downvotes_received", label: "Downvotes recebidos" },
  { color: "var(--admin-warning)", key: "responses_received", label: "Respostas recebidas" },
] as const;
const EMPTY_SELECT_OPTION = { label: "NÃ£o informado", value: "" } as const;
const PATIENT_GENDER_OPTIONS = [
  EMPTY_SELECT_OPTION,
  { label: "Feminino", value: "feminino" },
  { label: "Masculino", value: "masculino" },
  { label: "NÃ£o binÃ¡rio", value: "nao_binario" },
  { label: "Outro", value: "outro" },
  { label: "Prefiro nÃ£o dizer", value: "prefiro_nao_dizer" },
] as const;
const patientPersonalDataSchema = z.object({
  gender: z.string().max(80, "Use no mÃ¡ximo 80 caracteres.").optional(),
  reason: z
    .string()
    .trim()
    .min(10, "Informe um motivo com pelo menos 10 caracteres.")
    .max(500, "Use no mÃ¡ximo 500 caracteres."),
});
type PatientPersonalDataFormValues = z.infer<typeof patientPersonalDataSchema>;

const accountReasonSchema = z.object({
  reason: z
    .string()
    .min(10, "Informe o motivo interno com pelo menos 10 caracteres.")
    .max(500, "Use no maximo 500 caracteres."),
});

const accountChangeEmailSchema = accountReasonSchema
  .extend({
    confirmation: z.string(),
    email: z.string().email("Informe um e-mail valido."),
  })
  .superRefine((values, ctx) => {
    if (values.confirmation.trim().toUpperCase() !== "ALTERAR EMAIL") {
      ctx.addIssue({
        code: "custom",
        message: "Digite ALTERAR EMAIL para confirmar.",
        path: ["confirmation"],
      });
    }
  });

const accountTemporaryPasswordSchema = accountReasonSchema
  .extend({
    confirmation: z.string(),
    password: z
      .string()
      .min(10, "Use pelo menos 10 caracteres.")
      .max(128, "Use no maximo 128 caracteres."),
    password_confirm: z.string(),
  })
  .superRefine((values, ctx) => {
    if (values.confirmation.trim().toUpperCase() !== "ALTERAR SENHA") {
      ctx.addIssue({
        code: "custom",
        message: "Digite ALTERAR SENHA para confirmar.",
        path: ["confirmation"],
      });
    }

    if (values.password !== values.password_confirm) {
      ctx.addIssue({
        code: "custom",
        message: "As senhas precisam ser iguais.",
        path: ["password_confirm"],
      });
    }
  });

const accountRevokeSessionsSchema = accountReasonSchema
  .extend({
    confirmation: z.string(),
  })
  .superRefine((values, ctx) => {
    if (values.confirmation.trim().toUpperCase() !== "ENCERRAR SESSOES") {
      ctx.addIssue({
        code: "custom",
        message: "Digite ENCERRAR SESSOES para confirmar.",
        path: ["confirmation"],
      });
    }
  });

const SUSPENSION_DURATION_VALUES = ["1", "7", "15", "30", "60", "90"] as const;

const SUSPENSION_DURATION_OPTIONS = [
  { label: "1 dia", value: "1" },
  { label: "7 dias", value: "7" },
  { label: "15 dias", value: "15" },
  { label: "30 dias", value: "30" },
  { label: "60 dias", value: "60" },
  { label: "90 dias", value: "90" },
];

const createAccountStatusActionSchema = (
  confirmationText: string,
  requireSuspensionDuration = false,
) =>
  accountReasonSchema
    .extend({
      confirmation: z.string(),
      suspension_duration_days: requireSuspensionDuration
        ? z.enum(SUSPENSION_DURATION_VALUES, {
            message: "Selecione o prazo da suspensao.",
          })
        : z.string().optional(),
    })
    .superRefine((values, ctx) => {
      if (values.confirmation.trim().toUpperCase() !== confirmationText) {
        ctx.addIssue({
          code: "custom",
          message: `Digite ${confirmationText} para confirmar.`,
          path: ["confirmation"],
        });
      }
    });

const accountSuspendSchema = createAccountStatusActionSchema("SUSPENDER CONTA", true);
const accountDeactivateSchema = createAccountStatusActionSchema("DESATIVAR CONTA");
const accountDeleteSchema = createAccountStatusActionSchema("EXCLUIR CONTA");

type AccountReasonFormValues = z.infer<typeof accountReasonSchema>;
type AccountChangeEmailFormValues = z.infer<typeof accountChangeEmailSchema>;
type AccountTemporaryPasswordFormValues = z.infer<typeof accountTemporaryPasswordSchema>;
type AccountRevokeSessionsFormValues = z.infer<typeof accountRevokeSessionsSchema>;
type AccountStatusActionFormValues = z.infer<typeof accountSuspendSchema>;

const formatDateTime = (value?: string | null) => {
  if (!value) return "N\u00e3o informado";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N\u00e3o informado";

  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(date);
};
const formatLastAccess = (value?: string | null) => {
  if (!value) return "N\u00e3o capturado";

  return formatDateTime(value);
};
const formatChange = (value: number | null) => {
  if (value === null) return "sem base anterior";
  if (value === 0) return "0%";
  return `${value > 0 ? "+" : ""}${value.toLocaleString("pt-BR", {
    maximumFractionDigits: 1,
  })}%`;
};
const safeAvatarSrc = (src: string | null) => {
  if (!src) return null;
  if (src.startsWith("/public/files/") || src.startsWith("/community/icons/")) {
    return `${apiUrl}${src}`;
  }
  if (src.startsWith("/")) return src;
  try {
    const url = new URL(src);
    if (["localhost", "127.0.0.1"].includes(url.hostname)) return src;
  } catch {
    return null;
  }
  return null;
};
const isApiMediaSrc = (src: string | null) => Boolean(src?.startsWith(apiUrl));
const initialsFromName = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "PA";
const isPatientDetailTab = (value: string | null): value is PatientDetailTab =>
  PATIENT_DETAIL_TABS.some((tab) => tab.id === value);
const patientTabHref = (id: string, tab: PatientDetailTab) =>
  tab === "geral" ? `/pacientes/${id}` : `/pacientes/${id}?tab=${tab}`;
const formatNullable = (value: string | null | undefined) => {
  const normalized = String(value ?? "").trim();
  return normalized || "N\u00e3o informado";
};
const emptyToNull = (value?: string | null) => {
  const normalized = value?.trim();
  return normalized || null;
};
const capitalizeOptionLabel = (value?: string | number | null) => {
  const formatted = formatNullable(value === undefined || value === null ? null : String(value));
  if (formatted === "N\u00e3o informado") return formatted;

  return formatted.replace(/^(\s*)(\p{L})/u, (_, spaces: string, letter: string) => {
    return `${spaces}${letter.toLocaleUpperCase("pt-BR")}`;
  });
};
const mergeCurrentOption = (
  options: readonly { label: string; value: string }[],
  currentValue?: string | null,
) => {
  const normalized = String(currentValue ?? "").trim();
  if (!normalized || options.some((option) => option.value === normalized)) return [...options];
  const [firstOption, ...restOptions] = options;
  if (!firstOption) {
    return [{ label: `${capitalizeOptionLabel(normalized)} (valor atual)`, value: normalized }];
  }

  return [
    firstOption,
    { label: `${capitalizeOptionLabel(normalized)} (valor atual)`, value: normalized },
    ...restOptions,
  ];
};
const getStaticOptionLabel = (
  options: readonly { label: string; value: string }[],
  value?: string | null,
) => {
  const normalized = String(value ?? "").trim();
  if (!normalized) return "N\u00e3o informado";

  return (
    options.find((option) => option.value === normalized)?.label ??
    capitalizeOptionLabel(normalized)
  );
};
const formatPatientGender = (value?: string | null) =>
  getStaticOptionLabel(PATIENT_GENDER_OPTIONS, value);

const CardShell = ({ children, className }: { children?: ReactNode; className?: string }) => (
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

const IconCircle = ({ icon: Icon }: { icon: LucideIcon }) => (
  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[18px] bg-primary-soft text-primary ring-1 ring-primary/10">
    <Icon aria-hidden className="h-5 w-5" />
  </span>
);

const Avatar = ({ name, src }: { name: string; src: string | null }) => {
  const imageSrc = safeAvatarSrc(src);
  if (!imageSrc) {
    return (
      <span className="grid h-24 w-24 shrink-0 place-items-center rounded-full bg-primary-soft text-3xl font-black text-primary sm:h-32 sm:w-32">
        {initialsFromName(name)}
      </span>
    );
  }
  return (
    <Image
      alt={`Foto de ${name}`}
      className="h-24 w-24 shrink-0 rounded-full object-cover sm:h-32 sm:w-32"
      height={128}
      priority
      src={imageSrc}
      unoptimized={isApiMediaSrc(imageSrc)}
      width={128}
    />
  );
};

const TrendBadge = ({ metric }: { metric: PatientsDetailMetric }) => (
  <span
    className={cn(
      "text-xs font-semibold",
      metric.trend === "up" && "text-success",
      metric.trend === "down" && "text-danger",
      ["flat", "unavailable"].includes(metric.trend) && "text-muted",
    )}
  >
    {formatChange(metric.change_percent)}
  </span>
);

const MetricCard = ({ metric }: { metric: PatientsDetailMetric }) => {
  const Icon = metricIcons[metric.id];
  return (
    <CardShell className="min-h-[9.25rem] p-4">
      <IconCircle icon={Icon} />
      <p className="mt-4 text-sm font-extrabold text-muted">{metric.label}</p>
      <p className="mt-2 text-3xl font-extrabold tracking-tight text-foreground">
        {numberFormatter.format(metric.value)}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <TrendBadge metric={metric} />
        <span className="text-xs font-bold text-muted">vs. perÃ­odo anterior</span>
      </div>
    </CardShell>
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
          <h2 className="text-lg font-black">NÃ£o foi possÃ­vel carregar o paciente</h2>
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

const Header = ({
  detail,
  id,
  tab,
}: {
  detail: AdminPatientDetail;
  id: string;
  tab: PatientDetailTab;
}) => {
  const location = detail.header.location
    ? [detail.header.location.city, detail.header.location.state, detail.header.location.country]
        .filter(Boolean)
        .join(", ")
    : "Localiza\u00e7\u00e3o n\u00e3o capturada";
  return (
    <CardShell className="overflow-hidden">
      <div className="flex flex-col gap-5 p-5 md:flex-row md:items-start md:justify-between md:p-7">
        <div className="flex flex-col gap-5 sm:flex-1 sm:flex-row sm:items-center">
          <Avatar name={detail.header.name} src={detail.header.avatar} />
          <div className="min-w-0">
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">
              {detail.header.name}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm font-semibold text-muted">
              <span>Paciente</span>
            </div>
            <div className="mt-4 flex min-w-0 flex-nowrap items-center gap-x-5 overflow-x-auto text-sm text-muted sm:gap-x-6 md:overflow-visible xl:gap-x-8">
              <span
                className="inline-flex min-w-0 max-w-80 shrink items-center gap-2 whitespace-nowrap"
                title={detail.header.email}
              >
                <Mail aria-hidden className="h-4 w-4 shrink-0 text-primary" />
                <span className="min-w-0 truncate">{detail.header.email}</span>
              </span>
              <span className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap">
                <ShieldCheck aria-hidden className="h-4 w-4 shrink-0 text-primary" />
                <span>{detail.header.status === "active" ? "Conta ativa" : "Conta inativa"}</span>
              </span>
              <span className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap">
                <MapPin aria-hidden className="h-4 w-4 shrink-0 text-primary" />
                <span>{location}</span>
              </span>
            </div>
            <p className="mt-3 text-sm text-muted">
              {"\u00daltimo acesso"}: {formatLastAccess(detail.header.last_access_at)}
            </p>
          </div>
        </div>
      </div>
      <div className="overflow-x-auto border-t border-border bg-surface-muted/40 px-3">
        <nav aria-label="Abas do detalhe do paciente" className="flex min-w-max gap-1 py-1">
          {PATIENT_DETAIL_TABS.map((item) => {
            const active = item.id === tab;

            return (
              <Link
                className={cn(
                  "relative inline-flex min-h-12 items-center justify-center rounded-full px-3.5 text-sm font-black transition",
                  active ? "text-primary" : "text-foreground hover:text-primary",
                )}
                href={patientTabHref(id, item.id)}
                key={item.id}
              >
                <span>{item.label}</span>
                {active ? (
                  <span className="absolute inset-x-4 bottom-1 h-1 rounded-full bg-primary" />
                ) : null}
              </Link>
            );
          })}
        </nav>
      </div>
    </CardShell>
  );
};
const EngagementChart = ({ detail }: { detail: AdminPatientDetail }) => {
  const width = 980;
  const height = 280;
  const padding = { bottom: 28, left: 48, right: 28, top: 28 };
  const points = detail.series.points;
  const chartPoints = aggregateCalendarChartPoints(points, [
    "comments_created",
    "downvotes_received",
    "posts_created",
    "responses_received",
    "upvotes_received",
  ] as const);

  if (chartPoints.length === 0) {
    return (
      <CardShell className="p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-xl font-black text-foreground">EstatÃ­sticas de engajamento</h2>
            <p className="mt-1 text-sm text-muted">
              Nenhum ponto real de engajamento foi encontrado para o perÃ­odo selecionado.
            </p>
          </div>
          <span className="w-fit rounded-full bg-surface-muted px-2 py-1 text-[0.65rem] font-bold text-muted">
            {detail.period.timezone}
          </span>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {detail.metrics.map((metric) => (
            <MetricCard key={metric.id} metric={metric} />
          ))}
        </div>
      </CardShell>
    );
  }

  const maxValue = Math.max(
    1,
    ...chartPoints.flatMap((point) => seriesConfig.map((item) => point[item.key])),
  );
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const getX = (index: number) =>
    padding.left +
    (chartPoints.length <= 1 ? chartWidth / 2 : (index * chartWidth) / (chartPoints.length - 1));
  const getY = (value: number) => padding.top + chartHeight - (value / maxValue) * chartHeight;
  const gridValues = [0, 0.25, 0.5, 0.75, 1].map((ratio) => Math.round(maxValue * ratio));
  const labelStep = Math.max(1, Math.ceil(chartPoints.length / 8));
  const dateLabels = chartPoints.flatMap((point, index) =>
    index % labelStep === 0 || index === chartPoints.length - 1
      ? [{ date: point.date, label: point.chartLabel }]
      : [],
  );

  return (
    <CardShell className="p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-black text-foreground">EstatÃ­sticas de engajamento</h2>
          <p className="mt-1 text-sm text-muted">
            Dados reais de posts, comentÃ¡rios, votos recebidos e respostas recebidas no perÃ­odo.
          </p>
        </div>
        <span className="w-fit rounded-full bg-surface-muted px-2 py-1 text-[0.65rem] font-bold text-muted">
          {detail.period.timezone}
        </span>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {detail.metrics.map((metric) => (
          <MetricCard key={metric.id} metric={metric} />
        ))}
      </div>
      <figure className="mt-6 overflow-hidden">
        <div className="mb-4 flex flex-wrap gap-3">
          {seriesConfig.map((item) => (
            <span
              className="inline-flex items-center gap-2 text-xs font-semibold text-muted"
              key={item.key}
            >
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
              {item.label}
            </span>
          ))}
        </div>
        <div className="w-full overflow-x-auto rounded-[1.5rem] border border-border/70 bg-surface p-4">
          <div className="mx-auto w-full min-w-[720px] max-w-[980px]">
            <svg
              aria-label="GrÃ¡fico de engajamento do paciente"
              className="block h-auto w-full"
              height={height}
              preserveAspectRatio="xMidYMid meet"
              role="img"
              viewBox={`0 0 ${width} ${height}`}
              width={width}
            >
              {gridValues.map((value) => {
                const y = getY(value);
                return (
                  <g key={`grid-${value}-${y}`}>
                    <line
                      opacity="0.58"
                      stroke="var(--admin-border)"
                      strokeWidth="1"
                      x1={padding.left}
                      x2={width - padding.right}
                      y1={y}
                      y2={y}
                    />
                    <text fill="var(--admin-muted)" fontSize="11" fontWeight="500" x="8" y={y + 4}>
                      {numberFormatter.format(value)}
                    </text>
                  </g>
                );
              })}
              {seriesConfig.map((item) => {
                const linePoints = chartPoints.map((point, index) => ({
                  x: getX(index),
                  y: getY(point[item.key]),
                }));
                const path = buildSmoothSvgPath(linePoints);
                return (
                  <g key={item.key}>
                    <path
                      d={path}
                      fill="none"
                      opacity="0.88"
                      stroke={item.color}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2.05"
                    />
                    {linePoints.map((point, index) => (
                      <circle
                        cx={point.x}
                        cy={point.y}
                        fill="var(--admin-surface)"
                        key={`${item.key}-${chartPoints[index].date}`}
                        opacity={index === linePoints.length - 1 ? "1" : "0.72"}
                        r={index === linePoints.length - 1 ? "3.1" : "2.1"}
                        stroke={item.color}
                        strokeWidth="1.45"
                      />
                    ))}
                  </g>
                );
              })}
            </svg>
            <div
              className="mt-1 grid gap-1"
              style={{ gridTemplateColumns: `repeat(${dateLabels.length}, 1fr)` }}
            >
              {dateLabels.map(({ date, label }) => (
                <span className="min-w-0 text-center text-[10px] font-bold text-subtle" key={date}>
                  {label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </figure>
    </CardShell>
  );
};

const ActivityList = ({
  detail,
  description = detail.activities.coverage_note,
  emptyMessage = "Nenhum evento real foi encontrado para este paciente no perÃ­odo selecionado.",
  items = detail.activities.items,
  title = "Atividades recentes",
}: {
  detail: AdminPatientDetail;
  description?: string;
  emptyMessage?: string;
  items?: PatientsDetailActivity[];
  title?: string;
}) => (
  <CardShell className="p-5">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex items-start gap-3">
        <IconCircle icon={Clock3} />
        <div>
          <h2 className="text-lg font-extrabold text-foreground">{title}</h2>
          {description ? <p className="mt-1 text-sm text-muted">{description}</p> : null}
        </div>
      </div>
      <Badge className="bg-surface-muted text-muted">{detail.activities.source}</Badge>
    </div>

    {items.length === 0 ? (
      <p className="mt-5 rounded-2xl bg-surface-muted p-4 text-sm text-muted">{emptyMessage}</p>
    ) : (
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-border text-xs text-muted">
            <tr>
              <th className="py-3 pr-3 font-black">Data</th>
              <th className="px-3 py-3 font-black">AÃ§Ã£o</th>
              <th className="px-3 py-3 font-black">DescriÃ§Ã£o</th>
              <th className="px-3 py-3 font-black">Fonte</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {items.map((activity) => (
              <tr key={activity.id}>
                <td className="py-3 pr-3 font-bold text-muted">
                  {formatDateTime(activity.occurred_at)}
                </td>
                <td className="px-3 py-3 font-black text-foreground">{activity.title}</td>
                <td className="px-3 py-3 text-muted">{activity.description}</td>
                <td className="px-3 py-3 font-bold text-foreground">
                  {activitySourceLabels[activity.source]}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </CardShell>
);

const CommunityAvatar = ({
  community,
  index,
}: {
  community: PatientsDetailCommunity;
  index: number;
}) => {
  const imageSrc = safeAvatarSrc(community.avatar_url);

  if (imageSrc) {
    return (
      <Image
        alt={`Avatar da comunidade ${community.name}`}
        className="h-11 w-11 shrink-0 rounded-[18px] object-cover"
        height={44}
        src={imageSrc}
        unoptimized={isApiMediaSrc(imageSrc)}
        width={44}
      />
    );
  }

  return (
    <span
      className="grid h-11 w-11 shrink-0 place-items-center rounded-[18px] text-sm font-black text-white"
      style={{ backgroundColor: community.color || "var(--admin-primary)" }}
    >
      {index + 1}
    </span>
  );
};

const Communities = ({ detail }: { detail: AdminPatientDetail }) => (
  <CardShell className="p-5">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex items-start gap-3">
        <IconCircle icon={UsersRound} />
        <div>
          <h2 className="text-lg font-extrabold text-foreground">Comunidades mais ativas</h2>
          <p className="mt-1 text-sm text-muted">
            Ranking calculado por participaÃ§Ã£o real e interaÃ§Ãµes do paciente nas comunidades.
          </p>
        </div>
      </div>
      <Badge className="bg-surface-muted text-muted">{detail.communities.source}</Badge>
    </div>
    <div className="mt-5 space-y-3">
      {detail.communities.items.length === 0 ? (
        <p className="rounded-2xl bg-surface-muted p-4 text-sm text-muted">
          Nenhuma comunidade com interaÃ§Ã£o real foi encontrada no perÃ­odo.
        </p>
      ) : (
        detail.communities.items.map((community, index) => (
          <div
            className="flex flex-col gap-3 rounded-2xl border border-border p-4 sm:flex-row sm:items-center sm:justify-between"
            key={community.id}
          >
            <div className="flex min-w-0 items-center gap-3">
              <CommunityAvatar community={community} index={index} />
              <div className="min-w-0">
                <h3 className="truncate font-black text-foreground">{community.name}</h3>
                <p className="text-sm text-muted">
                  {community.is_member ? "Membro real" : "InteraÃ§Ã£o sem vÃ­nculo ativo"}
                  {community.member_since ? ` desde ${formatDateTime(community.member_since)}` : ""}
                </p>
              </div>
            </div>
            <Badge className="w-fit bg-primary-soft text-primary">
              {numberFormatter.format(community.interactions)} interaÃ§Ãµes
            </Badge>
          </div>
        ))
      )}
    </div>
  </CardShell>
);

const Heatmap = ({ detail }: { detail: AdminPatientDetail }) => {
  const rows = useMemo(
    () =>
      Array.from(new Set(detail.heatmap.cells.map((cell) => cell.day_index)))
        .sort((left, right) => left - right)
        .map((dayIndex) => detail.heatmap.cells.filter((cell) => cell.day_index === dayIndex)),
    [detail.heatmap.cells],
  );
  const opacityFor = (count: number) => {
    if (count === 0 || detail.heatmap.max_count === 0) return 0.12;
    return 0.25 + (count / detail.heatmap.max_count) * 0.75;
  };

  return (
    <CardShell className="p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <IconCircle icon={CalendarDays} />
          <div>
            <h2 className="text-lg font-extrabold text-foreground">HorÃ¡rios de maior atividade</h2>
            <p className="mt-1 text-sm text-muted">
              AgregaÃ§Ã£o de eventos reais no fuso BrasÃ­lia ({detail.heatmap.timezone}).
            </p>
          </div>
        </div>
        <Badge className="w-fit bg-surface-muted text-muted">
          {numberFormatter.format(detail.heatmap.total_events)} eventos
        </Badge>
      </div>
      {!detail.heatmap.available ? (
        <p className="mt-5 rounded-2xl bg-surface-muted p-4 text-sm text-muted">
          {detail.heatmap.unavailable_reason || "Sem eventos suficientes para montar o heatmap."}
        </p>
      ) : (
        <div className="mt-5 overflow-x-auto">
          <div className="min-w-[520px] space-y-2">
            {rows.map((cells) => (
              <div
                className="grid grid-cols-[52px_repeat(6,minmax(44px,1fr))] items-center gap-2"
                key={cells[0]?.day_index}
              >
                <span className="text-xs font-black text-muted">{cells[0]?.day}</span>
                {cells.map((cell) => (
                  <div
                    className="grid h-11 place-items-center rounded-xl text-xs font-black text-foreground"
                    key={`${cell.day_index}-${cell.hour}`}
                    style={{
                      backgroundColor: "var(--admin-primary)",
                      opacity: opacityFor(cell.count),
                    }}
                    title={`${cell.day} ${cell.hour_label}: ${cell.count} eventos`}
                  >
                    {cell.count}
                  </div>
                ))}
              </div>
            ))}
            <div className="grid grid-cols-[52px_repeat(6,minmax(44px,1fr))] gap-2">
              <span />
              {detail.heatmap.cells.slice(0, 6).map((cell) => (
                <span className="text-center text-xs font-bold text-muted" key={cell.hour_label}>
                  {cell.hour_label}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </CardShell>
  );
};

const PrivacyNotes = ({ detail }: { detail: AdminPatientDetail }) => (
  <CardShell className="bg-primary-soft/70 p-5">
    <div className="flex gap-3">
      <CheckCircle2 aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
      <div>
        <h2 className="font-black text-foreground">Privacidade e cobertura dos dados</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted">
          {detail.coverage_notes.map((note) => (
            <li key={note}>{note}</li>
          ))}
          {detail.unavailable.map((item) => (
            <li key={item.id}>
              <strong className="text-foreground">{item.label}:</strong> {item.description}
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-muted">
          Campos omitidos na V1: {detail.privacy.omitted_fields.join(", ")}.
        </p>
      </div>
    </div>
  </CardShell>
);

const FieldRow = ({ label, value }: { label: string; value: ReactNode }) => (
  <div className="grid gap-1 border-b border-border/80 py-3 last:border-0 sm:grid-cols-[190px_1fr]">
    <dt className="text-sm font-extrabold text-muted">{label}</dt>
    <dd className="text-sm font-bold text-foreground">{value}</dd>
  </div>
);

const InfoCard = ({
  action,
  children,
  contentAsDescriptionList = true,
  description,
  icon: Icon,
  title,
}: {
  action?: ReactNode;
  children: ReactNode;
  contentAsDescriptionList?: boolean;
  description?: string;
  icon: LucideIcon;
  title: string;
}) => (
  <CardShell className="p-5">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex items-start gap-3">
        <IconCircle icon={Icon} />
        <div>
          <h2 className="text-lg font-extrabold text-foreground">{title}</h2>
          {description ? <p className="mt-1 text-sm text-muted">{description}</p> : null}
        </div>
      </div>
      {action ? <div className="w-full sm:w-auto">{action}</div> : null}
    </div>
    {contentAsDescriptionList ? (
      <dl className="mt-4">{children}</dl>
    ) : (
      <div className="mt-4">{children}</div>
    )}
  </CardShell>
);

const EmptyTabState = ({
  description,
  icon = CheckCircle2,
  title,
}: {
  description: string;
  icon?: LucideIcon;
  title: string;
}) => (
  <CardShell className="p-6">
    <div className="flex gap-3">
      <IconCircle icon={icon} />
      <div>
        <h2 className="text-lg font-extrabold text-foreground">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-muted">{description}</p>
      </div>
    </div>
  </CardShell>
);

const formatPatientLocation = (detail: AdminPatientDetail) => {
  const location = detail.header.location;
  if (!location) return "NÃ£o capturada";

  return (
    [location.city, location.state, location.country].filter(Boolean).join(", ") || "NÃ£o capturada"
  );
};

const getOnboardingLabel = (detail: AdminPatientDetail) =>
  detail.header.onboarding_completed_at
    ? formatDateTime(detail.header.onboarding_completed_at)
    : "Sem conclusÃ£o registrada";

const SummaryCard = ({
  actionHref,
  actionLabel,
  badge,
  children,
  description,
  icon: Icon,
  title,
}: {
  actionHref?: string;
  actionLabel?: string;
  badge?: ReactNode;
  children: ReactNode;
  description: string;
  icon: LucideIcon;
  title: string;
}) => (
  <CardShell className="flex h-full flex-col p-5">
    <div className="flex items-start justify-between gap-3">
      <div>
        <h2 className="text-lg font-black text-foreground">{title}</h2>
        <p className="mt-1 text-sm text-muted">{description}</p>
      </div>
      <IconCircle icon={Icon} />
    </div>
    {badge ? (
      <div className="mt-5 rounded-[28px] border border-primary/15 bg-primary-soft/55 p-4">
        {badge}
      </div>
    ) : null}
    <dl className="mt-4 flex-1 divide-y divide-border text-sm">{children}</dl>
    {actionHref && actionLabel ? (
      <Link
        className="mt-4 inline-flex h-11 w-full items-center justify-center rounded-control border border-primary/45 bg-surface px-4 text-sm font-black text-primary shadow-control transition hover:bg-primary-soft sm:w-auto"
        href={actionHref}
      >
        {actionLabel}
      </Link>
    ) : null}
  </CardShell>
);

const AccountSituationCard = ({ detail, id }: { detail: AdminPatientDetail; id: string }) => {
  const active = detail.header.status === "active";

  return (
    <SummaryCard
      actionHref={patientTabHref(id, "conta")}
      actionLabel="Abrir dados da conta"
      description="Resumo somente leitura de acesso do paciente."
      icon={ShieldCheck}
      title="SituaÃ§Ã£o da conta"
      badge={
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.12em] text-primary">
              SituaÃ§Ã£o atual
            </p>
            <p className="mt-1 text-xl font-black text-foreground">
              {active ? "Conta ativa" : "Conta inativa"}
            </p>
            <p className="mt-3 text-sm font-bold leading-6 text-muted">
              {active
                ? "Login liberado para uso normal da plataforma."
                : "Conta sem acesso ativo no momento; revise as acoes completas na aba Conta."}
            </p>
          </div>
          <Badge className={active ? "bg-emerald-50 text-success" : "bg-red-50 text-danger"}>
            {detail.header.status_label}
          </Badge>
        </div>
      }
    >
      <FieldRow label="E-mail" value={detail.header.email} />
      <FieldRow label="Ãšltimo acesso" value={formatLastAccess(detail.header.last_access_at)} />
      <FieldRow label="Cadastro via" value={detail.header.provider_label} />
      <FieldRow label="Criado em" value={formatDateTime(detail.header.created_at)} />
    </SummaryCard>
  );
};

const PatientRegistrationSummaryCard = ({
  detail,
  id,
}: {
  detail: AdminPatientDetail;
  id: string;
}) => (
  <SummaryCard
    actionHref={patientTabHref(id, "perfil")}
    actionLabel="Abrir perfil e cadastro"
    description="Dados cadastrais mÃ­nimos aprovados para o Admin V1."
    icon={UserRound}
    title="Cadastro do paciente"
    badge={
      <div>
        <p className="text-xs font-black uppercase tracking-[0.12em] text-primary">Onboarding</p>
        <p className="mt-1 text-xl font-black text-foreground">
          {detail.header.onboarding_completed_at ? "ConcluÃ­do" : "Sem conclusÃ£o registrada"}
        </p>
        <p className="mt-3 text-sm font-bold leading-6 text-muted">
          {detail.header.onboarding_completed_at
            ? "Fluxo inicial concluÃ­do com data real registrada."
            : "Nenhuma conclusÃ£o de onboarding foi encontrada para este paciente."}
        </p>
      </div>
    }
  >
    <FieldRow label="ID do paciente" value={detail.header.id} />
    <FieldRow label="GÃªnero" value={formatPatientGender(detail.header.gender)} />
    <FieldRow label="LocalizaÃ§Ã£o agregada" value={formatPatientLocation(detail)} />
    <FieldRow label="Onboarding" value={getOnboardingLabel(detail)} />
  </SummaryCard>
);

const PatientEngagementSummaryCard = ({
  detail,
  id,
}: {
  detail: AdminPatientDetail;
  id: string;
}) => {
  const totalSignals = detail.metrics.reduce((total, metric) => total + metric.value, 0);
  const topCommunity = detail.communities.items[0]?.name ?? "NÃ£o informado";

  return (
    <SummaryCard
      actionHref={patientTabHref(id, "estatisticas")}
      actionLabel="Abrir estatÃ­sticas"
      description="Leitura reduzida do engajamento real no perÃ­odo padrÃ£o."
      icon={BarChart3}
      title="Engajamento"
      badge={
        <div>
          <p className="text-xs font-black uppercase tracking-[0.12em] text-primary">
            Sinais no perÃ­odo
          </p>
          <p className="mt-1 text-3xl font-black text-foreground">
            {numberFormatter.format(totalSignals)}
          </p>
          <p className="mt-3 text-sm font-bold leading-6 text-muted">
            Soma de posts, comentÃ¡rios, votos e respostas recebidas, sem estimativas.
          </p>
        </div>
      }
    >
      <FieldRow label="PerÃ­odo" value={detail.period.label} />
      <FieldRow label="Comunidade destaque" value={topCommunity} />
      <FieldRow
        label="Eventos no heatmap"
        value={numberFormatter.format(detail.heatmap.total_events)}
      />
      <FieldRow label="Fuso" value={detail.period.timezone} />
    </SummaryCard>
  );
};

const ProfileEditButton = ({ disabled, onClick }: { disabled?: boolean; onClick: () => void }) => (
  <button
    className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-control border border-primary px-4 text-sm font-black text-primary transition hover:bg-primary-soft disabled:cursor-not-allowed disabled:border-border disabled:text-muted sm:w-auto"
    disabled={disabled}
    onClick={onClick}
    type="button"
  >
    <Pencil aria-hidden className="h-4 w-4" />
    Editar
  </button>
);

const ProfileFormActions = ({
  disabled,
  onCancel,
}: {
  disabled?: boolean;
  onCancel: () => void;
}) => (
  <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
    <button
      className="inline-flex h-11 items-center justify-center rounded-control border border-border px-4 text-sm font-black text-foreground transition hover:bg-surface-muted disabled:cursor-not-allowed disabled:text-muted"
      disabled={disabled}
      onClick={onCancel}
      type="button"
    >
      Cancelar
    </button>
    <button
      className="inline-flex h-11 items-center justify-center gap-2 rounded-control bg-primary px-4 text-sm font-black text-white transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-muted"
      disabled={disabled}
      type="submit"
    >
      {disabled ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : null}
      Salvar alteraÃ§Ãµes
    </button>
  </div>
);

const PatientPersonalDataRows = ({ detail }: { detail: AdminPatientDetail }) => (
  <>
    <FieldRow label="E-mail" value={detail.header.email} />
    <FieldRow label="GÃªnero" value={formatPatientGender(detail.header.gender)} />
    <FieldRow label="LocalizaÃ§Ã£o" value={formatPatientLocation(detail)} />
  </>
);

const PatientPersonalDataEditForm = ({
  detail,
  onCancel,
}: {
  detail: AdminPatientDetail;
  onCancel: () => void;
}) => {
  const mutation = useAdminPatientUpdatePersonalData(detail.header.id);
  const form = useForm<PatientPersonalDataFormValues>({
    defaultValues: {
      gender: detail.header.gender || "",
      reason: "",
    },
    mode: "onSubmit",
    resolver: zodResolver(patientPersonalDataSchema),
  });
  const disabled = mutation.isPending;
  const onSubmit: SubmitHandler<PatientPersonalDataFormValues> = async (values) => {
    try {
      await mutation.mutateAsync({
        gender: emptyToNull(values.gender),
        reason: values.reason.trim(),
      });
      toast.success("Dados pessoais do paciente atualizados.");
      onCancel();
    } catch (error) {
      toast.error(resolveApiError(error));
    }
  };

  return (
    <FormProvider {...form}>
      <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
        <div className="rounded-2xl border border-border/80 bg-surface-muted p-4">
          <FieldRow
            label="E-mail"
            value={
              <span className="inline-flex items-center gap-2">
                {detail.header.email}
                <LockKeyhole
                  aria-label="E-mail editÃ¡vel somente por fluxo de conta"
                  className="h-4 w-4 text-muted"
                />
              </span>
            }
          />
          <FieldRow label="LocalizaÃ§Ã£o" value={formatPatientLocation(detail)} />
        </div>
        <SelectController<PatientPersonalDataFormValues>
          disabled={disabled}
          label="GÃªnero"
          name="gender"
          options={mergeCurrentOption(PATIENT_GENDER_OPTIONS, detail.header.gender)}
        />
        <TextareaController<PatientPersonalDataFormValues>
          disabled={disabled}
          label="Motivo da alteraÃ§Ã£o"
          name="reason"
          placeholder="Descreva o motivo operacional da alteraÃ§Ã£o."
          required
          rows={3}
        />
        <p className="rounded-2xl bg-surface-muted p-3 text-xs font-bold leading-5 text-muted">
          E-mail e localizaÃ§Ã£o permanecem somente leitura nesta ediÃ§Ã£o: o e-mail pertence ao
          fluxo de conta e a localizaÃ§Ã£o vem de dados coarse de visitor_location.
        </p>
        <ProfileFormActions disabled={disabled} onCancel={onCancel} />
      </form>
    </FormProvider>
  );
};

const ProfileRegistrationTab = ({ detail }: { detail: AdminPatientDetail }) => {
  const [isEditing, setIsEditing] = useState(false);

  return (
    <div className="grid gap-5">
      <InfoCard
        action={isEditing ? null : <ProfileEditButton onClick={() => setIsEditing(true)} />}
        contentAsDescriptionList={!isEditing}
        icon={UserRound}
        title="Dados pessoais"
      >
        {isEditing ? (
          <PatientPersonalDataEditForm detail={detail} onCancel={() => setIsEditing(false)} />
        ) : (
          <PatientPersonalDataRows detail={detail} />
        )}
      </InfoCard>
    </div>
  );
};

const GeneralTab = ({ detail, id }: { detail: AdminPatientDetail; id: string }) => (
  <div className="space-y-5">
    <section>
      <h2 className="sr-only">MÃ©tricas principais do paciente</h2>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {detail.metrics.map((metric) => (
          <MetricCard key={metric.id} metric={metric} />
        ))}
      </div>
    </section>

    <div className="grid items-stretch gap-5 xl:grid-cols-3">
      <AccountSituationCard detail={detail} id={id} />
      <PatientRegistrationSummaryCard detail={detail} id={id} />
      <PatientEngagementSummaryCard detail={detail} id={id} />
    </div>

    <ActivityList detail={detail} />
    <PrivacyNotes detail={detail} />
  </div>
);

const StatisticsTab = ({ detail }: { detail: AdminPatientDetail }) => (
  <div className="space-y-6">
    <EngagementChart detail={detail} />
    <div className="grid gap-6 xl:grid-cols-2">
      <Communities detail={detail} />
      <Heatmap detail={detail} />
    </div>
  </div>
);

const PublicationsTab = ({ detail }: { detail: AdminPatientDetail }) => {
  const publicationActivities = detail.activities.items.filter(
    (activity) => activity.type === "post_created",
  );

  return (
    <ActivityList
      description="PublicaÃ§Ãµes derivadas dos eventos reais de posts criados pelo paciente retornados no contrato atual."
      detail={detail}
      emptyMessage="Nenhuma publicaÃ§Ã£o real foi encontrada para este paciente no perÃ­odo consultado."
      items={publicationActivities}
      title="PublicaÃ§Ãµes"
    />
  );
};

const ReportsTab = () => (
  <EmptyTabState
    description="A V1 do detalhe de pacientes nÃ£o possui contrato dedicado de denÃºncias nem aÃ§Ãµes de moderaÃ§Ã£o para paciente. Nenhum dado foi simulado nesta aba."
    icon={AlertTriangle}
    title="DenÃºncias"
  />
);

const booleanBadge = (value: boolean, labels: { false: string; true: string }) => (
  <Badge className={value ? "bg-emerald-50 text-success" : "bg-orange-50 text-orange-700"}>
    {value ? labels.true : labels.false}
  </Badge>
);

const AccountUnavailableNotice = ({ children }: { children: ReactNode }) => (
  <div className="rounded-2xl border border-dashed border-border bg-surface-muted p-4 text-sm font-bold leading-6 text-muted">
    {children}
  </div>
);

const ACCOUNT_STATUS_BADGE_CLASS: Record<AdminPatientAccount["account_status"], string> = {
  active: "bg-primary-soft text-primary",
  deactivated: "bg-surface-muted text-muted",
  deleted: "bg-danger/10 text-danger",
  suspended: "bg-danger/10 text-danger",
};

const AccountLoadingState = () => (
  <div className="space-y-5" data-patient-account-loading="true">
    <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
      <CardShell className="h-80 animate-pulse bg-surface-muted" />
      <CardShell className="h-80 animate-pulse bg-surface-muted" />
    </div>
    <div className="grid gap-5 xl:grid-cols-2">
      <CardShell className="h-96 animate-pulse bg-surface-muted" />
      <CardShell className="h-96 animate-pulse bg-surface-muted" />
    </div>
  </div>
);

const AccountSummaryCard = ({ account }: { account: AdminPatientAccount }) => (
  <InfoCard icon={ShieldCheck} title="Resumo da conta">
    <FieldRow label="E-mail atual" value={account.email} />
    <FieldRow
      label="Status do e-mail"
      value={booleanBadge(account.confirmed, {
        false: "Pendente",
        true: "Confirmado",
      })}
    />
    <FieldRow label="Confirmado em" value={formatDateTime(account.confirmed_at)} />
    <FieldRow label="Metodo de login" value={account.provider_label} />
    <FieldRow
      label="Senha local"
      value={booleanBadge(account.has_password, {
        false: "Nao possui senha local",
        true: "Possui senha local",
      })}
    />
    <FieldRow
      label="Status da conta"
      value={
        <Badge className={ACCOUNT_STATUS_BADGE_CLASS[account.account_status]}>
          {account.account_status_label}
        </Badge>
      }
    />
    <FieldRow
      label="Status alterado em"
      value={formatDateTime(account.account_status_changed_at)}
    />
    {account.account_status === "suspended" ? (
      <FieldRow label="Suspensa ate" value={formatDateTime(account.account_status_expires_at)} />
    ) : null}
    <FieldRow
      label="Troca obrigatoria"
      value={booleanBadge(account.need_reset, {
        false: "Sem pendencia",
        true: "Pendente",
      })}
    />
    <FieldRow label="Conta criada em" value={formatDateTime(account.created_at)} />
    <FieldRow label="Ultimo acesso" value={formatLastAccess(account.last_access_at)} />
    <FieldRow
      label="Sessoes ativas"
      value={
        numberFormatter.format(account.sessions.active_count) +
        " sessao(oes) em " +
        numberFormatter.format(account.sessions.devices_count) +
        " dispositivo(s)"
      }
    />
  </InfoCard>
);

const AccountChangeEmailForm = ({ account, id }: { account: AdminPatientAccount; id: string }) => {
  const mutation = useAdminPatientChangeAccountEmail(id);
  const form = useForm<AccountChangeEmailFormValues>({
    defaultValues: {
      confirmation: "",
      email: "",
      reason: "",
    },
    mode: "onSubmit",
    resolver: zodResolver(accountChangeEmailSchema),
  });
  const disabled = !account.capabilities.can_change_email || mutation.isPending;

  const onSubmit: SubmitHandler<AccountChangeEmailFormValues> = async (values) => {
    try {
      await mutation.mutateAsync({
        confirmation: values.confirmation.trim().toUpperCase(),
        email: values.email.trim().toLowerCase(),
        reason: values.reason.trim(),
      });
      form.reset();
      toast.success("E-mail alterado. Confirmacao enviada para o novo endereco.");
    } catch (error) {
      toast.error(resolveApiError(error));
    }
  };

  return (
    <FormProvider {...form}>
      <form className="grid gap-3" noValidate onSubmit={form.handleSubmit(onSubmit)}>
        <InputController<AccountChangeEmailFormValues>
          autoComplete="off"
          disabled={disabled}
          label="Novo e-mail"
          name="email"
          placeholder="novo@email.com"
          required
          type="email"
        />
        <TextareaController<AccountChangeEmailFormValues>
          disabled={disabled}
          label="Motivo/observacao interna"
          name="reason"
          placeholder="Explique a solicitacao recebida pelo suporte."
          required
          rows={3}
        />
        <InputController<AccountChangeEmailFormValues>
          autoComplete="off"
          disabled={disabled}
          label="Confirmacao forte"
          name="confirmation"
          placeholder="ALTERAR EMAIL"
          required
        />
        <button
          className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-control bg-primary px-4 text-sm font-black text-white transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-muted"
          disabled={disabled}
          type="submit"
        >
          {mutation.isPending ? (
            <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
          ) : (
            <Mail aria-hidden className="h-4 w-4" />
          )}
          Alterar e-mail
        </button>
      </form>
    </FormProvider>
  );
};

const AccountSendEmailConfirmationForm = ({
  account,
  id,
}: {
  account: AdminPatientAccount;
  id: string;
}) => {
  const mutation = useAdminPatientSendEmailConfirmation(id);
  const form = useForm<AccountReasonFormValues>({
    defaultValues: { reason: "" },
    mode: "onSubmit",
    resolver: zodResolver(accountReasonSchema),
  });
  const disabled = !account.capabilities.can_send_email_confirmation || mutation.isPending;

  const onSubmit: SubmitHandler<AccountReasonFormValues> = async (values) => {
    try {
      await mutation.mutateAsync({ reason: values.reason.trim() });
      form.reset();
      toast.success("Confirmacao de e-mail reenviada.");
    } catch (error) {
      toast.error(resolveApiError(error));
    }
  };

  if (!account.capabilities.can_send_email_confirmation) {
    return (
      <AccountUnavailableNotice>
        Reenvio disponivel apenas quando o e-mail esta pendente de confirmacao.
      </AccountUnavailableNotice>
    );
  }

  return (
    <FormProvider {...form}>
      <form className="grid gap-3" noValidate onSubmit={form.handleSubmit(onSubmit)}>
        <TextareaController<AccountReasonFormValues>
          disabled={disabled}
          label="Motivo/observacao interna"
          name="reason"
          placeholder="Informe o motivo do reenvio."
          required
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
            <Send aria-hidden className="h-4 w-4" />
          )}
          Reenviar confirmacao
        </button>
      </form>
    </FormProvider>
  );
};

const AccountPasswordResetForm = ({
  account,
  id,
}: {
  account: AdminPatientAccount;
  id: string;
}) => {
  const mutation = useAdminPatientSendPasswordReset(id);
  const form = useForm<AccountReasonFormValues>({
    defaultValues: { reason: "" },
    mode: "onSubmit",
    resolver: zodResolver(accountReasonSchema),
  });
  const disabled = !account.capabilities.can_send_password_reset || mutation.isPending;

  const onSubmit: SubmitHandler<AccountReasonFormValues> = async (values) => {
    try {
      await mutation.mutateAsync({ reason: values.reason.trim() });
      form.reset();
      toast.success("Link de redefinicao enviado.");
    } catch (error) {
      toast.error(resolveApiError(error));
    }
  };

  if (!account.capabilities.can_send_password_reset) {
    return (
      <AccountUnavailableNotice>
        Esta conta acessa via Google. Redefinicao de senha local indisponivel.
      </AccountUnavailableNotice>
    );
  }

  return (
    <FormProvider {...form}>
      <form className="grid gap-3" noValidate onSubmit={form.handleSubmit(onSubmit)}>
        <TextareaController<AccountReasonFormValues>
          disabled={disabled}
          label="Motivo/observacao interna"
          name="reason"
          placeholder="Explique por que o link sera enviado pelo Admin."
          required
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
            <Send aria-hidden className="h-4 w-4" />
          )}
          Enviar link de redefinicao
        </button>
      </form>
    </FormProvider>
  );
};

const AccountTemporaryPasswordForm = ({
  account,
  id,
}: {
  account: AdminPatientAccount;
  id: string;
}) => {
  const mutation = useAdminPatientSetTemporaryPassword(id);
  const form = useForm<AccountTemporaryPasswordFormValues>({
    defaultValues: {
      confirmation: "",
      password: "",
      password_confirm: "",
      reason: "",
    },
    mode: "onSubmit",
    resolver: zodResolver(accountTemporaryPasswordSchema),
  });
  const disabled = !account.capabilities.can_set_temporary_password || mutation.isPending;

  const onSubmit: SubmitHandler<AccountTemporaryPasswordFormValues> = async (values) => {
    try {
      await mutation.mutateAsync({
        confirmation: values.confirmation.trim().toUpperCase(),
        password: values.password,
        password_confirm: values.password_confirm,
        reason: values.reason.trim(),
      });
      form.reset();
      toast.success("Senha temporaria definida. O paciente devera troca-la no proximo login.");
    } catch (error) {
      toast.error(resolveApiError(error));
    }
  };

  if (!account.capabilities.can_set_temporary_password) {
    return (
      <AccountUnavailableNotice>
        Esta conta acessa via Google. Alteracao de senha local indisponivel.
      </AccountUnavailableNotice>
    );
  }

  return (
    <FormProvider {...form}>
      <form className="grid gap-3" noValidate onSubmit={form.handleSubmit(onSubmit)}>
        <div className="rounded-2xl border border-orange-200 bg-orange-50 p-3 text-sm font-bold leading-6 text-orange-800">
          A senha temporaria nao sera exibida novamente, nao sera gravada em auditoria e exigira
          troca obrigatoria no proximo login do paciente.
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <InputController<AccountTemporaryPasswordFormValues>
            autoComplete="new-password"
            disabled={disabled}
            label="Senha temporaria"
            name="password"
            required
            type="password"
          />
          <InputController<AccountTemporaryPasswordFormValues>
            autoComplete="new-password"
            disabled={disabled}
            label="Confirmar senha temporaria"
            name="password_confirm"
            required
            type="password"
          />
        </div>
        <TextareaController<AccountTemporaryPasswordFormValues>
          disabled={disabled}
          label="Motivo/observacao interna"
          name="reason"
          placeholder="Registre o motivo excepcional para senha temporaria."
          required
          rows={3}
        />
        <InputController<AccountTemporaryPasswordFormValues>
          autoComplete="off"
          disabled={disabled}
          label="Confirmacao forte"
          name="confirmation"
          placeholder="ALTERAR SENHA"
          required
        />
        <button
          className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-control bg-danger px-4 text-sm font-black text-white transition hover:bg-danger/90 disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-muted"
          disabled={disabled}
          type="submit"
        >
          {mutation.isPending ? (
            <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
          ) : (
            <KeyRound aria-hidden className="h-4 w-4" />
          )}
          Definir senha temporaria
        </button>
      </form>
    </FormProvider>
  );
};

const AccountRevokeSessionsForm = ({
  account,
  id,
}: {
  account: AdminPatientAccount;
  id: string;
}) => {
  const mutation = useAdminPatientRevokeSessions(id);
  const form = useForm<AccountRevokeSessionsFormValues>({
    defaultValues: {
      confirmation: "",
      reason: "",
    },
    mode: "onSubmit",
    resolver: zodResolver(accountRevokeSessionsSchema),
  });
  const disabled = !account.capabilities.can_revoke_sessions || mutation.isPending;

  const onSubmit: SubmitHandler<AccountRevokeSessionsFormValues> = async (values) => {
    try {
      await mutation.mutateAsync({
        confirmation: values.confirmation.trim().toUpperCase(),
        reason: values.reason.trim(),
      });
      form.reset();
      toast.success("Sessoes do paciente encerradas.");
    } catch (error) {
      toast.error(resolveApiError(error));
    }
  };

  return (
    <FormProvider {...form}>
      <form className="grid gap-3" noValidate onSubmit={form.handleSubmit(onSubmit)}>
        {!account.capabilities.can_revoke_sessions ? (
          <AccountUnavailableNotice>
            Nenhuma sessao ativa real foi encontrada em user_token.
          </AccountUnavailableNotice>
        ) : null}
        <TextareaController<AccountRevokeSessionsFormValues>
          disabled={disabled}
          label="Motivo/observacao interna"
          name="reason"
          placeholder="Explique por que as sessoes serao encerradas."
          required
          rows={3}
        />
        <InputController<AccountRevokeSessionsFormValues>
          autoComplete="off"
          disabled={disabled}
          label="Confirmacao forte"
          name="confirmation"
          placeholder="ENCERRAR SESSOES"
          required
        />
        <button
          className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-control border border-danger bg-surface px-4 text-sm font-black text-danger transition hover:bg-red-50 disabled:cursor-not-allowed disabled:border-border disabled:text-muted"
          disabled={disabled}
          type="submit"
        >
          {mutation.isPending ? (
            <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
          ) : (
            <LogOut aria-hidden className="h-4 w-4" />
          )}
          Encerrar sessoes
        </button>
      </form>
    </FormProvider>
  );
};

type AccountStatusActionKind = "deactivate" | "delete" | "suspend";

const ACCOUNT_STATUS_ACTION_CONFIG: Record<
  AccountStatusActionKind,
  {
    blockedMessage: string;
    buttonClassName: string;
    buttonLabel: string;
    canRun: (account: AdminPatientAccount) => boolean;
    confirmation: string;
    description: string;
    icon: LucideIcon;
    schema: typeof accountSuspendSchema;
    successMessage: string;
    title: string;
  }
> = {
  deactivate: {
    blockedMessage: "A conta ja esta desativada ou nao pode receber esta acao.",
    buttonClassName:
      "border border-border bg-surface px-4 text-foreground hover:border-primary hover:text-primary",
    buttonLabel: "Desativar conta",
    canRun: (account) => account.capabilities.can_deactivate_account,
    confirmation: "DESATIVAR CONTA",
    description:
      "Acao administrativa reversivel por decisao futura: bloqueia login e encerra sessoes do paciente.",
    icon: X,
    schema: accountDeactivateSchema,
    successMessage: "Conta desativada e sessoes encerradas.",
    title: "Desativar conta",
  },
  delete: {
    blockedMessage: "Exclusao indisponivel para esta conta no estado atual.",
    buttonClassName: "bg-danger px-4 text-white hover:bg-danger/90",
    buttonLabel: "Excluir conta",
    canRun: (account) => account.capabilities.can_delete_account,
    confirmation: "EXCLUIR CONTA",
    description:
      "Acao permanente: aplica soft delete, anonimiza dados da conta, remove o perfil do paciente e encerra sessoes.",
    icon: AlertTriangle,
    schema: accountDeleteSchema,
    successMessage: "Conta excluida. Retornando para a lista de pacientes.",
    title: "Excluir conta",
  },
  suspend: {
    blockedMessage: "A conta ja esta suspensa ou nao pode receber esta acao.",
    buttonClassName: "bg-danger px-4 text-white hover:bg-danger/90",
    buttonLabel: "Suspender conta",
    canRun: (account) => account.capabilities.can_suspend_account,
    confirmation: "SUSPENDER CONTA",
    description:
      "Acao punitiva/operacional temporaria: bloqueia login e encerra sessoes sem apagar dados.",
    icon: Lock,
    schema: accountSuspendSchema,
    successMessage: "Conta suspensa e sessoes encerradas.",
    title: "Suspender conta",
  },
};

const AccountStatusActionForm = ({
  account,
  id,
  kind,
  onDeleted,
}: {
  account: AdminPatientAccount;
  id: string;
  kind: AccountStatusActionKind;
  onDeleted?: () => void;
}) => {
  const config = ACCOUNT_STATUS_ACTION_CONFIG[kind];
  const suspendMutation = useAdminPatientSuspendAccount(id);
  const deactivateMutation = useAdminPatientDeactivateAccount(id);
  const deleteMutation = useAdminPatientDeleteAccount(id);
  const mutation =
    kind === "suspend"
      ? suspendMutation
      : kind === "deactivate"
        ? deactivateMutation
        : deleteMutation;
  const form = useForm<AccountStatusActionFormValues>({
    defaultValues: {
      confirmation: "",
      reason: "",
      suspension_duration_days: "30",
    },
    mode: "onSubmit",
    resolver: zodResolver(config.schema),
  });
  const allowed = config.canRun(account);
  const disabled = !allowed || mutation.isPending;
  const Icon = config.icon;

  const onSubmit: SubmitHandler<AccountStatusActionFormValues> = async (values) => {
    try {
      const payload = {
        confirmation: values.confirmation.trim().toUpperCase(),
        reason: values.reason.trim(),
      };

      if (kind === "suspend") {
        await suspendMutation.mutateAsync({
          ...payload,
          suspension_duration_days: Number(values.suspension_duration_days),
        });
      } else if (kind === "deactivate") {
        await deactivateMutation.mutateAsync(payload);
      } else {
        await deleteMutation.mutateAsync(payload);
      }

      form.reset();
      toast.success(config.successMessage);
      if (kind === "delete") onDeleted?.();
    } catch (error) {
      toast.error(resolveApiError(error));
    }
  };

  return (
    <div className="rounded-3xl border border-border bg-surface p-4">
      <div className="flex items-start gap-3">
        <IconCircle icon={Icon} />
        <div>
          <h3 className="text-base font-black text-foreground">{config.title}</h3>
          <p className="mt-1 text-sm font-bold leading-6 text-muted">{config.description}</p>
        </div>
      </div>

      {!allowed ? (
        <div className="mt-4">
          <AccountUnavailableNotice>
            {kind === "delete" && account.delete_blocked_reason
              ? account.delete_blocked_reason
              : config.blockedMessage}
          </AccountUnavailableNotice>
        </div>
      ) : null}

      <FormProvider {...form}>
        <form className="mt-4 grid gap-3" noValidate onSubmit={form.handleSubmit(onSubmit)}>
          {kind === "suspend" ? (
            <SelectController<AccountStatusActionFormValues>
              disabled={disabled}
              label="Prazo da suspensao"
              name="suspension_duration_days"
              options={SUSPENSION_DURATION_OPTIONS}
              required
            />
          ) : null}
          <TextareaController<AccountStatusActionFormValues>
            disabled={disabled}
            label="Motivo/observacao interna"
            name="reason"
            placeholder="Registre a justificativa administrativa da acao."
            required
            rows={3}
          />
          <InputController<AccountStatusActionFormValues>
            autoComplete="off"
            disabled={disabled}
            label="Confirmacao forte"
            name="confirmation"
            placeholder={config.confirmation}
            required
          />
          <button
            className={cn(
              "inline-flex h-12 w-full items-center justify-center gap-2 rounded-control text-sm font-black transition disabled:cursor-not-allowed disabled:border-border disabled:bg-surface-muted disabled:text-muted",
              config.buttonClassName,
            )}
            disabled={disabled}
            type="submit"
          >
            {mutation.isPending ? (
              <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
            ) : (
              <Icon aria-hidden className="h-4 w-4" />
            )}
            {config.buttonLabel}
          </button>
        </form>
      </FormProvider>
    </div>
  );
};

const AccountTab = ({ id }: { id: string }) => {
  const router = useRouter();
  const query = useAdminPatientAccount(id);
  const errorMessage = query.error ? resolveApiError(query.error) : null;

  if (query.isLoading) return <AccountLoadingState />;
  if (query.isError && errorMessage) {
    return <ErrorState message={errorMessage} onRetry={() => void query.refetch()} />;
  }
  if (!query.data) return null;

  const account = query.data;
  const googleOnly = account.provider === "google" && !account.has_password;

  return (
    <div className="space-y-5" data-patient-detail-tab="conta">
      {googleOnly ? (
        <CardShell className="p-4">
          <div className="flex gap-3">
            <IconCircle icon={Lock} />
            <div>
              <h2 className="text-lg font-black text-foreground">Conta Google sem senha local</h2>
              <p className="mt-1 text-sm font-bold leading-6 text-muted">
                Esta conta acessa via Google. Alteracao ou criacao de senha local estao
                indisponiveis.
              </p>
            </div>
          </div>
        </CardShell>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <AccountSummaryCard account={account} />

        <InfoCard contentAsDescriptionList={false} icon={Mail} title="E-mail da conta">
          <div className="grid gap-5">
            <div className="rounded-2xl border border-border bg-surface-muted p-4 text-sm font-bold leading-6 text-muted">
              Alterar e-mail exige nova confirmacao, envia e-mail transacional real quando
              configurado e encerra sessoes do paciente.
            </div>
            {!account.capabilities.can_change_email ? (
              <AccountUnavailableNotice>
                Alteracao administrativa de e-mail bloqueada para identidade sem senha local.
              </AccountUnavailableNotice>
            ) : null}
            <AccountChangeEmailForm account={account} id={id} />
            <AccountSendEmailConfirmationForm account={account} id={id} />
          </div>
        </InfoCard>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <InfoCard contentAsDescriptionList={false} icon={KeyRound} title="Senha e recuperacao">
          <div className="grid gap-5">
            <div>
              <h3 className="mb-2 text-sm font-black text-foreground">
                Acao preferencial: link de redefinicao
              </h3>
              <AccountPasswordResetForm account={account} id={id} />
            </div>
            <div>
              <h3 className="mb-2 text-sm font-black text-foreground">
                Suporte excepcional: senha temporaria
              </h3>
              <AccountTemporaryPasswordForm account={account} id={id} />
            </div>
          </div>
        </InfoCard>

        <InfoCard contentAsDescriptionList={false} icon={ShieldCheck} title="Sessoes e seguranca">
          <div className="grid gap-4">
            <dl>
              <FieldRow
                label="Sessoes ativas"
                value={numberFormatter.format(account.sessions.active_count)}
              />
              <FieldRow
                label="Dispositivos"
                value={numberFormatter.format(account.sessions.devices_count)}
              />
              <FieldRow
                label="Ultima sessao"
                value={formatDateTime(account.sessions.last_access_at)}
              />
            </dl>
            <AccountRevokeSessionsForm account={account} id={id} />
          </div>
        </InfoCard>
      </div>

      <InfoCard contentAsDescriptionList={false} icon={AlertTriangle} title="Acoes da conta">
        <div className="grid gap-5">
          <dl>
            <FieldRow
              label="Status atual"
              value={
                <Badge className={ACCOUNT_STATUS_BADGE_CLASS[account.account_status]}>
                  {account.account_status_label}
                </Badge>
              }
            />
            <FieldRow
              label="Ultima alteracao de status"
              value={formatDateTime(account.account_status_changed_at)}
            />
            {account.account_status === "suspended" ? (
              <FieldRow
                label="Suspensa ate"
                value={formatDateTime(account.account_status_expires_at)}
              />
            ) : null}
            <FieldRow
              label="Bloqueio para exclusao"
              value={account.delete_blocked_reason || "Nenhum bloqueio operacional identificado"}
            />
          </dl>
          <div className="grid gap-4 lg:grid-cols-3">
            <AccountStatusActionForm account={account} id={id} kind="suspend" />
            <AccountStatusActionForm account={account} id={id} kind="deactivate" />
            <AccountStatusActionForm
              account={account}
              id={id}
              kind="delete"
              onDeleted={() => router.push("/pacientes/lista")}
            />
          </div>
        </div>
      </InfoCard>
    </div>
  );
};

const DetailContent = ({
  detail,
  id,
  tab,
}: {
  detail: AdminPatientDetail;
  id: string;
  tab: PatientDetailTab;
}) => (
  <div className="space-y-6">
    <Header detail={detail} id={id} tab={tab} />
    {tab === "perfil" ? (
      <ProfileRegistrationTab detail={detail} />
    ) : tab === "estatisticas" ? (
      <StatisticsTab detail={detail} />
    ) : tab === "publicacoes" ? (
      <PublicationsTab detail={detail} />
    ) : tab === "denuncias" ? (
      <ReportsTab />
    ) : tab === "atividades" ? (
      <ActivityList detail={detail} />
    ) : tab === "conta" ? (
      <AccountTab id={id} />
    ) : (
      <GeneralTab detail={detail} id={id} />
    )}
  </div>
);
export const AdminPatientDetailClient = ({ id }: { id: string }) => {
  const searchParams = useSearchParams();
  const requestedTab = searchParams.get("tab");
  const tab: PatientDetailTab = isPatientDetailTab(requestedTab) ? requestedTab : "geral";
  const query = useAdminPatientDetail(id, { period: "month" });
  const queryError = query.error ? resolveApiError(query.error) : null;

  return (
    <div className="space-y-6">
      {query.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {LOADING_PLACEHOLDERS.map((placeholder) => (
            <CardShell className="h-[8.75rem] animate-pulse bg-surface-muted" key={placeholder} />
          ))}
        </div>
      ) : null}
      {query.isFetching && !query.isLoading ? (
        <p className="inline-flex items-center gap-2 text-sm font-bold text-muted">
          <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
          Atualizando dados reais...
        </p>
      ) : null}
      {query.isError && queryError ? (
        <ErrorState message={queryError} onRetry={() => void query.refetch()} />
      ) : null}
      {query.data ? <DetailContent detail={query.data} id={id} tab={tab} /> : null}
    </div>
  );
};
