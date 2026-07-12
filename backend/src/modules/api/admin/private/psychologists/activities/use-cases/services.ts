import type { Resolve } from "@/helpers/return";
import { error, msg } from "@/helpers/translate";
import type {
  AdminPsychologistActivitiesDTO,
  AdminPsychologistActivitiesFilterOption,
  AdminPsychologistActivityActor,
  AdminPsychologistActivityArea,
  AdminPsychologistActivityItem,
  AdminPsychologistActivityType,
  IAdminPsychologistActivitiesDTO,
} from "../DTOs/IAdminPsychologistActivitiesDTO";
import {
  type AdminPsychologistActivitiesProfile,
  AdminPsychologistActivitiesRepository,
  type AdminPsychologistActivityAdminLog,
  type AdminPsychologistActivityPost,
  type AdminPsychologistActivityReply,
  type AdminPsychologistActivityReport,
} from "../repositories/AdminPsychologistActivitiesRepository";

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;
const MAX_CUSTOM_PERIOD_DAYS = 365;
const MS_PER_DAY = 86_400_000;

const AREA_LABELS: Record<AdminPsychologistActivityArea, string> = {
  atendimento: "Atendimento",
  avaliacoes: "AvaliaÃ§Ãµes",
  comunidade: "Comunidade",
  conta: "Conta e acesso",
  denuncias: "DenÃºncias",
  financeiro: "Financeiro",
  perfil: "Perfil",
};

const TYPE_LABELS: Record<AdminPsychologistActivityType, string> = {
  account_created: "Conta criada",
  account_email_changed: "E-mail da conta alterado",
  account_email_confirmation_sent: "Confirma\u00e7\u00e3o de e-mail reenviada",
  account_password_reset_sent: "Link de redefini\u00e7\u00e3o enviado",
  account_sessions_revoked: "Sess\u00f5es encerradas",
  account_temporary_password_set: "Senha tempor\u00e1ria definida",
  admin_personal_data_updated: "Dados pessoais atualizados",
  admin_professional_data_updated: "Dados profissionais atualizados",
  post_created: "CriaÃ§Ã£o de post",
  post_saved: "Post salvo",
  profile_created: "Perfil criado",
  profile_updated: "AtualizaÃ§Ã£o de perfil",
  registry_verified: "ValidaÃ§Ã£o de registro",
  reply_created: "Resposta em comunidade",
  reply_saved: "Resposta salva",
  report_received: "DenÃºncia recebida",
  report_content_removed: "Den\u00fancia procedente com conte\u00fado removido",
  report_dismissed: "Den\u00fancia improcedente",
  report_review_started: "Den\u00fancia em an\u00e1lise",
  report_upheld: "Den\u00fancia procedente",
  review_received: "AvaliaÃ§Ã£o recebida",
  review_responded: "Resposta Ã  avaliaÃ§Ã£o",
  subscription_started: "Assinatura registrada",
  whatsapp_click: "Clique no WhatsApp",
  whatsapp_verified: "WhatsApp verificado",
};

const pad = (value: number) => String(value).padStart(2, "0");
const toDateKey = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const startOfDate = (date: Date) => {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
};

const endOfDate = (date: Date) => {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
};

const parseDateOnly = (value: string | undefined, boundary: "end" | "start") => {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  if (Number.isNaN(date.getTime())) return null;
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }

  return boundary === "start" ? startOfDate(date) : endOfDate(date);
};

const daysBetweenInclusive = (from: Date, to: Date) => {
  const start = startOfDate(from).getTime();
  const end = startOfDate(to).getTime();

  return Math.floor((end - start) / MS_PER_DAY) + 1;
};

type PeriodResult =
  | {
      current: { end: Date | null; start: Date | null };
      period: AdminPsychologistActivitiesDTO["period"];
      success: true;
    }
  | { code: string; success: false };

