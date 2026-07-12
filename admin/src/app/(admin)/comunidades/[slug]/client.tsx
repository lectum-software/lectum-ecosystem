"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertTriangle,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  CalendarDays,
  Edit3,
  Eye,
  ImagePlus,
  Loader2,
  MessageCircle,
  Plus,
  RefreshCw,
  Save,
  Star,
  ToggleLeft,
  ToggleRight,
  Trash2,
  Users,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { type ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { FormProvider, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import {
  useAdminCommunityAvatarUpload,
  useAdminCommunityCreateRule,
  useAdminCommunityDeleteRule,
  useAdminCommunityDetail,
  useAdminCommunityUpdate,
  useAdminCommunityUpdateRule,
} from "@/api/callers/communities";
import { resolveApiError } from "@/api/handle";
import type {
  AdminCommunityDetail,
  AdminCommunityIdentity,
  AdminCommunityPerformanceMetric,
  AdminCommunityPopularPost,
  AdminCommunityRule,
  AdminCommunityRuleInput,
  AdminCommunityTopMentor,
  AdminCommunityUpdateInput,
} from "@/api/req/communities";
import { InputController, TextareaController } from "@/components/controllers";
import { aggregateCalendarChartPoints } from "@/lib/chart-time-series";
import { cn } from "@/lib/utils";

const numberFormatter = new Intl.NumberFormat("pt-BR");
const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
});
const dateTimeFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
});
const hexColor = /^#[0-9A-Fa-f]{6}$/;
const colorSchema = z
  .string()
  .trim()
  .refine((value) => value === "" || hexColor.test(value), "Use uma cor no formato #RRGGBB.");

const communityFormSchema = z.object({
  description: z.string().trim().max(500, "Use até 500 caracteres.").optional(),
  name: z.string().trim().min(2, "Informe o nome.").max(120, "Use até 120 caracteres."),
  visual_gradient_color: colorSchema,
  visual_primary_color: colorSchema,
  visual_primary_dark_color: colorSchema,
  visual_soft_color: colorSchema,
  visual_text_color: colorSchema,
});

const ruleFormSchema = z.object({
  description: z.string().trim().min(3, "Informe a descrição.").max(500, "Use até 500 caracteres."),
  title: z.string().trim().min(2, "Informe o título.").max(120, "Use até 120 caracteres."),
});

type CommunityFormValues = z.infer<typeof communityFormSchema>;
type RuleFormValues = z.infer<typeof ruleFormSchema>;

const cardClass = "rounded-card border border-border bg-surface shadow-admin-soft";

const formatDate = (value: string) => dateFormatter.format(new Date(value));
const formatDateTime = (value: string) => dateTimeFormatter.format(new Date(value));
const formatChange = (value: number | null) => {
  if (value === null) return "sem base";
  if (value === 0) return "0%";

  return `${value > 0 ? "+" : ""}${value.toLocaleString("pt-BR", {
    maximumFractionDigits: 1,
  })}%`;
};
const initials = (value: string) =>
  value
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "CO";
const colorValue = (value?: string | null) => value || "";
const nullableText = (value?: string | null) => {
  const normalized = value?.trim();

  return normalized ? normalized : null;
};
const nullableColor = (value?: string | null) => {
  const normalized = value?.trim();

  return normalized ? normalized.toUpperCase() : null;
};

const defaultCommunityValues = (community: AdminCommunityIdentity): CommunityFormValues => ({
  description: community.description ?? "",
  name: community.name,
  visual_gradient_color: colorValue(community.visual_gradient_color),
  visual_primary_color: colorValue(community.visual_primary_color),
  visual_primary_dark_color: colorValue(community.visual_primary_dark_color),
  visual_soft_color: colorValue(community.visual_soft_color),
  visual_text_color: colorValue(community.visual_text_color),
});

const toCommunityPayload = (values: CommunityFormValues): AdminCommunityUpdateInput => ({
  description: nullableText(values.description),
  name: values.name.trim(),
  visual_gradient_color: nullableColor(values.visual_gradient_color),
  visual_primary_color: nullableColor(values.visual_primary_color),
  visual_primary_dark_color: nullableColor(values.visual_primary_dark_color),
  visual_soft_color: nullableColor(values.visual_soft_color),
  visual_text_color: nullableColor(values.visual_text_color),
});

