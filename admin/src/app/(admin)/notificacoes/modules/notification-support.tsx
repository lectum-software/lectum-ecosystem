"use client";

import { type SVGProps, useEffect } from "react";
import { z } from "zod";
import {
  ADMIN_NOTIFICATION_AUDIENCES,
  type AdminNotificationAudience,
  type AdminNotificationAutomaticLog,
  type AdminNotificationCampaignStatus,
  type AdminNotificationChannel,
  type AdminNotificationsRangeQuery,
  type NotificationDeliveryStatus,
} from "@/api/req/notifications";
import { cn } from "@/lib/utils";

export type NotificationPeriodValue = NonNullable<AdminNotificationsRangeQuery["period"]>;

export type NotificationPeriodPreset = Exclude<NotificationPeriodValue, "custom">;

export const NOTIFICATION_PERIOD_OPTIONS = [
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

export type NotificationRange = { from: string; to: string };

export type NotificationTableFilters = {
  audience: "all" | AdminNotificationAudience;
  channel: "all" | AdminNotificationChannel;
  q: string;
};

export const CAMPAIGN_LIMIT = 8;

export const LOGS_LIMIT = 8;

export const MAX_NOTIFICATION_PERIOD_DAYS = 3660;

export const NOTIFICATION_DEFAULT_PERIOD: NotificationPeriodPreset = "all";

export const tableRangeErrorMessage =
  "Informe um período de até 3660 dias, com data inicial menor ou igual à final.";

export const cardClass =
  "rounded-card border border-border/80 bg-surface/95 shadow-admin-soft backdrop-blur";

export const useDocumentScrollLock = (locked: boolean) => {
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

export const AUDIENCE_OPTIONS: Array<{ label: string; value: AdminNotificationAudience }> = [
  { label: "Todos os usuários", value: "all_users" },
  { label: "Pacientes", value: "patients" },
  { label: "Psicólogos", value: "psychologists" },
  { label: "Pacientes ativos", value: "active_patients" },
  { label: "Psicólogos ativos", value: "active_psychologists" },
];

export const CAMPAIGN_STATUS_OPTIONS: Array<{
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

export const DELIVERY_STATUS_OPTIONS: Array<{
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

export const STATUS_COPY: Record<
  AdminNotificationCampaignStatus,
  { label: string; className: string }
> = {
  canceled: { className: "bg-danger/10 text-danger", label: "Cancelada" },
  draft: { className: "bg-surface-muted text-muted", label: "Rascunho" },
  failed: { className: "bg-danger/10 text-danger", label: "Falhou" },
  scheduled: { className: "bg-primary-soft text-primary", label: "Agendada" },
  sending: { className: "bg-warning/10 text-warning", label: "Enviando" },
  sent: { className: "bg-success/10 text-success", label: "Enviada" },
};

export const DELIVERY_STATUS_COPY: Record<
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

export const numberFormatter = new Intl.NumberFormat("pt-BR");

export const percentFormatter = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });

export const dateTimeFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
});

export const pad = (value: number) => String(value).padStart(2, "0");

export const toInputDate = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

export const startOfCurrentWeek = () => {
  const today = new Date();
  const day = today.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const start = new Date(today);
  start.setDate(today.getDate() + mondayOffset);

  return start;
};

export const startOfCurrentMonth = () => {
  const today = new Date();
  return new Date(today.getFullYear(), today.getMonth(), 1);
};

export const startOfCurrentYear = () => {
  const today = new Date();
  return new Date(today.getFullYear(), 0, 1);
};

export const startOfLastDays = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() - (days - 1));

  return date;
};

export const getRangeForPeriod = (period: NotificationPeriodPreset): NotificationRange => {
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

export const buildNotificationPeriodQuery = (
  period: NotificationPeriodValue,
  range: NotificationRange,
): AdminNotificationsRangeQuery =>
  period === "custom" ? { from: range.from, period, to: range.to } : { period };

export const createDefaultTableFilters = (): NotificationTableFilters => ({
  audience: "all",
  channel: "all",
  q: "",
});

export const dateFromInput = (value: string) => {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day, 12, 0, 0, 0);
};

export const daysBetweenInclusive = (from: Date, to: Date) =>
  Math.floor((to.getTime() - from.getTime()) / 86_400_000) + 1;

export const isValidRange = (range: { from?: string; to?: string }) => {
  if (!range.from || !range.to) return false;

  const from = dateFromInput(range.from);
  const to = dateFromInput(range.to);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to) return false;

  return daysBetweenInclusive(from, to) <= MAX_NOTIFICATION_PERIOD_DAYS;
};

export const toInputDateTime = (value?: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

export const formatDateTime = (value?: string | null) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : dateTimeFormatter.format(date);
};

export const formatPercent = (value: number) => `${percentFormatter.format(value)}%`;

export const audienceLabel = (value: AdminNotificationAudience) =>
  AUDIENCE_OPTIONS.find((item) => item.value === value)?.label ?? value;

export const roleLabel = (value?: null | string) => {
  if (value === "psicologo") return "Psicólogo";
  if (value === "paciente") return "Paciente";

  return "Usuário";
};

export const VerifiedBadgeIcon = ({ className, ...props }: SVGProps<SVGSVGElement>) => (
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

export type NotificationRecipient = AdminNotificationAutomaticLog["user"];

export const recipientName = (user: NotificationRecipient) =>
  user.name?.trim() || user.email || "Usuário";

export const recipientHasVerifiedBadge = (user: NotificationRecipient) =>
  user.role === "psicologo" &&
  (Boolean(user.psychologist_profile?.cfp_verified_at) ||
    user.psychologist_profile?.crp_status === "aprovado");

export const CHANNEL_LABELS: Record<AdminNotificationChannel, string> = {
  email: "E-mail",
  in_app: "In-app",
  push: "Push",
};

export const channelLabel = (value: AdminNotificationChannel) => CHANNEL_LABELS[value] ?? value;

export const channelText = (channels: AdminNotificationChannel[]) =>
  channels.map(channelLabel).join(" + ");

export const internalRedirect = z
  .string()
  .trim()
  .max(512, "Use até 512 caracteres.")
  .optional()
  .refine(
    (value) => !value || (value.startsWith("/") && !value.startsWith("//")),
    "Use uma rota interna iniciada por /.",
  );

export const notificationFormSchema = z
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

export type NotificationFormValues = z.infer<typeof notificationFormSchema>;

export type SubmitIntent = NotificationFormValues["delivery_mode"];
