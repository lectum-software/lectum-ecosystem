import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Bookmark,
  Eye,
  FileText,
  type LucideIcon,
  MessageCircle,
  Reply,
  UserRound,
  Users,
  UsersRound,
} from "lucide-react";
import type {
  CommunitiesDashboardQuery,
  CommunitiesDashboardStatisticsDailyPoint,
} from "@/api/req/communities";

export const MAX_COMMUNITY_DASHBOARD_DAYS = 3660;

export type CommunityDashboardPeriodValue = NonNullable<CommunitiesDashboardQuery["period"]>;

export type CommunityDashboardPeriodPreset = Exclude<CommunityDashboardPeriodValue, "custom">;

export const COMMUNITY_DASHBOARD_PERIOD_OPTIONS = [
  { id: "today", label: "Hoje" },
  { id: "week", label: "Esta semana" },
  { id: "month", label: "Este mês" },
  { id: "year", label: "Este ano" },
  { id: "7d", label: "Últimos 7 dias" },
  { id: "30d", label: "Últimos 30 dias" },
  { id: "90d", label: "Últimos 90 dias" },
  { id: "all", label: "Todo o período" },
] as const satisfies ReadonlyArray<{
  id: CommunityDashboardPeriodPreset;
  label: string;
}>;

export const numberFormatter = new Intl.NumberFormat("pt-BR");

export const percentageFormatter = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 1,
  minimumFractionDigits: 0,
});

export type DashboardStatisticDailyKey = Exclude<
  keyof CommunitiesDashboardStatisticsDailyPoint,
  "date"
>;

export type DashboardStatisticMetricId =
  | "active_patients"
  | "active_psychologists"
  | "downvotes"
  | "followers_patients"
  | "followers_psychologists"
  | "new_active_patients"
  | "new_active_psychologists"
  | "patient_comments"
  | "patient_posts"
  | "profile_accesses"
  | "psychologist_posts"
  | "reports"
  | "saves"
  | "unverified_psychologist_replies"
  | "upvotes"
  | "verified_psychologist_replies"
  | "whatsapp_clicks";

export type DashboardStatisticMetricConfig = {
  color: string;
  description: string;
  icon: LucideIcon;
  id: DashboardStatisticMetricId;
  key: DashboardStatisticDailyKey;
  label: string;
  tone: keyof typeof dashboardStatisticToneClasses;
};

export type DashboardStatisticMetricItem = DashboardStatisticMetricConfig & {
  changePercent: number | null;
  details?: Array<{ label: string; percentage: number; value: number }>;
  previousValue: number;
  value: number;
};

export const dashboardStatisticToneClasses = {
  blue: "bg-info-soft text-info",
  gray: "bg-surface-muted text-muted",
  green: "bg-success-soft text-success",
  orange: "bg-warning-soft text-warning",
  pink: "bg-danger-soft text-danger",
  purple: "bg-primary-soft text-primary",
  yellow: "bg-warning-soft text-warning",
};

export const DASHBOARD_STATISTIC_METRIC_AGGREGATIONS: Partial<
  Record<DashboardStatisticDailyKey, "last" | "sum">
> = {
  followers_patients: "last",
  followers_psychologists: "last",
};

