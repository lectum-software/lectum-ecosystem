import { error } from "@/helpers/translate";
import { daysBetweenInclusive, parseDateOnly, toDateKey } from "@/utils/date-range";
import type {
  AdminPsychologistActivitiesDTO,
  AdminPsychologistActivitiesFilterOption,
  AdminPsychologistActivityActor,
  AdminPsychologistActivityArea,
  AdminPsychologistActivityItem,
  AdminPsychologistActivityType,
  IAdminPsychologistActivitiesDTO,
} from "../../DTOs/IAdminPsychologistActivitiesDTO";
import type {
  AdminPsychologistActivitiesProfile,
  AdminPsychologistActivityAdminLog,
  AdminPsychologistActivityPost,
  AdminPsychologistActivityReply,
  AdminPsychologistActivityReport,
} from "../../repositories/AdminPsychologistActivitiesRepository";

export const DEFAULT_LIMIT = 10;

export const MAX_LIMIT = 50;

export const MAX_CUSTOM_PERIOD_DAYS = 365;

export const AREA_LABELS: Record<AdminPsychologistActivityArea, string> = {
  atendimento: "Atendimento",
  avaliacoes: "Avaliações",
  comunidade: "Comunidade",
  conta: "Conta e acesso",
  denuncias: "Denúncias",
  financeiro: "Financeiro",
  perfil: "Perfil",
};

export const TYPE_LABELS: Record<AdminPsychologistActivityType, string> = {
  account_created: "Conta criada",
  account_deactivated: "Conta desativada",
  account_deleted: "Conta excluída",
  account_email_changed: "E-mail da conta alterado",
  account_email_confirmation_sent: "Confirma\u00e7\u00e3o de e-mail reenviada",
  account_password_reset_sent: "Link de redefini\u00e7\u00e3o enviado",
  account_sessions_revoked: "Sess\u00f5es encerradas",
  account_suspended: "Conta suspensa",
  account_temporary_password_set: "Senha tempor\u00e1ria definida",
  account_view_as_started: "Visualização como usuário iniciada",
  admin_personal_data_updated: "Dados pessoais atualizados",
  admin_professional_data_updated: "Dados profissionais atualizados",
  post_created: "Criação de post",
  post_saved: "Post salvo",
  profile_created: "Perfil criado",
  profile_updated: "Atualização de perfil",
  registry_verified: "Validação de registro",
  reply_created: "Resposta em comunidade",
  reply_saved: "Resposta salva",
  report_received: "Denúncia recebida",
  report_content_removed: "Den\u00fancia procedente com conte\u00fado removido",
  report_decision_reviewed: "Decis\u00e3o de den\u00fancia revisada",
  report_dismissed: "Den\u00fancia improcedente",
  report_review_started: "Den\u00fancia em an\u00e1lise",
  report_upheld: "Den\u00fancia procedente",
  review_received: "Avaliação recebida",
  review_responded: "Resposta à avaliação",
  subscription_cancelled: "Assinatura cancelada",
  subscription_started: "Assinatura registrada",
  whatsapp_click: "Clique no WhatsApp",
  whatsapp_verified: "WhatsApp verificado",
};