const resolvePeriod = (query: { from?: string; to?: string } = {}): PeriodResult => {
  const hasCustomFrom = Boolean(query.from);
  const hasCustomTo = Boolean(query.to);

  if (!hasCustomFrom && !hasCustomTo) {
    return {
      current: { end: null, start: null },
      period: {
        from: null,
        label: "Todo histÃ³rico registrado",
        max_days: null,
        timezone: "server-local",
        to: null,
      },
      success: true,
    };
  }

  if (!hasCustomFrom || !hasCustomTo) {
    return { success: false, code: "invalid_analytics_date_range" };
  }

  const start = parseDateOnly(query.from, "start");
  const end = parseDateOnly(query.to, "end");

  if (!start || !end || start > end) {
    return { success: false, code: "invalid_analytics_date_range" };
  }

  const days = daysBetweenInclusive(start, end);
  if (days < 1 || days > MAX_CUSTOM_PERIOD_DAYS) {
    return { success: false, code: "invalid_analytics_date_range" };
  }

  return {
    current: { end, start },
    period: {
      from: toDateKey(start),
      label: "PerÃ­odo filtrado",
      max_days: MAX_CUSTOM_PERIOD_DAYS,
      timezone: "server-local",
      to: toDateKey(end),
    },
    success: true,
  };
};

const normalizePagination = (input: { limit?: number; page?: number }) => {
  const limit = Math.min(Math.max(Number(input.limit || DEFAULT_LIMIT), 1), MAX_LIMIT);
  const page = Math.max(Number(input.page || 1), 1);

  return { limit, page };
};

const normalizeText = (value?: string | null) =>
  (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const normalizeQuery = (query: IAdminPsychologistActivitiesDTO["q"] = {}) => ({
  ...normalizePagination(query),
  area: query.area?.trim() || "all",
  from: query.from,
  q: query.q?.trim() || "",
  to: query.to,
  type: query.type?.trim() || "all",
});

const roleLabel = (role: string) => {
  const labels: Record<string, string> = {
    admin: "Administrador",
    paciente: "Paciente",
    psicologo: "PsicÃ³logo",
  };

  return labels[role] ?? "UsuÃ¡rio";
};

const actorFromUser = (
  user: { id: string; name: string; role: string } | null,
): AdminPsychologistActivityActor => {
  if (!user) return null;

  return {
    id: user.id,
    name: user.name,
    role: roleLabel(user.role),
  };
};

const actorFromAdmin = (admin: { name: string | null }): AdminPsychologistActivityActor => ({
  id: "admin",
  name: admin.name?.trim() || "Admin Lectum",
  role: "Administrador",
});

const excerpt = (value: string | null | undefined, max = 90) => {
  const normalized = (value ?? "").replace(/\s+/g, " ").trim();
  if (!normalized) return "sem texto cadastrado";
  if (normalized.length <= max) return normalized;

  return `${normalized.slice(0, max - 1).trim()}â€¦`;
};

const postUrl = (post: AdminPsychologistActivityPost) =>
  `/community/${post.community.slug}/post/${post.id}`;

const replyUrl = (reply: AdminPsychologistActivityReply) =>
  `/community/${reply.post.community.slug}/post/${reply.post.id}/thread/${reply.id}`;

const reportContent = (report: AdminPsychologistActivityReport) => {
  if (report.reply) {
    return {
      community: report.reply.post.community,
      detailUrl: `/community/${report.reply.post.community.slug}/post/${report.reply.post.id}/thread/${report.reply.id}`,
      title: report.reply.title || `Resposta em: ${report.reply.post.title}`,
      typeLabel: "resposta",
    };
  }

  return {
    community: report.post.community,
    detailUrl: `/community/${report.post.community.slug}/post/${report.post.id}`,
    title: report.post.title,
    typeLabel: "post",
  };
};

const reasonLabel = (reason: string) => {
  const labels: Record<string, string> = {
    abuse: "abuso ou desrespeito",
    other: "outro motivo",
    privacy: "dados pessoais ou privacidade",
    self_harm: "autolesÃ£o ou risco",
    spam: "spam",
  };

  return labels[reason] ?? reason;
};

const changedFieldsFromAudit = (value: unknown) => {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (typeof item === "string") return item.trim();
      if (item && typeof item === "object" && "label" in item) {
        const label = (item as { label?: unknown }).label;
        return typeof label === "string" ? label.trim() : "";
      }

      return "";
    })
    .filter(Boolean);
};