const toRulePayload = (
  values: RuleFormValues,
  rule?: Pick<AdminCommunityRule, "active" | "position">,
): AdminCommunityRuleInput => ({
  active: rule?.active ?? true,
  description: values.description.trim(),
  position: rule?.position ?? 0,
  title: values.title.trim(),
});

const StatusBadge = ({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: "green" | "muted";
}) => (
  <span
    className={cn(
      "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-black",
      tone === "green" ? "bg-emerald-50 text-success" : "bg-surface-muted text-muted",
    )}
  >
    {children}
  </span>
);

const MetricCard = ({
  label,
  metric,
}: {
  label: string;
  metric: AdminCommunityPerformanceMetric;
}) => (
  <div className="rounded-2xl border border-border bg-surface p-4">
    <p className="text-xs font-black text-muted">{label}</p>
    <p className="mt-3 text-2xl font-black text-foreground">
      {numberFormatter.format(metric.value)}
    </p>
    <p
      className={cn(
        "mt-2 text-xs font-black",
        metric.trend === "up" && "text-success",
        metric.trend === "down" && "text-danger",
        metric.trend === "flat" && "text-muted",
        metric.trend === "unavailable" && "text-warning",
      )}
    >
      {formatChange(metric.change_percent)} vs. período anterior
    </p>
  </div>
);

const SummaryCards = ({ detail }: { detail: AdminCommunityDetail }) => (
  <section className={cn(cardClass, "p-5")}>
    <h2 className="text-lg font-black text-foreground">Resumo da comunidade</h2>
    <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {[
        {
          icon: Users,
          label: "Membros",
          value: detail.summary.members_count,
        },
        {
          icon: MessageCircle,
          label: "Posts",
          value: detail.summary.posts_count,
        },
        {
          icon: MessageCircle,
          label: "Comentários",
          value: detail.summary.comments_count,
        },
        {
          icon: Star,
          label: "Posts populares",
          value: detail.summary.popular_posts_count,
        },
      ].map((item) => (
        <div className="rounded-2xl border border-border bg-surface-muted p-4" key={item.label}>
          <div className="grid h-11 w-11 place-items-center rounded-full bg-primary-soft text-primary">
            <item.icon aria-hidden className="h-5 w-5" />
          </div>
          <p className="mt-4 text-3xl font-black text-foreground">
            {numberFormatter.format(item.value)}
          </p>
          <p className="mt-1 text-sm font-bold text-muted">{item.label}</p>
        </div>
      ))}
    </div>
  </section>
);

