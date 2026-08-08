import type { Resolve } from "@/helpers/return";
import { error, msg } from "@/helpers/translate";
import { daysBetweenInclusive, parseDateOnly, toDateKey } from "@/utils/date-range";
import type {
  AdminPatientActivitiesDTO,
  AdminPatientActivitiesFilterOption,
  AdminPatientActivityActor,
  AdminPatientActivityArea,
  AdminPatientActivityItem,
  AdminPatientActivityType,
  IAdminPatientActivitiesDTO,
} from "../DTOs/IAdminPatientActivitiesDTO";
import {
  type AdminPatientActivitiesProfile,
  AdminPatientActivitiesRepository,
  type AdminPatientActivityAdminLog,
  type AdminPatientActivityPost,
  type AdminPatientActivityReply,
  type AdminPatientActivityVote,
} from "../repositories/AdminPatientActivitiesRepository";

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;
const MAX_CUSTOM_PERIOD_DAYS = 365;

const AREA_LABELS: Record<AdminPatientActivityArea, string> = {
  avaliacoes: "Avaliações",
  comunidade: "Comunidade",
  conta: "Conta e acesso",
  perfil: "Perfil",
};

const TYPE_LABELS: Record<AdminPatientActivityType, string> = {
  account_created: "Conta criada",
  account_deactivated: "Conta desativada",
  account_deleted: "Conta excluída",
  account_email_changed: "E-mail da conta alterado",
  account_email_confirmation_sent: "Confirmação de e-mail reenviada",
  account_password_reset_sent: "Link de redefinição enviado",
  account_sessions_revoked: "Sessões encerradas",
  account_suspended: "Conta suspensa",
  account_temporary_password_set: "Senha temporária definida",
  account_view_as_started: "Visualização como usuário iniciada",
  admin_personal_data_updated: "Dados pessoais atualizados",
  community_joined: "Entrada em comunidade",
  onboarding_completed: "Onboarding concluído",
  post_created: "Criação de post",
  post_saved: "Post salvo",
  profile_created: "Perfil criado",
  profile_updated: "Atualização de perfil",
  reply_created: "Comentário em comunidade",
  reply_saved: "Resposta salva",
  review_created: "Avaliação criada",
  vote_cast: "Voto registrado",
};