export type PeriodResult =
  | {
      current: { end: Date | null; start: Date | null };
      period: AdminPsychologistActivitiesDTO["period"];
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

export const normalizeQuery = (query: IAdminPsychologistActivitiesDTO["q"] = {}) => ({
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
): AdminPsychologistActivityActor => {
  if (!user) return null;

  return {
    id: user.id,
    name: user.name,
    role: roleLabel(user.role),
  };
};

export const actorFromAdmin = (admin: { name: string | null }): AdminPsychologistActivityActor => ({
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

export const postUrl = (post: AdminPsychologistActivityPost) =>
  `/comunidades/${post.community.slug}/publicacao/${post.id}`;

export const replyUrl = (reply: AdminPsychologistActivityReply) =>
  `/comunidades/${reply.post.community.slug}/publicacao/${reply.post.id}/resposta/${reply.id}`;

export const reportContent = (report: AdminPsychologistActivityReport) => {
  if (report.reply) {
    return {
      community: report.reply.post.community,
      detailUrl: `/comunidades/${report.reply.post.community.slug}/publicacao/${report.reply.post.id}/resposta/${report.reply.id}`,
      title: report.reply.title || `Resposta em: ${report.reply.post.title}`,
      typeLabel: "resposta",
    };
  }

  return {
    community: report.post.community,
    detailUrl: `/comunidades/${report.post.community.slug}/publicacao/${report.post.id}`,
    title: report.post.title,
    typeLabel: "post",
  };
};

export const reasonLabel = (reason: string) => {
  const labels: Record<string, string> = {
    abuse: "abuso ou desrespeito",
    other: "outro motivo",
    privacy: "dados pessoais ou privacidade",
    self_harm: "autolesão ou risco",
    spam: "spam",
  };

  return labels[reason] ?? reason;
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

export const adminLogType = (action: string): AdminPsychologistActivityType | null => {
  if (action === "psychologist_personal_data_updated") return "admin_personal_data_updated";
  if (action === "psychologist_professional_data_updated") {
    return "admin_professional_data_updated";
  }
  if (action === "psychologist_account_email_changed") return "account_email_changed";
  if (action === "psychologist_account_email_confirmation_sent") {
    return "account_email_confirmation_sent";
  }
  if (action === "psychologist_account_deactivated") return "account_deactivated";
  if (action === "psychologist_account_deleted") return "account_deleted";
  if (action === "psychologist_account_password_reset_sent") {
    return "account_password_reset_sent";
  }
  if (action === "psychologist_account_temporary_password_set") {
    return "account_temporary_password_set";
  }
  if (action === "psychologist_account_suspended") return "account_suspended";
  if (action === "psychologist_account_sessions_revoked") return "account_sessions_revoked";
  if (action === "psychologist_account_view_as_started") return "account_view_as_started";
  if (action === "psychologist_report_review_started") return "report_review_started";
  if (action === "psychologist_report_decision_reviewed") return "report_decision_reviewed";
  if (action === "psychologist_report_dismissed") return "report_dismissed";
  if (action === "psychologist_report_upheld") return "report_upheld";
  if (action === "psychologist_report_content_removed") return "report_content_removed";
  if (action === "psychologist_subscription_cancelled") return "subscription_cancelled";

  return null;
};

export const adminAccountActionLabel = (action: string) => {
  const labels: Record<string, string> = {
    psychologist_account_email_changed: "alterou o e-mail da conta",
    psychologist_account_email_confirmation_sent: "reenviou a confirma\u00e7\u00e3o de e-mail",
    psychologist_account_deactivated: "desativou a conta do psicólogo",
    psychologist_account_deleted: "excluiu a conta do psicólogo",
    psychologist_account_password_reset_sent: "enviou link de redefini\u00e7\u00e3o de senha",
    psychologist_account_sessions_revoked: "encerrou as sess\u00f5es do psic\u00f3logo",
    psychologist_account_suspended: "suspendeu a conta do psicólogo",
    psychologist_account_temporary_password_set: "definiu senha tempor\u00e1ria",
    psychologist_account_view_as_started:
      "iniciou visualização como psicólogo em modo somente leitura",
  };

  return labels[action] ?? "atualizou a conta";
};

export const adminReportActionLabel = (action: string) => {
  const labels: Record<string, string> = {
    psychologist_report_content_removed:
      "resolveu a den\u00fancia como procedente e removeu o conte\u00fado",
    psychologist_report_decision_reviewed: "revisou a decis\u00e3o da den\u00fancia",
    psychologist_report_dismissed: "resolveu a den\u00fancia como improcedente",
    psychologist_report_review_started: "colocou a den\u00fancia em an\u00e1lise",
    psychologist_report_upheld: "resolveu a den\u00fancia como procedente",
  };

  return labels[action] ?? "atualizou a den\u00fancia";
};

export const adminSubscriptionActionLabel = (action: string) => {
  const labels: Record<string, string> = {
    psychologist_subscription_cancelled: "cancelou a assinatura profissional",
  };

  return labels[action] ?? "atualizou a assinatura";
};

export const adminLogDescription = (log: AdminPsychologistActivityAdminLog) => {
  const fields = changedFieldsFromAudit(log.changed_fields);
  const isAccountAction = log.action.startsWith("psychologist_account_");
  const isReportAction = log.action.startsWith("psychologist_report_");
  const isSubscriptionAction = log.action.startsWith("psychologist_subscription_");
  const fieldsText =
    fields.length > 0
      ? fields.join(", ")
      : isAccountAction
        ? "conta"
        : isReportAction
          ? "den\u00fancia"
          : isSubscriptionAction
            ? "assinatura"
            : "campos do perfil";
  const actionLabel = isAccountAction
    ? adminAccountActionLabel(log.action)
    : isReportAction
      ? adminReportActionLabel(log.action)
      : isSubscriptionAction
        ? adminSubscriptionActionLabel(log.action)
        : log.action === "psychologist_personal_data_updated"
          ? "dados pessoais"
          : "dados profissionais";
  const reason = log.reason?.trim();
  const prefix =
    isAccountAction || isReportAction || isSubscriptionAction
      ? `Painel administrativo ${actionLabel}`
      : `Painel administrativo atualizou ${actionLabel}`;

  return `${prefix}. Campos alterados: ${fieldsText}.${
    reason ? ` Motivo/observa\u00e7\u00e3o interna: ${excerpt(reason, 140)}.` : ""
  }`;
};

export const makeActivity = (input: {
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

export const profileEvents = (
  profile: AdminPsychologistActivitiesProfile,
): AdminPsychologistActivityItem[] => {
  const actor = actorFromUser(profile.user);
  const events: AdminPsychologistActivityItem[] = [
    makeActivity({
      actor,
      area: "perfil",
      description: "Conta do psicólogo criada na plataforma.",
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
        description: "Última atualização registrada no cadastro profissional.",
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
        description: "Número de WhatsApp confirmado para contato profissional.",
        id: `whatsapp-verified-${profile.id}`,
        occurred_at: profile.whatsapp_verified_at,
        source: "psychologist_profile.whatsapp_verified_at",
        type: "whatsapp_verified",
      }),
    );
  }

  return events;
};

export const activityMatchesPeriod = (
  item: AdminPsychologistActivityItem,
  period: { end: Date | null; start: Date | null },
) => {
  if (!period.start || !period.end) return true;

  return item.occurred_at >= period.start && item.occurred_at <= period.end;
};

export const activityMatchesQuery = (
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

export const filtersFromActivities = (
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
    areas: [{ count: activities.length, id: "all", label: "Todas as áreas" }, ...areaOptions],
    types: [{ count: activities.length, id: "all", label: "Todos os tipos" }, ...typeOptions],
  };
};

export const notFound = () => ({
  status: 404,
  ...error("not_found", { model: "psychologist" }),
});

export type ActivityPeriod = { end: Date | null; start: Date | null };