const PerformanceSection = ({ detail }: { detail: AdminCommunityDetail }) => {
  const points = detail.performance.points;
  const chartPoints = aggregateCalendarChartPoints(points, [
    "comments",
    "members",
    "posts",
    "reports",
  ] as const);
  const width = 760;
  const height = 260;
  const padding = { bottom: 38, left: 48, right: 20, top: 20 };
  const maxValue = Math.max(
    1,
    ...chartPoints.flatMap((point) => [point.posts, point.comments, point.members, point.reports]),
  );
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const getX = (index: number) =>
    chartPoints.length <= 1
      ? width / 2
      : padding.left + (index * chartWidth) / (chartPoints.length - 1);
  const getY = (value: number) => padding.top + chartHeight - (value / maxValue) * chartHeight;
  const series = [
    {
      color: "#3300ff",
      key: "posts",
      label: "Posts",
    },
    {
      color: "#2f8cff",
      key: "comments",
      label: "Comentários",
    },
    {
      color: "#13a85b",
      key: "members",
      label: "Novos membros",
    },
    {
      color: "#e5484d",
      key: "reports",
      label: "Denúncias",
    },
  ] as const;
  const labelStep = Math.max(1, Math.ceil(chartPoints.length / 8));

  return (
    <section className={cn(cardClass, "p-5")}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-black text-foreground">Desempenho</h2>
          <p className="text-xs font-bold text-muted">Últimos {detail.performance.days} dias</p>
        </div>
        <span className="inline-flex items-center gap-2 text-xs font-black text-muted">
          <CalendarDays aria-hidden className="h-4 w-4" />
          período real
        </span>
      </div>
      <div className="mt-5 overflow-x-auto">
        <svg
          aria-label="Gráfico de desempenho da comunidade nos últimos 30 dias"
          className="min-w-[680px]"
          role="img"
          viewBox={`0 0 ${width} ${height}`}
        >
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
            const value = Math.round(maxValue * ratio);
            const y = getY(value);
            return (
              <g key={`grid-${value}`}>
                <line
                  stroke="#e8edf7"
                  strokeWidth="1"
                  x1={padding.left}
                  x2={width - padding.right}
                  y1={y}
                  y2={y}
                />
                <text fill="#55618a" fontSize="11" x="8" y={y + 4}>
                  {numberFormatter.format(value)}
                </text>
              </g>
            );
          })}
          {series.map((item) => {
            const path = chartPoints
              .map(
                (point, index) =>
                  `${index === 0 ? "M" : "L"}${getX(index)},${getY(point[item.key])}`,
              )
              .join(" ");

            return (
              <path
                d={path}
                fill="none"
                key={item.label}
                stroke={item.color}
                strokeLinecap="round"
                strokeWidth="3"
              />
            );
          })}
          {chartPoints
            .filter((_, index) => index % labelStep === 0 || index === chartPoints.length - 1)
            .map((point) => (
              <text
                fill="#06104a"
                fontSize="11"
                key={point.date}
                textAnchor="middle"
                x={getX(chartPoints.findIndex((item) => item.date === point.date))}
                y={height - 10}
              >
                {point.chartLabel}
              </text>
            ))}
        </svg>
      </div>
      <div className="mt-4 flex flex-wrap gap-3">
        {series.map((item) => (
          <span
            className="inline-flex items-center gap-2 text-xs font-bold text-muted"
            key={item.label}
          >
            <span
              aria-hidden
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            {item.label}
          </span>
        ))}
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Novos membros" metric={detail.performance.metrics.new_members} />
        <MetricCard label="Novos posts" metric={detail.performance.metrics.new_posts} />
        <MetricCard label="Comentários" metric={detail.performance.metrics.comments} />
        <MetricCard label="Denúncias" metric={detail.performance.metrics.reports} />
      </div>
    </section>
  );
};

const CommunityHeader = ({
  community,
  editing,
  onEdit,
}: {
  community: AdminCommunityIdentity;
  editing: boolean;
  onEdit: () => void;
}) => (
  <section className={cn(cardClass, "overflow-hidden")}>
    <div className="flex flex-col gap-5 p-5 md:flex-row md:items-start md:justify-between md:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div
          className="relative grid h-24 w-24 shrink-0 place-items-center overflow-hidden rounded-[1.6rem] text-2xl font-black text-white"
          style={{
            background: community.visual_gradient_color
              ? `linear-gradient(135deg, ${community.visual_primary_color || "#3300ff"}, ${
                  community.visual_gradient_color
                })`
              : community.visual_primary_color || "#3300ff",
          }}
        >
          {community.avatar_url ? (
            <Image
              alt={`Avatar da comunidade ${community.name}`}
              className="object-cover"
              fill
              sizes="96px"
              src={community.avatar_url}
              unoptimized
            />
          ) : (
            initials(community.name)
          )}
        </div>
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-3xl font-black tracking-tight text-foreground md:text-4xl">
              {community.name}
            </h1>
            <StatusBadge tone="green">Ativa</StatusBadge>
          </div>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
            {community.description || "Comunidade sem descrição cadastrada."}
          </p>
          <div className="mt-3 flex flex-wrap gap-3 text-xs font-bold text-muted">
            <span>Criada em {formatDate(community.created_at)}</span>
            <span>ID: {community.id}</span>
            <span>Slug: {community.slug}</span>
          </div>
        </div>
      </div>
      <button
        className="inline-flex h-11 items-center justify-center gap-2 rounded-control border border-border bg-surface px-4 text-sm font-black text-foreground transition hover:border-primary hover:text-primary"
        onClick={onEdit}
        type="button"
      >
        <Edit3 aria-hidden className="h-4 w-4" />
        {editing ? "Fechar edição" : "Editar comunidade"}
      </button>
    </div>
  </section>
);