const adminLogType = (action: string): AdminPsychologistActivityType | null => {
  if (action === "psychologist_personal_data_updated") return "admin_personal_data_updated";
  if (action === "psychologist_professional_data_updated") {
    return "admin_professional_data_updated";
  }
  if (action === "psychologist_account_email_changed") return "account_email_changed";
  if (action === "psychologist_account_email_confirmation_sent") {
    return "account_email_confirmation_sent";
  }
  if (action === "psychologist_account_password_reset_sent") {
    return "account_password_reset_sent";
  }
  if (action === "psychologist_account_temporary_password_set") {
    return "account_temporary_password_set";
  }
  if (action === "psychologist_account_sessions_revoked") return "account_sessions_revoked";
  if (action === "psychologist_report_review_started") return "report_review_started";
  if (action === "psychologist_report_dismissed") return "report_dismissed";
  if (action === "psychologist_report_upheld") return "report_upheld";
  if (action === "psychologist_report_content_removed") return "report_content_removed";

  return null;
};

const adminAccountActionLabel = (action: string) => {
  const labels: Record<string, string> = {
    psychologist_account_email_changed: "alterou o e-mail da conta",
    psychologist_account_email_confirmation_sent: "reenviou a confirma\u00e7\u00e3o de e-mail",
    psychologist_account_password_reset_sent: "enviou link de redefini\u00e7\u00e3o de senha",
    psychologist_account_sessions_revoked: "encerrou as sess\u00f5es do psic\u00f3logo",
    psychologist_account_temporary_password_set: "definiu senha tempor\u00e1ria",
  };

  return labels[action] ?? "atualizou a conta";
};

const adminReportActionLabel = (action: string) => {
  const labels: Record<string, string> = {
    psychologist_report_content_removed:
      "resolveu a den\u00fancia como procedente e removeu o conte\u00fado",
    psychologist_report_dismissed: "resolveu a den\u00fancia como improcedente",
    psychologist_report_review_started: "colocou a den\u00fancia em an\u00e1lise",
    psychologist_report_upheld: "resolveu a den\u00fancia como procedente",
  };

  return labels[action] ?? "atualizou a den\u00fancia";
};

const adminLogDescription = (log: AdminPsychologistActivityAdminLog) => {
  const fields = changedFieldsFromAudit(log.changed_fields);
  const isAccountAction = log.action.startsWith("psychologist_account_");
  const isReportAction = log.action.startsWith("psychologist_report_");
  const fieldsText =
    fields.length > 0
      ? fields.join(", ")
      : isAccountAction
        ? "conta"
        : isReportAction
          ? "den\u00fancia"
          : "campos do perfil";
  const actionLabel = isAccountAction
    ? adminAccountActionLabel(log.action)
    : isReportAction
      ? adminReportActionLabel(log.action)
      : log.action === "psychologist_personal_data_updated"
        ? "dados pessoais"
        : "dados profissionais";
  const reason = log.reason?.trim();
  const prefix =
    isAccountAction || isReportAction
      ? `Painel administrativo ${actionLabel}`
      : `Painel administrativo atualizou ${actionLabel}`;

  return `${prefix}. Campos alterados: ${fieldsText}.${
    reason ? ` Motivo/observa\u00e7\u00e3o interna: ${excerpt(reason, 140)}.` : ""
  }`;
};
const makeActivity = (input: {
  actor: AdminPsychologistActivityActor;
  area: AdminPsychologistActivityArea;
  description: string;
  detail_url?: string | null;
  id: string;
  occurred_at: Date;
  source: string;
  type: AdminPsychologistActivityType;
}): AdminPsychologistActivityItem => ({
  actor: input.actor,
  area: {
    id: input.area,
    label: AREA_LABELS[input.area],
  },
  description: input.description,
  detail_url: input.detail_url ?? null,
  id: input.id,
  occurred_at: input.occurred_at,
  source: input.source,
  type: {
    id: input.type,
    label: TYPE_LABELS[input.type],
  },
});

