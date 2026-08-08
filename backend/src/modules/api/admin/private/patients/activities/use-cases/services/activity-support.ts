import { error } from "@/helpers/translate";
import { daysBetweenInclusive, parseDateOnly, toDateKey } from "@/utils/date-range";
import type {
  AdminPatientActivitiesDTO,
  AdminPatientActivitiesFilterOption,
  AdminPatientActivityActor,
  AdminPatientActivityArea,
  AdminPatientActivityItem,
  AdminPatientActivityType,
  IAdminPatientActivitiesDTO,
} from "../../DTOs/IAdminPatientActivitiesDTO";
import type {
  AdminPatientActivitiesProfile,
  AdminPatientActivityAdminLog,
  AdminPatientActivityPost,
  AdminPatientActivityReply,
  AdminPatientActivityVote,
} from "../../repositories/AdminPatientActivitiesRepository";

export const DEFAULT_LIMIT = 10;

export const MAX_LIMIT = 50;

export const MAX_CUSTOM_PERIOD_DAYS = 365;

export const AREA_LABELS: Record<AdminPatientActivityArea, string> = {
  avaliacoes: "Avaliações",
  comunidade: "Comunidade",
  conta: "Conta e acesso",
  perfil: "Perfil",
};

export const TYPE_LABELS: Record<AdminPatientActivityType, string> = {
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

export type PeriodResult =
  | {
      current: { end: Date | null; start: Date | null };
      period: AdminPatientActivitiesDTO["period"];
      success: true;
    }
  | { code: string; success: false };

export const resolvePeriod = (query: { from?: string; to?: string } = {}): PeriodResult => {
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

export const normalizePagination = (input: { limit?: number; page?: number }) => {
  const limit = Math.min(Math.max(Number(input.limit || DEFAULT_LIMIT), 1), MAX_LIMIT);
  const page = Math.max(Number(input.page || 1), 1);

  return { limit, page };
};

export const normalizeText = (value?: string | null) =>
  (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

export const normalizeQuery = (query: IAdminPatientActivitiesDTO["q"] = {}) => ({
  ...normalizePagination(query),
  area: query.area?.trim() || "all",
  from: query.from,
  q: query.q?.trim() || "",
  to: query.to,
  type: query.type?.trim() || "all",
});

export const roleLabel = (role: string) => {
  const labels: Record<string, string> = {
    admin: "Administrador",
    paciente: "Paciente",
    psicologo: "Psicólogo",
  };

  return labels[role] ?? "Usuário";
};

export const actorFromUser = (
  user: { id: string; name: string; role: string } | null,
): AdminPatientActivityActor => {
  if (!user) return null;

  return {
    id: user.id,
    name: user.name,
    role: roleLabel(user.role),
  };
};

export const actorFromAdmin = (admin: { name: string | null }): AdminPatientActivityActor => ({
  id: "admin",
  name: admin.name?.trim() || "Admin Lectum",
  role: "Administrador",
});

export const excerpt = (value: string | null | undefined, max = 90) => {
  const normalized = (value ?? "").replace(/\s+/g, " ").trim();
  if (!normalized) return "sem texto cadastrado";
  if (normalized.length <= max) return normalized;

  return `${normalized.slice(0, max - 1).trim()}…`;
};

export const postUrl = (post: AdminPatientActivityPost) =>
  `/comunidades/${post.community.slug}/publicacao/${post.id}`;

export const replyUrl = (reply: AdminPatientActivityReply) =>
  `/comunidades/${reply.post.community.slug}/publicacao/${reply.post.id}/resposta/${reply.id}`;

export const voteTargetUrl = (vote: AdminPatientActivityVote) => {
  if (vote.reply) return replyUrl(vote.reply);
  if (vote.post) return postUrl(vote.post);

  return null;
};

export const voteTargetTitle = (vote: AdminPatientActivityVote) => {
  if (vote.reply) return vote.reply.post.title;
  if (vote.post) return vote.post.title;

  return "conteúdo";
};

export const changedFieldsFromAudit = (value: unknown) => {
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

export const adminLogType = (action: string): AdminPatientActivityType | null => {
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

export const adminAccountActionLabel = (action: string) => {
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

export const adminLogDescription = (log: AdminPatientActivityAdminLog) => {
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

export const makeActivity = (input: {
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

export const profileEvents = (
  patient: AdminPatientActivitiesProfile,
): AdminPatientActivityItem[] => {
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

export const activityMatchesPeriod = (
  item: AdminPatientActivityItem,
  period: { end: Date | null; start: Date | null },
) => {
  if (!period.start || !period.end) return true;

  return item.occurred_at >= period.start && item.occurred_at <= period.end;
};

export const activityMatchesQuery = (
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

export const filtersFromActivities = (
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

export const notFound = () => ({
  status: 404,
  ...error("not_found", { model: "patient" }),
});