type PeriodResult =
  | {
      current: { end: Date | null; start: Date | null };
      period: AdminPatientActivitiesDTO["period"];
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
        label: "Todo histórico registrado",
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
      label: "Período filtrado",
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

const normalizeQuery = (query: IAdminPatientActivitiesDTO["q"] = {}) => ({
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
    psicologo: "Psicólogo",
  };

  return labels[role] ?? "Usuário";
};

const actorFromUser = (
  user: { id: string; name: string; role: string } | null,
): AdminPatientActivityActor => {
  if (!user) return null;

  return {
    id: user.id,
    name: user.name,
    role: roleLabel(user.role),
  };
};

const actorFromAdmin = (admin: { name: string | null }): AdminPatientActivityActor => ({
  id: "admin",
  name: admin.name?.trim() || "Admin Lectum",
  role: "Administrador",
});

const excerpt = (value: string | null | undefined, max = 90) => {
  const normalized = (value ?? "").replace(/\s+/g, " ").trim();
  if (!normalized) return "sem texto cadastrado";
  if (normalized.length <= max) return normalized;

  return `${normalized.slice(0, max - 1).trim()}…`;
};

const postUrl = (post: AdminPatientActivityPost) =>
  `/comunidades/${post.community.slug}/publicacao/${post.id}`;

const replyUrl = (reply: AdminPatientActivityReply) =>
  `/comunidades/${reply.post.community.slug}/publicacao/${reply.post.id}/resposta/${reply.id}`;

const voteTargetUrl = (vote: AdminPatientActivityVote) => {
  if (vote.reply) return replyUrl(vote.reply);
  if (vote.post) return postUrl(vote.post);

  return null;
};

const voteTargetTitle = (vote: AdminPatientActivityVote) => {
  if (vote.reply) return vote.reply.post.title;
  if (vote.post) return vote.post.title;

  return "conteúdo";
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

const adminLogType = (action: string): AdminPatientActivityType | null => {
  if (action === "patient_personal_data_updated") return "admin_personal_data_updated";
  if (action === "patient_account_email_changed") return "account_email_changed";
  if (action === "patient_account_email_confirmation_sent") {
    return "account_email_confirmation_sent";
  }
  if (action === "patient_account_deactivated") return "account_deactivated";
  if (action === "patient_account_deleted") return "account_deleted";
  if (action === "patient_account_password_reset_sent") return "account_password_reset_sent";
  if (action === "patient_account_temporary_password_set") {
    return "account_temporary_password_set";
  }
  if (action === "patient_account_suspended") return "account_suspended";
  if (action === "patient_account_sessions_revoked") return "account_sessions_revoked";
  if (action === "patient_account_view_as_started") return "account_view_as_started";

  return null;
};

const adminAccountActionLabel = (action: string) => {
  const labels: Record<string, string> = {
    patient_account_email_changed: "alterou o e-mail da conta",
    patient_account_email_confirmation_sent: "reenviou a confirmação de e-mail",
    patient_account_deactivated: "desativou a conta do paciente",
    patient_account_deleted: "excluiu a conta do paciente",
    patient_account_password_reset_sent: "enviou link de redefinição de senha",
    patient_account_sessions_revoked: "encerrou as sessões do paciente",
    patient_account_suspended: "suspendeu a conta do paciente",
    patient_account_temporary_password_set: "definiu senha temporária",
    patient_account_view_as_started: "iniciou visualização como paciente em modo somente leitura",
  };

  return labels[action] ?? "atualizou a conta";
};

const adminLogDescription = (log: AdminPatientActivityAdminLog) => {
  const fields = changedFieldsFromAudit(log.changed_fields);
  const isAccountAction = log.action.startsWith("patient_account_");
  const fieldsText =
    fields.length > 0 ? fields.join(", ") : isAccountAction ? "conta" : "dados pessoais";
  const actionLabel = isAccountAction ? adminAccountActionLabel(log.action) : "dados pessoais";
  const reason = log.reason?.trim();
  const prefix = isAccountAction
    ? `Painel administrativo ${actionLabel}`
    : `Painel administrativo atualizou ${actionLabel}`;

  return `${prefix}. Campos alterados: ${fieldsText}.${
    reason ? ` Motivo/observação interna: ${excerpt(reason, 140)}.` : ""
  }`;
};

const makeActivity = (input: {
  actor: AdminPatientActivityActor;
  area: AdminPatientActivityArea;
  description: string;
  detail_url?: string | null;
  id: string;
  occurred_at: Date;
  source: string;
  type: AdminPatientActivityType;
}): AdminPatientActivityItem => ({
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

const profileEvents = (patient: AdminPatientActivitiesProfile): AdminPatientActivityItem[] => {
  const actor = actorFromUser(patient);
  const events: AdminPatientActivityItem[] = [
    makeActivity({
      actor,
      area: "perfil",
      description: "Conta do paciente criada na plataforma.",
      id: `account-created-${patient.id}`,
      occurred_at: patient.createdAt,
      source: "user.createdAt",
      type: "account_created",
    }),
  ];
  const profile = patient.patient_profile;

  if (profile && !profile.deleted) {
    events.push(
      makeActivity({
        actor,
        area: "perfil",
        description: "Perfil de paciente criado na base Lectum.",
        id: `profile-created-${profile.id}`,
        occurred_at: profile.createdAt,
        source: "patient_profile.createdAt",
        type: "profile_created",
      }),
    );

    if (profile.updatedAt.getTime() > profile.createdAt.getTime() + 1_000) {
      events.push(
        makeActivity({
          actor,
          area: "perfil",
          description: "Última atualização registrada no cadastro do paciente.",
          id: `profile-updated-${profile.id}`,
          occurred_at: profile.updatedAt,
          source: "patient_profile.updatedAt",
          type: "profile_updated",
        }),
      );
    }

    if (profile.onboarding_completed_at) {
      events.push(
        makeActivity({
          actor,
          area: "perfil",
          description: "Onboarding do paciente concluído.",
          id: `onboarding-completed-${profile.id}`,
          occurred_at: profile.onboarding_completed_at,
          source: "patient_profile.onboarding_completed_at",
          type: "onboarding_completed",
        }),
      );
    }
  }

  return events;
};

const activityMatchesPeriod = (
  item: AdminPatientActivityItem,
  period: { end: Date | null; start: Date | null },
) => {
  if (!period.start || !period.end) return true;

  return item.occurred_at >= period.start && item.occurred_at <= period.end;
};

const activityMatchesQuery = (
  item: AdminPatientActivityItem,
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
  activities: AdminPatientActivityItem[],
): AdminPatientActivitiesDTO["filters"] => {
  const countBy = (getKey: (item: AdminPatientActivityItem) => string) => {
    const counts = new Map<string, number>();
    for (const item of activities) {
      const key = getKey(item);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }

    return counts;
  };

  const areaCounts = countBy((item) => item.area.id);
  const typeCounts = countBy((item) => item.type.id);
  const areaOptions: AdminPatientActivitiesFilterOption[] = [...areaCounts.entries()]
    .map(([id, count]) => ({ count, id, label: AREA_LABELS[id as AdminPatientActivityArea] }))
    .sort((left, right) => left.label.localeCompare(right.label, "pt-BR"));
  const typeOptions: AdminPatientActivitiesFilterOption[] = [...typeCounts.entries()]
    .map(([id, count]) => ({ count, id, label: TYPE_LABELS[id as AdminPatientActivityType] }))
    .sort((left, right) => left.label.localeCompare(right.label, "pt-BR"));

  return {
    areas: [{ count: activities.length, id: "all", label: "Todas as áreas" }, ...areaOptions],
    types: [{ count: activities.length, id: "all", label: "Todos os tipos" }, ...typeOptions],
  };
};

const notFound = () => ({
  status: 404,
  ...error("not_found", { model: "patient" }),
});

type ActivityPeriod = { end: Date | null; start: Date | null };

export const buildAdminPatientActivityItems = async ({
  id,
  period,
  repository = new AdminPatientActivitiesRepository(),
}: {
  id: string;
  period?: ActivityPeriod;
  repository?: AdminPatientActivitiesRepository;
}) => {
  const currentPeriod = period ?? { end: null, start: null };
  const patient = await repository.findPatient(id);
  if (!patient) return null;

  const targetIds = Array.from(
    new Set([patient.id, patient.patient_profile?.id].filter(Boolean) as string[]),
  );
  const [posts, replies, votes, postSaves, replySaves, memberships, reviews, adminLogs] =
    await Promise.all([
      repository.listAuthoredPosts(patient.id, currentPeriod.start, currentPeriod.end),
      repository.listAuthoredReplies(patient.id, currentPeriod.start, currentPeriod.end),
      repository.listVotesMade(patient.id, currentPeriod.start, currentPeriod.end),
      repository.listPostSaves(patient.id, currentPeriod.start, currentPeriod.end),
      repository.listReplySaves(patient.id, currentPeriod.start, currentPeriod.end),
      repository.listMemberships(patient.id, currentPeriod.start, currentPeriod.end),
      repository.listReviews(patient.id, currentPeriod.start, currentPeriod.end),
      repository.listAdminActivityLogs(targetIds, currentPeriod.start, currentPeriod.end),
    ]);

  const patientActor = actorFromUser(patient);
  const activities: AdminPatientActivityItem[] = [
    ...profileEvents(patient),
    ...posts.map((post) =>
      makeActivity({
        actor: patientActor,
        area: "comunidade",
        description: `Criou o post "${post.title}" na comunidade ${post.community.name}: ${excerpt(
          post.content,
        )}.`,
        detail_url: postUrl(post),
        id: `post-${post.id}`,
        occurred_at: post.createdAt,
        source: "community_post.author_id",
        type: "post_created",
      }),
    ),
    ...replies.map((reply) =>
      makeActivity({
        actor: patientActor,
        area: "comunidade",
        description: `Comentou em "${reply.post.title}" na comunidade ${reply.post.community.name}: ${excerpt(
          reply.content,
        )}.`,
        detail_url: replyUrl(reply),
        id: `reply-${reply.id}`,
        occurred_at: reply.createdAt,
        source: "post_reply.author_id",
        type: "reply_created",
      }),
    ),
    ...votes.map((vote) =>
      makeActivity({
        actor: patientActor,
        area: "comunidade",
        description: `Registrou ${vote.value > 0 ? "upvote" : "downvote"} em "${voteTargetTitle(
          vote,
        )}".`,
        detail_url: voteTargetUrl(vote),
        id: `vote-${vote.id}`,
        occurred_at: vote.createdAt,
        source: "post_vote.user_id",
        type: "vote_cast",
      }),
    ),
    ...postSaves.map((save) =>
      makeActivity({
        actor: patientActor,
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
        actor: patientActor,
        area: "comunidade",
        description: `Salvou uma resposta em "${save.reply.post.title}" da comunidade ${save.reply.post.community.name}.`,
        detail_url: replyUrl(save.reply),
        id: `reply-save-${save.id}`,
        occurred_at: save.createdAt,
        source: "post_reply_save.user_id",
        type: "reply_saved",
      }),
    ),
    ...memberships.map((member) =>
      makeActivity({
        actor: patientActor,
        area: "comunidade",
        description: `Entrou na comunidade ${member.community.name}.`,
        detail_url: `/comunidades/${member.community.slug}`,
        id: `member-${member.id}`,
        occurred_at: member.createdAt,
        source: "community_member.user_id",
        type: "community_joined",
      }),
    ),
    ...reviews.map((review) =>
      makeActivity({
        actor: patientActor,
        area: "avaliacoes",
        description: `Criou avaliação profissional com nota ${review.rating} para ${review.psychologist.name}.`,
        detail_url: `/psicologos/${review.psychologist.id}?tab=avaliacoes`,
        id: `review-${review.id}`,
        occurred_at: review.createdAt,
        source: "professional_review.author_id",
        type: "review_created",
      }),
    ),
    ...adminLogs.flatMap((log) => {
      const type = adminLogType(log.action);
      if (!type) return [];

      return [
        makeActivity({
          actor: actorFromAdmin(log.admin),
          area: log.action.startsWith("patient_account_") ? "conta" : "perfil",
          description: adminLogDescription(log),
          id: `admin-activity-${log.id}`,
          occurred_at: log.createdAt,
          source: "admin_activity_log",
          type,
        }),
      ];
    }),
  ]
    .filter((item) => activityMatchesPeriod(item, currentPeriod))
    .sort((left, right) => right.occurred_at.getTime() - left.occurred_at.getTime());

  return { activities, patient };
};

export const showAdminPatientActivities = async (
  data: IAdminPatientActivitiesDTO,
): Promise<Resolve> => {
  const query = normalizeQuery(data.q ?? {});
  const period = resolvePeriod({ from: query.from, to: query.to });
  if (!period.success) return { status: 400, ...error(period.code, {}) };

  const activityFeed = await buildAdminPatientActivityItems({
    id: data.p.id,
    period: period.current,
  });
  if (!activityFeed) return notFound();

  const filters = filtersFromActivities(activityFeed.activities);
  const filtered = activityFeed.activities.filter((item) => activityMatchesQuery(item, query));
  const count = filtered.length;
  const pages = Math.max(1, Math.ceil(count / query.limit));
  const page = Math.min(query.page, pages);
  const dataSlice = filtered.slice((page - 1) * query.limit, page * query.limit);

  const response: AdminPatientActivitiesDTO = {
    active_filters_count: [
      query.area !== "all" ? query.area : "",
      query.type !== "all" ? query.type : "",
      query.q,
      query.from && query.to ? "period" : "",
    ].filter(Boolean).length,
    count,
    coverage_note:
      "Atividades são derivadas de posts, comentários, votos, salvamentos, entrada em comunidades, avaliações e ações administrativas auditadas reais. Login não é exibido porque não há evento de login confiável nesta V1.",
    data: dataSlice,
    export: {
      available: false,
      reason:
        "Exportação não exibida porque ainda não existe endpoint real para exportar atividades.",
    },
    filters,
    page,
    pages,
    per_page: query.limit,
    period: period.period,
    source:
      "user+patient_profile+community_member+community_post+post_reply+post_vote+post_save+post_reply_save+professional_review+admin_activity_log",
    unavailable: [
      {
        description:
          "Login não é exibido porque user_token informa apenas sessão/token atual, não um evento confiável de login por ocorrência nesta V1.",
        id: "login",
        label: "Login",
        source: "user_token",
      },
    ],
  };

  return {
    status: 200,
    ...msg("show", {}),
    data: response,
  };
};