const profileEvents = (
  profile: AdminPsychologistActivitiesProfile,
): AdminPsychologistActivityItem[] => {
  const actor = actorFromUser(profile.user);
  const events: AdminPsychologistActivityItem[] = [
    makeActivity({
      actor,
      area: "perfil",
      description: "Conta do psicÃ³logo criada na plataforma.",
      id: `account-created-${profile.user.id}`,
      occurred_at: profile.user.createdAt,
      source: "user.createdAt",
      type: "account_created",
    }),
    makeActivity({
      actor,
      area: "perfil",
      description: "Perfil profissional criado na base Lectum.",
      id: `profile-created-${profile.id}`,
      occurred_at: profile.createdAt,
      source: "psychologist_profile.createdAt",
      type: "profile_created",
    }),
  ];

  if (profile.updatedAt.getTime() > profile.createdAt.getTime() + 1_000) {
    events.push(
      makeActivity({
        actor,
        area: "perfil",
        description: "Ãšltima atualizaÃ§Ã£o registrada no cadastro profissional.",
        id: `profile-updated-${profile.id}`,
        occurred_at: profile.updatedAt,
        source: "psychologist_profile.updatedAt",
        type: "profile_updated",
      }),
    );
  }

  if (profile.cfp_verified_at) {
    events.push(
      makeActivity({
        actor,
        area: "perfil",
        description: "Registro profissional validado para o perfil.",
        id: `registry-verified-${profile.id}`,
        occurred_at: profile.cfp_verified_at,
        source: "psychologist_profile.cfp_verified_at",
        type: "registry_verified",
      }),
    );
  }

  if (profile.whatsapp_verified_at) {
    events.push(
      makeActivity({
        actor,
        area: "atendimento",
        description: "NÃºmero de WhatsApp confirmado para contato profissional.",
        id: `whatsapp-verified-${profile.id}`,
        occurred_at: profile.whatsapp_verified_at,
        source: "psychologist_profile.whatsapp_verified_at",
        type: "whatsapp_verified",
      }),
    );
  }

  return events;
};

const activityMatchesPeriod = (
  item: AdminPsychologistActivityItem,
  period: { end: Date | null; start: Date | null },
) => {
  if (!period.start || !period.end) return true;

  return item.occurred_at >= period.start && item.occurred_at <= period.end;
};

const activityMatchesQuery = (
  item: AdminPsychologistActivityItem,
  query: ReturnType<typeof normalizeQuery>,
) => {
  if (query.area !== "all" && item.area.id !== query.area) return false;
  if (query.type !== "all" && item.type.id !== query.type) return false;
  if (!query.q) return true;

  const haystack = normalizeText(
    [item.actor?.name, item.area.label, item.description, item.source, item.type.label]
      .filter(Boolean)
      .join(" "),
  );

  return haystack.includes(normalizeText(query.q));
};

const filtersFromActivities = (
  activities: AdminPsychologistActivityItem[],
): AdminPsychologistActivitiesDTO["filters"] => {
  const countBy = (getKey: (item: AdminPsychologistActivityItem) => string) => {
    const counts = new Map<string, number>();
    for (const item of activities) {
      const key = getKey(item);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }

    return counts;
  };

  const areaCounts = countBy((item) => item.area.id);
  const typeCounts = countBy((item) => item.type.id);
  const areaOptions: AdminPsychologistActivitiesFilterOption[] = [...areaCounts.entries()]
    .map(([id, count]) => ({ count, id, label: AREA_LABELS[id as AdminPsychologistActivityArea] }))
    .sort((left, right) => left.label.localeCompare(right.label, "pt-BR"));
  const typeOptions: AdminPsychologistActivitiesFilterOption[] = [...typeCounts.entries()]
    .map(([id, count]) => ({ count, id, label: TYPE_LABELS[id as AdminPsychologistActivityType] }))
    .sort((left, right) => left.label.localeCompare(right.label, "pt-BR"));

  return {
    areas: [{ count: activities.length, id: "all", label: "Todas as Ã¡reas" }, ...areaOptions],
    types: [{ count: activities.length, id: "all", label: "Todos os tipos" }, ...typeOptions],
  };
};

const notFound = () => ({
  status: 404,
  ...error("not_found", { model: "psychologist" }),
});