export const DASHBOARD_PEOPLE_STATISTICS_METRICS: DashboardStatisticMetricConfig[] = [
  {
    color: "var(--admin-primary)",
    description: "Psicólogos únicos seguindo ao menos uma comunidade.",
    icon: UserRound,
    id: "followers_psychologists",
    key: "followers_psychologists",
    label: "Psicólogos seguidores",
    tone: "blue",
  },
  {
    color: "var(--admin-success)",
    description: "Pacientes únicos seguindo ao menos uma comunidade.",
    icon: UsersRound,
    id: "followers_patients",
    key: "followers_patients",
    label: "Pacientes seguidores",
    tone: "green",
  },
  {
    color: "var(--admin-warning)",
    description: "Psicólogos únicos com atividade real no período.",
    icon: UserRound,
    id: "active_psychologists",
    key: "active_psychologists",
    label: "Psicólogos ativos",
    tone: "yellow",
  },
  {
    color: "var(--admin-danger)",
    description: "Pacientes únicos com atividade real no período.",
    icon: UsersRound,
    id: "active_patients",
    key: "active_patients",
    label: "Pacientes ativos",
    tone: "pink",
  },
  {
    color: "var(--admin-muted)",
    description: "Pacientes cuja primeira atividade ocorreu no período.",
    icon: Users,
    id: "new_active_patients",
    key: "new_active_patients",
    label: "Novos pacientes ativos",
    tone: "gray",
  },
  {
    color: "var(--admin-subtle)",
    description: "Psicólogos cuja primeira atividade ocorreu no período.",
    icon: UserRound,
    id: "new_active_psychologists",
    key: "new_active_psychologists",
    label: "Novos psicólogos ativos",
    tone: "gray",
  },
];

export const DASHBOARD_CONTENT_STATISTICS_METRICS: DashboardStatisticMetricConfig[] = [
  {
    color: "var(--admin-success)",
    description: "Posts publicados por pacientes em todas as comunidades.",
    icon: FileText,
    id: "patient_posts",
    key: "patient_posts",
    label: "Postagens de pacientes",
    tone: "green",
  },
  {
    color: "var(--admin-primary)",
    description: "Posts publicados por psicólogos em todas as comunidades.",
    icon: FileText,
    id: "psychologist_posts",
    key: "psychologist_posts",
    label: "Postagens de psicólogos",
    tone: "blue",
  },
  {
    color: "var(--admin-warning)",
    description: "Respostas de psicólogos verificados em posts.",
    icon: Reply,
    id: "verified_psychologist_replies",
    key: "verified_psychologist_replies",
    label: "Respostas de psicólogos verificados",
    tone: "yellow",
  },
  {
    color: "var(--admin-danger)",
    description: "Respostas de psicólogos ainda não verificados.",
    icon: Reply,
    id: "unverified_psychologist_replies",
    key: "unverified_psychologist_replies",
    label: "Respostas de psicólogos não verificados",
    tone: "pink",
  },
  {
    color: "var(--admin-muted)",
    description: "Comentários criados por pacientes no período.",
    icon: MessageCircle,
    id: "patient_comments",
    key: "patient_comments",
    label: "Comentários de pacientes",
    tone: "gray",
  },
  {
    color: "var(--admin-subtle)",
    description: "Denúncias registradas contra posts ou comentários.",
    icon: AlertTriangle,
    id: "reports",
    key: "reports",
    label: "Denúncias",
    tone: "gray",
  },
  {
    color: "var(--admin-primary)",
    description: "Upvotes em posts e respostas.",
    icon: ArrowUp,
    id: "upvotes",
    key: "upvotes",
    label: "Upvotes",
    tone: "blue",
  },
  {
    color: "var(--admin-warning)",
    description: "Downvotes em posts e respostas.",
    icon: ArrowDown,
    id: "downvotes",
    key: "downvotes",
    label: "Downvotes",
    tone: "orange",
  },
  {
    color: "var(--admin-chart-accent)",
    description: "Salvamentos de posts e respostas.",
    icon: Bookmark,
    id: "saves",
    key: "saves",
    label: "Salvamentos",
    tone: "purple",
  },
  {
    color: "var(--admin-success)",
    description: "Cliques de WhatsApp originados em conteúdos das comunidades.",
    icon: MessageCircle,
    id: "whatsapp_clicks",
    key: "whatsapp_clicks",
    label: "Cliques WhatsApp",
    tone: "green",
  },
  {
    color: "var(--admin-subtle)",
    description: "Acessos a perfis de psicólogos relacionados às comunidades.",
    icon: Eye,
    id: "profile_accesses",
    key: "profile_accesses",
    label: "Acessos a perfis",
    tone: "gray",
  },
];