const CommunityEditForm = ({
  community,
  id,
  onDone,
}: {
  community: AdminCommunityIdentity;
  id: string;
  onDone: () => void;
}) => {
  const updateMutation = useAdminCommunityUpdate(id);
  const avatarMutation = useAdminCommunityAvatarUpload(id);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const form = useForm<CommunityFormValues>({
    defaultValues: defaultCommunityValues(community),
    mode: "onSubmit",
    resolver: zodResolver(communityFormSchema),
  });

  useEffect(() => {
    form.reset(defaultCommunityValues(community));
  }, [community, form]);

  const selectedColors = useWatch({ control: form.control });
  const onSubmit = async (values: CommunityFormValues) => {
    try {
      await updateMutation.mutateAsync(toCommunityPayload(values));
      toast.success("Comunidade atualizada.");
      onDone();
    } catch (error) {
      toast.error(resolveApiError(error));
    }
  };
  const onAvatarChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      await avatarMutation.mutateAsync(file);
      toast.success("Avatar atualizado com upload real.");
    } catch (error) {
      toast.error(resolveApiError(error));
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <section className={cn(cardClass, "p-5")}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-black text-foreground">Editar identidade da comunidade</h2>
          <p className="mt-1 text-sm text-muted">
            Nome, descrição, avatar e cores editáveis. Status e permissões avançadas ficam fora da
            V1.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={onAvatarChange}
            ref={fileRef}
            type="file"
          />
          <button
            className="inline-flex h-11 items-center justify-center gap-2 rounded-control border border-border bg-surface px-4 text-sm font-black text-foreground transition hover:border-primary hover:text-primary"
            disabled={avatarMutation.isPending}
            onClick={() => fileRef.current?.click()}
            type="button"
          >
            {avatarMutation.isPending ? (
              <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
            ) : (
              <ImagePlus aria-hidden className="h-4 w-4" />
            )}
            Enviar avatar
          </button>
        </div>
      </div>

      <FormProvider {...form}>
        <form className="mt-5 grid gap-4" noValidate onSubmit={form.handleSubmit(onSubmit)}>
          <InputController<CommunityFormValues>
            label="Nome da comunidade"
            name="name"
            placeholder="Nome"
            required
          />
          <TextareaController<CommunityFormValues>
            label="Descrição"
            name="description"
            placeholder="Descreva o objetivo da comunidade"
            rows={4}
          />
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            {(
              [
                ["visual_primary_color", "Cor principal"],
                ["visual_primary_dark_color", "Cor escura"],
                ["visual_soft_color", "Cor suave"],
                ["visual_text_color", "Cor do texto"],
                ["visual_gradient_color", "Cor do gradiente"],
              ] as const
            ).map(([name, label]) => (
              <div className="space-y-2" key={name}>
                <InputController<CommunityFormValues>
                  label={label}
                  name={name}
                  placeholder="#3300FF"
                />
                <span
                  aria-hidden
                  className="block h-3 rounded-full border border-border"
                  style={{
                    backgroundColor: hexColor.test(
                      selectedColors[name as keyof CommunityFormValues] || "",
                    )
                      ? selectedColors[name as keyof CommunityFormValues]
                      : "#f4f6ff",
                  }}
                />
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <button
              className="inline-flex h-11 items-center justify-center rounded-control border border-border bg-surface px-4 text-sm font-black text-foreground"
              onClick={onDone}
              type="button"
            >
              Cancelar
            </button>
            <button
              className="inline-flex h-11 items-center justify-center gap-2 rounded-control bg-primary px-5 text-sm font-black text-white transition hover:bg-primary-hover disabled:opacity-70"
              disabled={updateMutation.isPending}
              type="submit"
            >
              {updateMutation.isPending ? (
                <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
              ) : (
                <Save aria-hidden className="h-4 w-4" />
              )}
              Salvar alterações
            </button>
          </div>
        </form>
      </FormProvider>
    </section>
  );
};

const CommunityInfoCard = ({ community }: { community: AdminCommunityIdentity }) => (
  <section className={cn(cardClass, "p-5")}>
    <h2 className="text-lg font-black text-foreground">Informações da comunidade</h2>
    <dl className="mt-4 divide-y divide-border text-sm">
      {[
        ["Nome", community.name],
        ["Descrição", community.description || "Sem descrição"],
        ["Categoria", community.category || "Sem categoria"],
        ["Cor principal", community.visual_primary_color || "Não definida"],
        ["Cor suave", community.visual_soft_color || "Não definida"],
        ["Cor do texto", community.visual_text_color || "Não definida"],
        ["Status", "Ativa (somente informativo na V1)"],
      ].map(([label, value]) => (
        <div className="grid gap-2 py-3 sm:grid-cols-[160px_1fr]" key={label}>
          <dt className="font-black text-muted">{label}</dt>
          <dd className="font-bold text-foreground">{value}</dd>
        </div>
      ))}
    </dl>
  </section>
);

const TopMentorsCard = ({ mentors }: { mentors: AdminCommunityTopMentor[] }) => (
  <section className={cn(cardClass, "p-5")}>
    <h2 className="text-lg font-black text-foreground">Top mentores da comunidade</h2>
    {mentors.length === 0 ? (
      <p className="mt-4 rounded-2xl bg-surface-muted p-4 text-sm text-muted">
        Nenhuma resposta de psicólogo elegível foi encontrada nos últimos 30 dias.
      </p>
    ) : (
      <div className="mt-4 space-y-3">
        {mentors.map((mentor) => (
          <div
            className="grid gap-3 rounded-2xl border border-border p-3 sm:grid-cols-[1fr_auto]"
            key={mentor.id}
          >
            <div className="flex items-center gap-3">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary-soft text-xs font-black text-primary">
                #{mentor.position}
              </span>
              <div className="relative grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-surface-muted text-xs font-black text-primary">
                {mentor.avatar ? (
                  <Image
                    alt={`Avatar de ${mentor.name}`}
                    className="object-cover"
                    fill
                    sizes="40px"
                    src={mentor.avatar}
                    unoptimized
                  />
                ) : (
                  initials(mentor.name)
                )}
              </div>
              <div>
                <p className="font-black text-foreground">{mentor.name}</p>
                <p className="text-xs text-muted">{mentor.crp || "CRP não informado"}</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 text-right text-xs">
              <span>
                <strong className="block text-base text-foreground">
                  {numberFormatter.format(mentor.replies_count)}
                </strong>
                Respostas
              </span>
              <span>
                <strong className="block text-base text-foreground">
                  {numberFormatter.format(mentor.upvotes_count)}
                </strong>
                Upvotes
              </span>
              <span>
                <strong className="block text-base text-foreground">
                  {mentor.rating_avg.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}
                </strong>
                Avaliação
              </span>
            </div>
          </div>
        ))}
      </div>
    )}
  </section>
);

const PopularPostsCard = ({ posts }: { posts: AdminCommunityPopularPost[] }) => (
  <section className={cn(cardClass, "p-5")}>
    <h2 className="text-lg font-black text-foreground">Posts mais populares</h2>
    {posts.length === 0 ? (
      <p className="mt-4 rounded-2xl bg-surface-muted p-4 text-sm text-muted">
        Nenhum post publicado real foi encontrado nesta comunidade.
      </p>
    ) : (
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[760px] border-separate border-spacing-0 text-left text-sm">
          <thead className="text-xs text-muted">
            <tr>
              <th className="border-b border-border py-3 pr-4 font-black">Post</th>
              <th className="border-b border-border px-4 py-3 font-black">Autor</th>
              <th className="border-b border-border px-4 py-3 font-black">Upvotes</th>
              <th className="border-b border-border px-4 py-3 font-black">Comentários</th>
              <th className="border-b border-border px-4 py-3 font-black">Data</th>
            </tr>
          </thead>
          <tbody>
            {posts.map((post) => (
              <tr key={post.id}>
                <td className="border-b border-border py-4 pr-4 font-black text-foreground">
                  {post.title}
                </td>
                <td className="border-b border-border px-4 py-4">
                  <p className="font-bold text-foreground">{post.author_name}</p>
                  <p className="text-xs capitalize text-muted">{post.author_role}</p>
                </td>
                <td className="border-b border-border px-4 py-4 font-black">
                  {numberFormatter.format(post.upvotes_count)}
                </td>
                <td className="border-b border-border px-4 py-4 font-black">
                  {numberFormatter.format(post.comments_count)}
                </td>
                <td className="border-b border-border px-4 py-4">
                  {formatDateTime(post.created_at)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </section>
);

const RuleEditForm = ({
  disabled,
  onCancel,
  onSubmit,
  rule,
}: {
  disabled: boolean;
  onCancel: () => void;
  onSubmit: (values: RuleFormValues) => Promise<void>;
  rule: AdminCommunityRule;
}) => {
  const form = useForm<RuleFormValues>({
    defaultValues: {
      description: rule.description,
      title: rule.title,
    },
    resolver: zodResolver(ruleFormSchema),
  });

  return (
    <FormProvider {...form}>
      <form
        className="grid gap-3 rounded-2xl border border-border bg-surface-muted p-3"
        noValidate
        onSubmit={form.handleSubmit((values) => void onSubmit(values))}
      >
        <InputController<RuleFormValues> label="Título" name="title" required />
        <TextareaController<RuleFormValues>
          label="Descrição"
          name="description"
          required
          rows={3}
        />
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button
            className="h-10 rounded-control border border-border bg-surface px-4 text-sm font-black"
            onClick={onCancel}
            type="button"
          >
            Cancelar
          </button>
          <button
            className="h-10 rounded-control bg-primary px-4 text-sm font-black text-white disabled:opacity-70"
            disabled={disabled}
            type="submit"
          >
            Salvar regra
          </button>
        </div>
      </form>
    </FormProvider>
  );
};

const RuleCreateForm = ({
  disabled,
  nextPosition,
  onSubmit,
}: {
  disabled: boolean;
  nextPosition: number;
  onSubmit: (input: AdminCommunityRuleInput) => Promise<void>;
}) => {
  const form = useForm<RuleFormValues>({
    defaultValues: {
      description: "",
      title: "",
    },
    resolver: zodResolver(ruleFormSchema),
  });

  return (
    <FormProvider {...form}>
      <form
        className="mt-4 grid gap-3 rounded-2xl border border-dashed border-border p-3"
        noValidate
        onSubmit={form.handleSubmit(async (values) => {
          await onSubmit({ ...toRulePayload(values), position: nextPosition });
          form.reset();
        })}
      >
        <div className="grid gap-3 md:grid-cols-[1fr_2fr_auto] md:items-start">
          <InputController<RuleFormValues>
            label="Nova regra"
            name="title"
            placeholder="Título"
            required
          />
          <TextareaController<RuleFormValues>
            label="Descrição"
            name="description"
            placeholder="Texto exibido dentro da comunidade"
            required
            rows={2}
          />
          <button
            className="mt-7 inline-flex h-12 items-center justify-center gap-2 rounded-control bg-primary px-4 text-sm font-black text-white disabled:opacity-70"
            disabled={disabled}
            type="submit"
          >
            <Plus aria-hidden className="h-4 w-4" />
            Adicionar
          </button>
        </div>
      </form>
    </FormProvider>
  );
};

const RulesManager = ({ id, rules }: { id: string; rules: AdminCommunityRule[] }) => {
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const createMutation = useAdminCommunityCreateRule(id);
  const updateMutation = useAdminCommunityUpdateRule(id);
  const deleteMutation = useAdminCommunityDeleteRule(id);
  const sortedRules = useMemo(
    () =>
      [...rules].sort(
        (left, right) =>
          left.position - right.position || left.title.localeCompare(right.title, "pt-BR"),
      ),
    [rules],
  );
  const nextPosition =
    sortedRules.length > 0 ? Math.max(...sortedRules.map((rule) => rule.position)) + 1 : 0;

  const updateRule = async (rule: AdminCommunityRule, input: AdminCommunityRuleInput) => {
    try {
      await updateMutation.mutateAsync({ input, ruleId: rule.id });
      toast.success("Regra atualizada.");
      setEditingRuleId(null);
    } catch (error) {
      toast.error(resolveApiError(error));
    }
  };
  const createRule = async (input: AdminCommunityRuleInput) => {
    try {
      await createMutation.mutateAsync(input);
      toast.success("Regra adicionada.");
    } catch (error) {
      toast.error(resolveApiError(error));
    }
  };
  const deleteRule = async (rule: AdminCommunityRule) => {
    if (!window.confirm(`Remover a regra "${rule.title}"?`)) return;

    try {
      await deleteMutation.mutateAsync(rule.id);
      toast.success("Regra removida.");
    } catch (error) {
      toast.error(resolveApiError(error));
    }
  };
  const moveRule = async (rule: AdminCommunityRule, direction: -1 | 1) => {
    const index = sortedRules.findIndex((item) => item.id === rule.id);
    const target = sortedRules[index + direction];
    if (!target) return;

    try {
      await Promise.all([
        updateMutation.mutateAsync({
          input: toRulePayload(
            { description: rule.description, title: rule.title },
            {
              active: rule.active,
              position: target.position,
            },
          ),
          ruleId: rule.id,
        }),
        updateMutation.mutateAsync({
          input: toRulePayload(
            { description: target.description, title: target.title },
            {
              active: target.active,
              position: rule.position,
            },
          ),
          ruleId: target.id,
        }),
      ]);
      toast.success("Ordem das regras atualizada.");
    } catch (error) {
      toast.error(resolveApiError(error));
    }
  };
  const toggleRule = async (rule: AdminCommunityRule) => {
    await updateRule(
      rule,
      toRulePayload(
        { description: rule.description, title: rule.title },
        {
          active: !rule.active,
          position: rule.position,
        },
      ),
    );
  };

  return (
    <section className={cn(cardClass, "p-5")}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-black text-foreground">Regras da comunidade</h2>
          <p className="mt-1 text-sm text-muted">
            Textos exibidos dentro da comunidade. Alterações são persistidas no backend.
          </p>
        </div>
        <StatusBadge tone="muted">{numberFormatter.format(sortedRules.length)} regras</StatusBadge>
      </div>

      <div className="mt-5 space-y-3">
        {sortedRules.length === 0 ? (
          <p className="rounded-2xl bg-surface-muted p-4 text-sm text-muted">
            Nenhuma regra cadastrada para esta comunidade.
          </p>
        ) : (
          sortedRules.map((rule, index) => (
            <article
              className={cn(
                "rounded-2xl border p-4",
                rule.active
                  ? "border-border bg-surface"
                  : "border-border bg-surface-muted opacity-75",
              )}
              key={rule.id}
            >
              {editingRuleId === rule.id ? (
                <RuleEditForm
                  disabled={updateMutation.isPending}
                  onCancel={() => setEditingRuleId(null)}
                  onSubmit={(values) => updateRule(rule, toRulePayload(values, rule))}
                  rule={rule}
                />
              ) : (
                <div className="grid gap-4 xl:grid-cols-[1fr_auto]">
                  <div className="flex gap-3">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary-soft text-xs font-black text-primary">
                      {index + 1}
                    </span>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-black text-foreground">{rule.title}</h3>
                        <StatusBadge tone={rule.active ? "green" : "muted"}>
                          {rule.active ? "Ativa" : "Inativa"}
                        </StatusBadge>
                      </div>
                      <p className="mt-1 text-sm leading-6 text-muted">{rule.description}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 xl:justify-end">
                    <button
                      aria-label={`Subir regra ${rule.title}`}
                      className="grid h-10 w-10 place-items-center rounded-xl border border-border text-muted transition hover:border-primary hover:text-primary disabled:opacity-40"
                      disabled={index === 0 || updateMutation.isPending}
                      onClick={() => void moveRule(rule, -1)}
                      type="button"
                    >
                      <ArrowUp aria-hidden className="h-4 w-4" />
                    </button>
                    <button
                      aria-label={`Descer regra ${rule.title}`}
                      className="grid h-10 w-10 place-items-center rounded-xl border border-border text-muted transition hover:border-primary hover:text-primary disabled:opacity-40"
                      disabled={index === sortedRules.length - 1 || updateMutation.isPending}
                      onClick={() => void moveRule(rule, 1)}
                      type="button"
                    >
                      <ArrowDown aria-hidden className="h-4 w-4" />
                    </button>
                    <button
                      className="inline-flex h-10 items-center gap-2 rounded-xl border border-border px-3 text-xs font-black text-muted transition hover:border-primary hover:text-primary"
                      disabled={updateMutation.isPending}
                      onClick={() => void toggleRule(rule)}
                      type="button"
                    >
                      {rule.active ? (
                        <ToggleRight aria-hidden className="h-4 w-4" />
                      ) : (
                        <ToggleLeft aria-hidden className="h-4 w-4" />
                      )}
                      {rule.active ? "Desativar" : "Ativar"}
                    </button>
                    <button
                      className="inline-flex h-10 items-center gap-2 rounded-xl border border-border px-3 text-xs font-black text-muted transition hover:border-primary hover:text-primary"
                      onClick={() => setEditingRuleId(rule.id)}
                      type="button"
                    >
                      <Edit3 aria-hidden className="h-4 w-4" />
                      Editar
                    </button>
                    <button
                      className="inline-flex h-10 items-center gap-2 rounded-xl border border-red-100 px-3 text-xs font-black text-danger transition hover:bg-red-50"
                      disabled={deleteMutation.isPending}
                      onClick={() => void deleteRule(rule)}
                      type="button"
                    >
                      <Trash2 aria-hidden className="h-4 w-4" />
                      Remover
                    </button>
                  </div>
                </div>
              )}
            </article>
          ))
        )}
      </div>

      <RuleCreateForm
        disabled={createMutation.isPending}
        nextPosition={nextPosition}
        onSubmit={createRule}
      />
    </section>
  );
};

const LoadingState = () => (
  <div className="space-y-5">
    <div className={cn(cardClass, "h-48 animate-pulse bg-surface-muted")} />
    <div className="grid gap-5 xl:grid-cols-2">
      <div className={cn(cardClass, "h-72 animate-pulse bg-surface-muted")} />
      <div className={cn(cardClass, "h-72 animate-pulse bg-surface-muted")} />
    </div>
  </div>
);

const ErrorState = ({ message, onRetry }: { message: string; onRetry: () => void }) => (
  <section className={cn(cardClass, "p-6")}>
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex gap-3">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-red-50 text-danger">
          <AlertTriangle aria-hidden className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-black text-foreground">
            Não foi possível carregar a comunidade
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
  </section>
);

const DetailContent = ({ detail, slug }: { detail: AdminCommunityDetail; slug: string }) => {
  const [editing, setEditing] = useState(false);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm font-bold text-muted">
        <Link className="inline-flex items-center gap-2 text-primary" href="/comunidades">
          <ArrowLeft aria-hidden className="h-4 w-4" />
          Voltar para comunidades
        </Link>
        <Link
          className="inline-flex items-center gap-2 rounded-control border border-border bg-surface px-3 py-2 text-xs font-black text-muted transition hover:border-primary hover:text-primary"
          href={`/community/${detail.community.slug}`}
          target="_blank"
        >
          <Eye aria-hidden className="h-4 w-4" />
          Ver no site
        </Link>
      </div>

      <CommunityHeader
        community={detail.community}
        editing={editing}
        onEdit={() => setEditing((value) => !value)}
      />

      {editing ? (
        <CommunityEditForm
          community={detail.community}
          id={slug}
          onDone={() => setEditing(false)}
        />
      ) : null}

      <div className="grid gap-5 2xl:grid-cols-[1.15fr_1fr]">
        <SummaryCards detail={detail} />
        <PerformanceSection detail={detail} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_0.8fr]">
        <CommunityInfoCard community={detail.community} />
        <TopMentorsCard mentors={detail.top_mentors} />
      </div>

      <div className="grid gap-5 2xl:grid-cols-[1.1fr_0.9fr]">
        <PopularPostsCard posts={detail.popular_posts} />
        <RulesManager id={slug} rules={detail.rules} />
      </div>
    </div>
  );
};

export const AdminCommunityDetailClient = ({ slug }: { slug: string }) => {
  const query = useAdminCommunityDetail(slug);
  const errorMessage = query.error ? resolveApiError(query.error) : null;

  return (
    <main className="space-y-5">
      {query.isLoading ? <LoadingState /> : null}
      {query.isError && errorMessage ? (
        <ErrorState message={errorMessage} onRetry={() => void query.refetch()} />
      ) : null}
      {query.data ? <DetailContent detail={query.data} slug={slug} /> : null}
    </main>
  );
};