export const showAdminPsychologistActivities = async (
  data: IAdminPsychologistActivitiesDTO,
): Promise<Resolve> => {
  const query = normalizeQuery(data.q ?? {});
  const period = resolvePeriod({ from: query.from, to: query.to });
  if (!period.success) return { status: 400, ...error(period.code, {}) };

  const repository = new AdminPsychologistActivitiesRepository();
  const profile = await repository.findPsychologist(data.p.id);
  if (!profile) return notFound();

  const psychologistUserId = profile.user.id;
  const [
    posts,
    replies,
    postSaves,
    replySaves,
    subscriptions,
    contactRequests,
    reviews,
    reports,
    adminLogs,
  ] = await Promise.all([
    repository.listAuthoredPosts(psychologistUserId, period.current.start, period.current.end),
    repository.listAuthoredReplies(psychologistUserId, period.current.start, period.current.end),
    repository.listPostSavesByPsychologist(
      psychologistUserId,
      period.current.start,
      period.current.end,
    ),
    repository.listReplySavesByPsychologist(
      psychologistUserId,
      period.current.start,
      period.current.end,
    ),
    repository.listSubscriptions(profile.id, period.current.start, period.current.end),
    repository.listContactRequests(psychologistUserId, period.current.start, period.current.end),
    repository.listReviews(psychologistUserId, period.current.start, period.current.end),
    repository.listReports(psychologistUserId, period.current.start, period.current.end),
    repository.listAdminActivityLogs(
      Array.from(new Set([profile.id, profile.user.id])),
      period.current.start,
      period.current.end,
    ),
  ]);

  const psychologistActor = actorFromUser(profile.user);
  const activities: AdminPsychologistActivityItem[] = [
    ...profileEvents(profile),
    ...subscriptions.map((subscription) =>
      makeActivity({
        actor: psychologistActor,
        area: "financeiro",
        description: `Plano ${subscription.plan.name} registrado com status ${subscription.status}.`,
        id: `subscription-${subscription.id}`,
        occurred_at: subscription.grant_started_at ?? subscription.createdAt,
        source: "professional_subscription.createdAt/grant_started_at",
        type: "subscription_started",
      }),
    ),
    ...posts.map((post) =>
      makeActivity({
        actor: psychologistActor,
        area: "comunidade",
        description: `Criou o post "${post.title}" na comunidade ${post.community.name}.`,
        detail_url: postUrl(post),
        id: `post-${post.id}`,
        occurred_at: post.createdAt,
        source: "community_post.author_id",
        type: "post_created",
      }),
    ),
    ...replies.map((reply) =>
      makeActivity({
        actor: psychologistActor,
        area: "comunidade",
        description: `Respondeu em "${reply.post.title}" na comunidade ${reply.post.community.name}: ${excerpt(
          reply.content,
        )}.`,
        detail_url: replyUrl(reply),
        id: `reply-${reply.id}`,
        occurred_at: reply.createdAt,
        source: "post_reply.author_id",
        type: "reply_created",
      }),
    ),
    ...postSaves.map((save) =>
      makeActivity({
        actor: psychologistActor,
        area: "comunidade",
        description: `Salvou o post "${save.post.title}" da comunidade ${save.post.community.name}.`,
        detail_url: postUrl(save.post),
        id: `post-save-${save.id}`,
        occurred_at: save.createdAt,
        source: "post_save.user_id",
        type: "post_saved",
      }),
    ),
    ...replySaves.map((save) =>
      makeActivity({
        actor: psychologistActor,
        area: "comunidade",
        description: `Salvou uma resposta em "${save.reply.post.title}" da comunidade ${save.reply.post.community.name}.`,
        detail_url: replyUrl(save.reply),
        id: `reply-save-${save.id}`,
        occurred_at: save.createdAt,
        source: "post_reply_save.user_id",
        type: "reply_saved",
      }),
    ),
    ...contactRequests.map((request) =>
      makeActivity({
        actor: actorFromUser(request.user),
        area: "atendimento",
        description: "Contato via WhatsApp registrado para este perfil profissional.",
        id: `contact-${request.id}`,
        occurred_at: request.createdAt,
        source: "contact_request",
        type: "whatsapp_click",
      }),
    ),
    ...reviews.flatMap((review) => {
      const events = [
        makeActivity({
          actor: actorFromUser(review.author),
          area: "avaliacoes",
          description: `Recebeu avaliaÃ§Ã£o de ${review.rating} estrela${review.rating === 1 ? "" : "s"}: ${excerpt(
            review.comment,
          )}.`,
          id: `review-${review.id}`,
          occurred_at: review.createdAt,
          source: "professional_review.createdAt",
          type: "review_received" as const,
        }),
      ];

      if (review.responded_at && review.response) {
        events.push(
          makeActivity({
            actor: psychologistActor,
            area: "avaliacoes",
            description: `Resposta do psicÃ³logo registrada para avaliaÃ§Ã£o: ${excerpt(
              review.response,
            )}.`,
            id: `review-response-${review.id}`,
            occurred_at: review.responded_at,
            source: "professional_review.responded_at",
            type: "review_responded",
          }),
        );
      }

      return events;
    }),
    ...reports.map((report) => {
      const content = reportContent(report);

      return makeActivity({
        actor: null,
        area: "denuncias",
        description: `DenÃºncia registrada em ${content.typeLabel} do psicÃ³logo. Motivo: ${reasonLabel(
          report.reason,
        )}. ConteÃºdo: "${content.title}".`,
        detail_url: content.detailUrl,
        id: `report-${report.id}`,
        occurred_at: report.createdAt,
        source: "post_report",
        type: "report_received",
      });
    }),
    ...adminLogs.flatMap((log) => {
      const type = adminLogType(log.action);
      if (!type) return [];

      return [
        makeActivity({
          actor: actorFromAdmin(log.admin),
          area: log.action.startsWith("psychologist_account_")
            ? "conta"
            : log.action.startsWith("psychologist_report_")
              ? "denuncias"
              : "perfil",
          description: adminLogDescription(log),
          id: `admin-activity-${log.id}`,
          occurred_at: log.createdAt,
          source: "admin_activity_log",
          type,
        }),
      ];
    }),
  ]
    .filter((item) => activityMatchesPeriod(item, period.current))
    .sort((left, right) => right.occurred_at.getTime() - left.occurred_at.getTime());

  const filters = filtersFromActivities(activities);
  const filtered = activities.filter((item) => activityMatchesQuery(item, query));
  const count = filtered.length;
  const pages = Math.max(1, Math.ceil(count / query.limit));
  const page = Math.min(query.page, pages);
  const dataSlice = filtered.slice((page - 1) * query.limit, page * query.limit);

  const response: AdminPsychologistActivitiesDTO = {
    active_filters_count: [
      query.area !== "all" ? query.area : "",
      query.type !== "all" ? query.type : "",
      query.q,
      query.from && query.to ? "period" : "",
    ].filter(Boolean).length,
    count,
    coverage_note:
      "HistÃ³rico dos principais eventos registrados para esta psicÃ³loga na plataforma. Este feed nÃ£o Ã© uma auditoria completa.",
    data: dataSlice,
    export: {
      available: false,
      reason:
        "ExportaÃ§Ã£o nÃ£o exibida porque ainda nÃ£o existe endpoint real para exportar atividades.",
    },
    filters,
    page,
    pages,
    per_page: query.limit,
    period: period.period,
    source:
      "user+psychologist_profile+professional_subscription+community_post+post_reply+post_save+post_reply_save+contact_request+professional_review+post_report+admin_activity_log",
    unavailable: [
      {
        description:
          "Alterações administrativas criadas a partir da TASK-67 possuem trilha própria; edições antigas e uploads/trocas de vídeo anteriores não foram retroagidos.",
        id: "legacy_field_level_audit",
        label: "Histórico anterior à auditoria administrativa",
        source: "not_tracked",
      },
      {
        description:
          "Eventos de pagamento brutos nÃ£o sÃ£o exibidos aqui porque payment_event nÃ£o possui vÃ­nculo confiÃ¡vel direto com o psicÃ³logo.",
        id: "payment_events",
        label: "Eventos brutos de pagamento",
        source: "payment_event",
      },
    ],
  };

  return {
    status: 200,
    ...msg("show", {}),
    data: response,
  };
};
