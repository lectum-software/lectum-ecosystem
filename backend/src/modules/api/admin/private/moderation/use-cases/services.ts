import type { Resolve } from "@/helpers/return";
import { error, msg } from "@/helpers/translate";
import {
  buildProfessionalFullDisplayName,
  normalizeProfessionalDisplayName,
} from "@/utils/professional-name";
import { parseStoredCrp } from "@/utils/professional-registry";
import { hasProfessionalRegistryApproval } from "@/utils/subscription-entitlement";
import type {
  AdminModerationEventDetailDTO,
  AdminModerationEventItemDTO,
  AdminModerationEventsDTO,
  AdminModerationEventsQuery,
  AdminModerationOperationalAlertDTO,
  AdminModerationOperationalAlertsDTO,
  AdminModerationOperationalAlertsGroup,
  AdminModerationOperationalAlertsPageDTO,
  AdminModerationOperationalAlertsQuery,
  AdminModerationOverviewChartsDTO,
  AdminModerationReportActionDTO,
  AdminModerationReportChartType,
  AdminModerationSummaryDTO,
  IAdminModerationEventDTO,
  IAdminModerationEventsDTO,
  IAdminModerationOperationalAlertsDTO,
  IAdminModerationReportResolveDTO,
  IAdminModerationResolveDTO,
  IAdminModerationSummaryDTO,
} from "../DTOs/IAdminModerationDTO";
import {
  type AdminModerationReportAudit,
  type AdminModerationReportMutationResult,
  AdminModerationRepository,
} from "../repositories/AdminModerationRepository";
import type {
  AdminModerationEventDetailRecord,
  AdminModerationEventRecord,
  AdminOperationalPsychologistRecord,
  AdminPostReportRecord,
  AdminPsychologistMetricCountRecord,
  AdminUncoveredPatientPostRecord,
  ReplyTargetRecord,
} from "../repositories/interfaces/IAdminModerationRepository";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;
const OPERATIONAL_ALERT_LIMIT = 50;
const POST_COVERAGE_HOURS = 48;
const PSYCHOLOGIST_ADAPTATION_DAYS = 30;
const HOUR_IN_MS = 60 * 60 * 1000;
const DAY_IN_MS = 24 * HOUR_IN_MS;
const DISMISS_REPORT_CONFIRMATION = "DENUNCIA IMPROCEDENTE";
const UPHOLD_REPORT_CONFIRMATION = "DENUNCIA PROCEDENTE";

const toStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];

  return value.filter((item): item is string => typeof item === "string");
};

const normalizePage = (value?: number) => Math.max(DEFAULT_PAGE, Number(value || DEFAULT_PAGE));
const normalizeLimit = (value?: number) =>
  Math.min(MAX_LIMIT, Math.max(1, Number(value || DEFAULT_LIMIT)));
const normalizeSearch = (value?: string | null) => value?.trim().toLowerCase() ?? "";
const normalizeFilter = (value?: string | null) => value?.trim() || "all";

const paginate = <T>(items: T[], page: number, limit: number) => {
  const count = items.length;
  const pages = Math.max(1, Math.ceil(count / limit));
  const safePage = Math.min(page, pages);
  const start = (safePage - 1) * limit;

  return {
    count,
    data: items.slice(start, start + limit),
    page: safePage,
    pages,
    per_page: limit,
  };
};

const authorPublicLabel = (
  event: AdminModerationEventRecord | AdminModerationEventDetailRecord,
) => {
  if (event.author.role === "paciente") return "Paciente";
  if (event.author.role === "psicologo") return event.author.name;

  return "Usuário";
};

const createReplyMap = (replies: ReplyTargetRecord[]) => {
  const map = new Map<string, ReplyTargetRecord>();
  for (const reply of replies) map.set(reply.id, reply);

  return map;
};

const buildPublicUrl = (
  event: AdminModerationEventRecord | AdminModerationEventDetailRecord,
  replies: Map<string, ReplyTargetRecord>,
) => {
  if (!event.target_id) return null;

  if (event.target_type === "community_post" && event.community?.slug) {
    return `/community/${event.community.slug}/post/${event.target_id}`;
  }

  if (event.target_type === "post_reply") {
    const reply = replies.get(event.target_id);
    if (!reply) return null;

    return `/community/${reply.post.community.slug}/post/${reply.post_id}/thread/${event.target_id}`;
  }

  return null;
};

const mapEvent = (
  event: AdminModerationEventRecord,
  replies: Map<string, ReplyTargetRecord>,
): AdminModerationEventItemDTO => ({
  author: {
    id: event.author.id,
    public_label: authorPublicLabel(event),
    role: event.author.role,
  },
  blocked_before_publication: !event.target_id,
  categories: toStringArray(event.categories),
  community: event.community
    ? {
        id: event.community.id,
        name: event.community.name,
        slug: event.community.slug,
      }
    : null,
  content_excerpt: event.content_excerpt,
  created_at: event.createdAt,
  decision: event.decision,
  id: event.id,
  matched_rules: toStringArray(event.matched_rules),
  public_url: buildPublicUrl(event, replies),
  reason_code: event.reason_code,
  reviewed_at: event.reviewed_at,
  resolved_at: event.resolved_at,
  severity: event.severity,
  status: event.status,
  target_id: event.target_id,
  target_type: event.target_type,
  title_snapshot: event.title_snapshot,
});

const mapEventDetail = (
  event: AdminModerationEventDetailRecord,
  replies: Map<string, ReplyTargetRecord>,
): AdminModerationEventDetailDTO => ({
  ...mapEvent(event, replies),
  admin_note: event.admin_note,
  author: {
    admin_label: event.author.name,
    id: event.author.id,
    public_label: authorPublicLabel(event),
    role: event.author.role,
  },
  content_snapshot: event.content_snapshot,
  reviewed_by_admin_id: event.reviewed_by_admin_id,
});

const hydrateReplyTargets = async (
  events: (AdminModerationEventDetailRecord | AdminModerationEventRecord)[],
) => {
  const replyIds = events
    .filter((event) => event.target_type === "post_reply" && event.target_id)
    .map((event) => event.target_id as string);

  const repository = new AdminModerationRepository();
  return createReplyMap(await repository.listReplyTargets([...new Set(replyIds)]));
};

const eventMatchesCategory = (event: AdminModerationEventRecord, category: string) => {
  if (category === "all") return true;

  return toStringArray(event.categories).includes(category);
};

const eventMatchesSearch = (event: AdminModerationEventItemDTO, search: string) => {
  if (!search) return true;

  return [
    event.author.public_label,
    event.community?.name,
    event.content_excerpt,
    event.decision,
    event.reason_code,
    event.severity,
    event.status,
    event.title_snapshot,
  ]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(search));
};

const countBy = (
  events: AdminModerationEventRecord[],
  selector: (event: AdminModerationEventRecord) => string[],
) => {
  const output: Record<string, number> = {};
  for (const event of events) {
    for (const key of selector(event)) output[key] = (output[key] ?? 0) + 1;
  }

  return output;
};

const normalizeQuery = (query: AdminModerationEventsQuery = {}): AdminModerationEventsQuery => ({
  ...query,
  category: normalizeFilter(query.category),
  community: normalizeFilter(query.community),
  decision: normalizeFilter(query.decision) as AdminModerationEventsQuery["decision"],
  severity: normalizeFilter(query.severity) as AdminModerationEventsQuery["severity"],
  status: normalizeFilter(query.status) as AdminModerationEventsQuery["status"],
  targetType: normalizeFilter(query.targetType) as AdminModerationEventsQuery["targetType"],
});

const priorityWeight: Record<AdminModerationOperationalAlertDTO["priority"], number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
};

const excludedOperationalDimensions = [
  {
    id: "region_city_coverage",
    reason: "Dimensão removida do escopo atual por decisão de produto.",
    title: "Região/cidade com pacientes sem cobertura",
  },
  {
    id: "price_range_demand",
    reason: "Dimensão removida do escopo atual por decisão de produto.",
    title: "Faixa de preço muito buscada com pouca oferta",
  },
  {
    id: "schedule_demand",
    reason: "Dimensão removida do escopo atual por decisão de produto.",
    title: "Horários muito buscados sem disponibilidade",
  },
] satisfies AdminModerationOperationalAlertsDTO["excluded_dimensions"];

const hoursSince = (date: Date, now: Date) =>
  Math.max(0, Math.floor((now.getTime() - date.getTime()) / HOUR_IN_MS));

const daysSince = (date: Date, now: Date) =>
  Math.max(0, Math.floor((now.getTime() - date.getTime()) / DAY_IN_MS));

const plural = (value: number, singular: string, pluralValue: string) =>
  value === 1 ? singular : pluralValue;

const humanAge = (date: Date, now: Date) => {
  const hours = hoursSince(date, now);
  if (hours < 24) return `${hours} ${plural(hours, "hora", "horas")}`;

  const days = daysSince(date, now);
  return `${days} ${plural(days, "dia", "dias")}`;
};

const compactText = (value?: string | null, max = 140) => {
  const normalized = value?.replace(/\s+/g, " ").trim();
  if (!normalized) return "Sem texto registrado.";

  return normalized.length > max ? `${normalized.slice(0, max - 1)}…` : normalized;
};

const postReportReasonLabels: Record<string, string> = {
  abuse: "Ofensa, assédio ou discurso de ódio",
  other: "Outro motivo",
  privacy: "Exposição de dados pessoais",
  self_harm: "Incentivo à violência ou autolesão",
  spam: "Spam ou divulgação indevida",
};

const postReportReasonLabel = (reason: string) => postReportReasonLabels[reason] ?? reason;

const postReportStatusGroup = (status: string): "dismissed" | "pending" | "upheld" => {
  const normalized = normalizeSearch(status);
  if (["resolvida", "resolved", "procedente", "upheld"].includes(normalized)) return "upheld";
  if (["rejeitada", "rejected", "improcedente", "dismissed"].includes(normalized)) {
    return "dismissed";
  }

  return "pending";
};

const postReportStatusLabel = (status: string) => {
  const group = postReportStatusGroup(status);
  if (group === "upheld") return "Procedente";
  if (group === "dismissed") return "Improcedente";

  return "Pendente";
};

const postReportPriority = (status: string): AdminModerationOperationalAlertDTO["priority"] => {
  const group = postReportStatusGroup(status);
  if (group === "upheld") return "high";
  if (group === "dismissed") return "medium";

  return "urgent";
};

const roleLabel = (role: string) => {
  const labels: Record<string, string> = {
    paciente: "Paciente",
    psicologo: "Psicólogo",
  };

  return labels[role] ?? "Usuário";
};

type AdminPostReportAuthor =
  | AdminPostReportRecord["post"]["author"]
  | NonNullable<AdminPostReportRecord["reply"]>["author"];

const reportAuthor = (report: AdminPostReportRecord): AdminPostReportAuthor =>
  report.reply ? report.reply.author : report.post.author;

const reportAuthorName = (author: AdminPostReportAuthor) => {
  if (author.role !== "psicologo") return author.name;

  return buildProfessionalFullDisplayName({
    fallbackName: author.name,
    firstName: author.psychologist_profile?.professional_first_name,
    lastName: author.psychologist_profile?.professional_last_name,
  });
};

const reportAuthorRoleLabel = (author: AdminPostReportAuthor) => {
  if (author.role !== "psicologo") return roleLabel(author.role);

  return author.psychologist_profile?.gender?.trim().toLowerCase() === "feminino"
    ? "Psicóloga"
    : "Psicólogo";
};

const reportAuthorVerified = (author: AdminPostReportAuthor) =>
  author.role === "psicologo" && hasProfessionalRegistryApproval(author.psychologist_profile);

const reportContentType = (report: AdminPostReportRecord): "post" | "reply" =>
  report.reply ? "reply" : "post";

const reportCommunity = (report: AdminPostReportRecord) =>
  report.reply ? report.reply.post.community : report.post.community;

const reportPostId = (report: AdminPostReportRecord) =>
  report.reply ? report.reply.post.id : report.post.id;

const reportTitle = (report: AdminPostReportRecord) => {
  if (!report.reply) return report.post.title;

  return report.reply.title || `Resposta em: ${report.reply.post.title}`;
};

const reportContent = (report: AdminPostReportRecord) =>
  report.reply ? report.reply.content : report.post.content;

const reportContentCreatedAt = (report: AdminPostReportRecord) =>
  report.reply ? report.reply.createdAt : report.post.createdAt;

const reportTargetId = (report: AdminPostReportRecord) =>
  report.reply ? report.reply.id : report.post.id;

const reportContentAvailable = (report: AdminPostReportRecord) => {
  if (report.reply) {
    return (
      !report.reply.deleted &&
      !report.reply.post.deleted &&
      report.reply.post.status === "publicado" &&
      !report.reply.post.community.deleted
    );
  }

  return (
    !report.post.deleted && report.post.status === "publicado" && !report.post.community.deleted
  );
};

const reportUnavailableReason = (report: AdminPostReportRecord) => {
  if (report.reply) {
    if (report.reply.deleted) return "Resposta denunciada já foi removida.";
    if (report.reply.post.deleted || report.reply.post.status !== "publicado") {
      return "Publicação da resposta já está indisponível.";
    }
    if (report.reply.post.community.deleted) {
      return "Comunidade da resposta está indisponível.";
    }
  } else {
    if (report.post.deleted || report.post.status !== "publicado") {
      return "Publicação denunciada já está indisponível.";
    }
    if (report.post.community.deleted) {
      return "Comunidade da publicação está indisponível.";
    }
  }

  return null;
};

const reportMedia = (report: AdminPostReportRecord) => {
  if (report.reply) {
    if (!report.reply.media_url || !report.reply.media_type) return null;

    return {
      media_type: report.reply.media_type,
      media_url: report.reply.media_url,
    };
  }

  const firstMedia = report.post.media_items[0];
  const mediaUrl = firstMedia?.media_url ?? report.post.media_url;
  const mediaType = firstMedia?.media_type ?? report.post.media_type;

  if (!mediaUrl || !mediaType) return null;

  return {
    media_type: mediaType,
    media_url: mediaUrl,
  };
};

const reportPublicUrl = (report: AdminPostReportRecord) => {
  if (!reportContentAvailable(report)) return null;

  const community = reportCommunity(report);
  const postId = reportPostId(report);

  return report.reply
    ? `/community/${community.slug}/post/${postId}/thread/${report.reply.id}`
    : `/community/${community.slug}/post/${postId}`;
};

const reportContentDTO = (report: AdminPostReportRecord) => {
  const author = reportAuthor(report);
  const available = reportContentAvailable(report);

  return {
    author: {
      avatar: author.avatar,
      id: author.id,
      name: reportAuthorName(author),
      role: author.role,
      role_label: reportAuthorRoleLabel(author),
      verified: reportAuthorVerified(author),
    },
    available,
    body: reportContent(report),
    community: communityDTO(reportCommunity(report)),
    created_at: reportContentCreatedAt(report),
    excerpt: compactText(reportContent(report), 120),
    id: reportTargetId(report),
    media: reportMedia(report),
    public_url: reportPublicUrl(report),
    title: reportTitle(report),
    type: reportContentType(report),
    unavailable_reason: available ? null : reportUnavailableReason(report),
  };
};

const reportDTO = (report: AdminPostReportRecord) => {
  const statusGroup = postReportStatusGroup(report.status);
  const statusLabel = postReportStatusLabel(report.status);
  const available = reportContentAvailable(report);
  const resolves = statusGroup === "pending";

  return {
    capabilities: {
      can_remove_content: resolves && available,
      can_resolve_dismissed: resolves,
      can_resolve_upheld: resolves,
    },
    content: reportContentDTO(report),
    created_at: report.createdAt,
    description: report.description,
    id: report.id,
    moderation: {
      status: report.status,
      status_label: statusLabel,
    },
    reason: report.reason,
    reason_label: postReportReasonLabel(report.reason),
    reported_by: {
      label: roleLabel(report.reporter.role),
      name: report.reporter.name,
      role: report.reporter.role,
    },
    status: report.status,
    status_group: statusGroup,
    status_label: statusLabel,
  };
};

const reportActionResponse = (
  result: AdminModerationReportMutationResult,
): AdminModerationReportActionDTO => ({
  affected_reports_count: result.affectedReportsCount,
  content_already_unavailable: result.contentAlreadyUnavailable,
  content_removed: result.contentRemoved,
  report: reportDTO(result.report),
  source: "post_report+admin_activity_log",
});

const safeReportTargetSummary = (report: AdminPostReportRecord) => ({
  Comunidade: reportCommunity(report).name,
  Conteudo: compactText(reportTitle(report), 100),
  Tipo: report.reply ? "Resposta" : "Post",
});

const createReportAudit = (input: {
  action: AdminModerationReportAudit["action"];
  adminId: string;
  changedFields: string[];
  metadata?: AdminModerationReportAudit["metadata"];
  reason: string;
  report: AdminPostReportRecord;
  safeAfter?: AdminModerationReportAudit["safeAfter"];
}): AdminModerationReportAudit => ({
  action: input.action,
  adminId: input.adminId,
  changedFields: input.changedFields,
  metadata: {
    ...(input.metadata ?? {}),
    content_author_id: reportAuthor(input.report).id,
    content_author_role: reportAuthor(input.report).role,
    report_id: input.report.id,
    target_id: reportTargetId(input.report),
    target_type: reportContentType(input.report),
  },
  reason: input.reason,
  safeAfter: input.safeAfter,
  safeBefore: {
    "Status da denuncia": postReportStatusLabel(input.report.status),
    ...safeReportTargetSummary(input.report),
  },
  targetId: input.report.id,
});

const reportResolveStatusFromResolution = (resolution: string) => {
  if (resolution === "dismissed") return "rejeitada";
  if (resolution === "upheld") return "resolvida";

  return null;
};

const invalidReportStatus = () => ({
  status: 409,
  ...error("admin_moderation_report_invalid_status", {}),
});

const dismissConfirmationIsValid = (confirmation: string) =>
  confirmation.trim().toUpperCase() === DISMISS_REPORT_CONFIRMATION;

const upholdConfirmationIsValid = (confirmation: string) =>
  confirmation.trim().toUpperCase() === UPHOLD_REPORT_CONFIRMATION;

const toJsonStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];

  return value.map((item) => String(item).trim()).filter(Boolean);
};

const onlyDigits = (value?: string | null) => String(value ?? "").replace(/\D/g, "");

const hasText = (value?: string | null) => Boolean(value?.trim());

const hasValidWhatsapp = (value?: string | null) => {
  const digits = onlyDigits(value);

  return digits.length >= 8 && digits.length <= 15;
};

const whatsappStatusLabel = (value?: string | null) => {
  const digits = onlyDigits(value);
  if (digits.length === 0) return "ausente";

  return `${digits.length} dígitos armazenados`;
};

const activeSubscriptions = (profile: AdminOperationalPsychologistRecord, now: Date) =>
  profile.subscriptions.filter((subscription) => {
    if (subscription.status !== "ativa") return false;

    return !subscription.current_period_end || subscription.current_period_end > now;
  });

const isProfessionalSubscription = (
  subscription: AdminOperationalPsychologistRecord["subscriptions"][number],
) => subscription.plan.slug !== "gratuito";

const pickCurrentSubscription = (profile: AdminOperationalPsychologistRecord, now: Date) => {
  const subscriptions = activeSubscriptions(profile, now);
  if (subscriptions.length === 0) return null;

  return [...subscriptions].sort((left, right) => {
    const leftProfessional = Number(isProfessionalSubscription(left));
    const rightProfessional = Number(isProfessionalSubscription(right));
    if (leftProfessional !== rightProfessional) return rightProfessional - leftProfessional;

    return right.createdAt.getTime() - left.createdAt.getTime();
  })[0];
};

const profileStartedAt = (
  subscription: AdminOperationalPsychologistRecord["subscriptions"][number],
) => subscription.grant_started_at ?? subscription.createdAt;

const psychologistLabel = (profile: AdminOperationalPsychologistRecord) => {
  const professionalName = [profile.professional_first_name, profile.professional_last_name]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(" ");

  return (
    normalizeProfessionalDisplayName(professionalName) ||
    normalizeProfessionalDisplayName(profile.user.name) ||
    "Psicólogo"
  );
};

const hasRegistryApproval = (profile: AdminOperationalPsychologistRecord) =>
  hasProfessionalRegistryApproval({
    cfp_verified_at: profile.cfp_verified_at,
    crp_status: profile.crp_status,
    subscriptions: profile.subscriptions.filter(isProfessionalSubscription),
  });

const missingRequiredPublishingSettings = (
  profile: AdminOperationalPsychologistRecord,
  currentSubscription: AdminOperationalPsychologistRecord["subscriptions"][number],
) => {
  const missing: string[] = [];
  const { crp_number, crp_region } = parseStoredCrp(profile.crp);

  if (!normalizeProfessionalDisplayName(profile.user.name)) missing.push("nome profissional");
  if (!hasText(profile.video_url)) missing.push("vídeo de apresentação");
  if (!hasText(profile.modality)) missing.push("modalidade");
  if (profile.user.psychologist_specialties.length === 0) missing.push("especialidade");
  if (profile.user.psychologist_services.length === 0) missing.push("serviço");
  if (profile.user.psychologist_approaches.length === 0) missing.push("abordagem");
  if (toJsonStringArray(profile.target_audience).length === 0) missing.push("público atendido");
  if (!hasText(profile.gender)) missing.push("gênero");
  if (!hasText(profile.cpf)) missing.push("CPF");
  if (!profile.birthdate) missing.push("data de nascimento");
  if (!hasText(crp_region)) missing.push("regional do CRP");
  if (!hasText(crp_number)) missing.push("número do CRP");
  if (!hasText(profile.professional_address_state)) missing.push("UF de atendimento");
  if (!hasText(profile.professional_address_city)) missing.push("cidade de atendimento");
  if (isProfessionalSubscription(currentSubscription) && !hasRegistryApproval(profile)) {
    missing.push("CRP aprovado");
  }

  return missing;
};

const countMap = (items: AdminPsychologistMetricCountRecord[]) => {
  const map = new Map<string, number>();
  for (const item of items) map.set(item.psychologist_id, item._count._all);

  return map;
};

const communityDTO = (
  community:
    | AdminPostReportRecord["post"]["community"]
    | AdminUncoveredPatientPostRecord["community"],
) => ({
  id: community.id,
  name: community.name,
  slug: community.slug,
});

const mapReportAlert = (
  report: AdminPostReportRecord,
  now: Date,
): AdminModerationOperationalAlertDTO => {
  const isReply = report.target_type === "reply" || Boolean(report.reply_id);
  const community = isReply && report.reply ? report.reply.post.community : report.post.community;
  const detail = reportDTO(report);
  const targetId = isReply
    ? (report.reply?.id ?? report.reply_id ?? report.target_id)
    : report.post.id;
  const targetLabel = isReply
    ? `Resposta em ${report.reply?.post.title ?? report.post.title}`
    : report.post.title;
  const targetExcerpt = isReply ? report.reply?.content : report.post.content;
  const href = targetId
    ? `/comunidades/${community.slug}/conteudo/${isReply ? "reply" : "post"}/${targetId}`
    : null;
  const reportStatusLabel = postReportStatusLabel(report.status);

  return {
    action_href: href,
    action_label: "Abrir conteúdo denunciado",
    age_hours: hoursSince(report.createdAt, now),
    community: communityDTO(community),
    created_at: report.createdAt,
    description: compactText(report.description ?? targetExcerpt, 180),
    entity: {
      href,
      id: targetId ?? report.target_id,
      label: targetLabel,
      type: isReply ? "reply" : "post",
    },
    facts: [
      { label: "Motivo", value: postReportReasonLabel(report.reason) },
      { label: "Status", value: reportStatusLabel },
      { label: "Denunciante", value: report.reporter.role },
      { label: "Idade", value: humanAge(report.createdAt, now) },
    ],
    group: "denuncias",
    id: `post-report-${report.id}`,
    priority: postReportPriority(report.status),
    report: detail,
    source: "post_report",
    title: `Denúncia de ${isReply ? "resposta" : "post"} ${reportStatusLabel.toLowerCase()}`,
    type: "post_report",
  };
};

const mapUncoveredPatientPostAlert = (
  post: AdminUncoveredPatientPostRecord,
  now: Date,
): AdminModerationOperationalAlertDTO => {
  const href = `/comunidades/${post.community.slug}/conteudo/post/${post.id}`;

  return {
    action_href: href,
    action_label: "Abrir post",
    age_hours: hoursSince(post.createdAt, now),
    community: communityDTO(post.community),
    created_at: post.createdAt,
    description: `Post de paciente publicado há ${humanAge(
      post.createdAt,
      now,
    )} ainda sem resposta de psicólogo. Trecho: ${compactText(post.content, 120)}`,
    entity: {
      href,
      id: post.id,
      label: post.title,
      type: "post",
    },
    facts: [
      { label: "Comunidade", value: post.community.name },
      { label: "Idade", value: humanAge(post.createdAt, now) },
      { label: "Respostas totais", value: String(post.replies_count) },
    ],
    group: "operacional",
    id: `uncovered-post-${post.id}`,
    priority: "medium",
    source: "community_post+post_reply+user.role",
    title: "Post de paciente sem cobertura há 48h",
    type: "patient_post_without_coverage",
  };
};

const buildPsychologistAlerts = (
  profiles: AdminOperationalPsychologistRecord[],
  profileViewCounts: Map<string, number>,
  whatsappClickCounts: Map<string, number>,
  now: Date,
) => {
  const alerts: AdminModerationOperationalAlertDTO[] = [];
  let professionalCrpPending = 0;
  let invalidWhatsapp = 0;
  let unpublishedRequiredSettings = 0;
  let psychologistNoTractionAfterAdaptation = 0;
  const adaptationCutoff = new Date(now.getTime() - PSYCHOLOGIST_ADAPTATION_DAYS * DAY_IN_MS);

  for (const profile of profiles) {
    const currentSubscription = pickCurrentSubscription(profile, now);
    if (!currentSubscription) continue;

    const name = psychologistLabel(profile);
    const href = `/psicologos/${profile.user_id}`;
    const isProfessional = isProfessionalSubscription(currentSubscription);
    const profileViews = profileViewCounts.get(profile.user_id) ?? 0;
    const whatsappClicks = whatsappClickCounts.get(profile.user_id) ?? 0;
    const currentPlanLabel = currentSubscription.plan.name || currentSubscription.plan.slug;

    if (isProfessional && !hasRegistryApproval(profile)) {
      professionalCrpPending += 1;
      alerts.push({
        action_href: href,
        action_label: "Abrir psicólogo",
        age_hours: hoursSince(profileStartedAt(currentSubscription), now),
        community: null,
        created_at: profileStartedAt(currentSubscription),
        description: `${name} possui Plano Profissional ativo sem CRP/CFP aprovado ou cortesia administrativa reconhecida.`,
        entity: {
          href,
          id: profile.user_id,
          label: name,
          type: "psychologist",
        },
        facts: [
          { label: "Plano", value: currentPlanLabel },
          { label: "Status CRP", value: profile.crp_status },
          { label: "Origem", value: currentSubscription.source },
          { label: "No plano há", value: humanAge(profileStartedAt(currentSubscription), now) },
        ],
        group: "compliance",
        id: `professional-crp-${profile.id}`,
        priority: "urgent",
        source: "psychologist_profile+professional_subscription",
        title: "CRP não aprovado no Plano Profissional",
        type: "professional_crp_pending",
      });
    }

    if (!hasValidWhatsapp(profile.whatsapp)) {
      invalidWhatsapp += 1;
      alerts.push({
        action_href: href,
        action_label: "Abrir psicólogo",
        age_hours: hoursSince(profile.updatedAt, now),
        community: null,
        created_at: profile.updatedAt,
        description:
          "O perfil não possui número suficiente para gerar link wa.me confiável. Esta checagem é sintática e não valida entrega externa do WhatsApp.",
        entity: {
          href,
          id: profile.user_id,
          label: name,
          type: "psychologist",
        },
        facts: [
          { label: "Plano", value: currentPlanLabel },
          { label: "WhatsApp", value: whatsappStatusLabel(profile.whatsapp) },
          { label: "Publicado", value: profile.published ? "sim" : "não" },
        ],
        group: "compliance",
        id: `invalid-whatsapp-${profile.id}`,
        priority: "high",
        source: "psychologist_profile.whatsapp",
        title: "WhatsApp ausente ou inválido",
        type: "invalid_whatsapp",
      });
    }

    const missingSettings = missingRequiredPublishingSettings(profile, currentSubscription);
    if (!profile.published && missingSettings.length > 0) {
      unpublishedRequiredSettings += 1;
      alerts.push({
        action_href: href,
        action_label: "Abrir psicólogo",
        age_hours: hoursSince(profile.updatedAt, now),
        community: null,
        created_at: profile.updatedAt,
        description: `Perfil não publicado por pendências obrigatórias: ${missingSettings
          .slice(0, 5)
          .join(", ")}${missingSettings.length > 5 ? "…" : "."}`,
        entity: {
          href,
          id: profile.user_id,
          label: name,
          type: "psychologist",
        },
        facts: [
          { label: "Plano", value: currentPlanLabel },
          { label: "Pendências", value: String(missingSettings.length) },
          { label: "Primeiras", value: missingSettings.slice(0, 3).join(", ") },
        ],
        group: "operacional",
        id: `unpublished-settings-${profile.id}`,
        priority: "medium",
        source: "psychologist_profile+catalog_relations",
        title: "Perfil não publicado por configurações obrigatórias",
        type: "unpublished_required_settings",
      });
    }

    if (
      isProfessional &&
      profile.published &&
      profileStartedAt(currentSubscription) <= adaptationCutoff &&
      profileViews === 0 &&
      whatsappClicks === 0
    ) {
      psychologistNoTractionAfterAdaptation += 1;
      alerts.push({
        action_href: href,
        action_label: "Abrir psicólogo",
        age_hours: hoursSince(profileStartedAt(currentSubscription), now),
        community: null,
        created_at: profileStartedAt(currentSubscription),
        description: `${name} está publicado no Plano Profissional há ${humanAge(
          profileStartedAt(currentSubscription),
          now,
        )} sem visitas de perfil e sem cliques no WhatsApp.`,
        entity: {
          href,
          id: profile.user_id,
          label: name,
          type: "psychologist",
        },
        facts: [
          { label: "Plano", value: currentPlanLabel },
          { label: "Visitas", value: String(profileViews) },
          { label: "Cliques WhatsApp", value: String(whatsappClicks) },
          { label: "Adaptação", value: `${PSYCHOLOGIST_ADAPTATION_DAYS} dias` },
        ],
        group: "operacional",
        id: `no-traction-${profile.id}`,
        priority: "medium",
        source: "professional_subscription+profile_view_event+contact_request",
        title: "Psicólogo sem tração após adaptação",
        type: "psychologist_no_traction",
      });
    }
  }

  return {
    alerts,
    counts: {
      invalidWhatsapp,
      professionalCrpPending,
      psychologistNoTractionAfterAdaptation,
      unpublishedRequiredSettings,
    },
  };
};

const sortOperationalAlertsByLatest = (
  left: AdminModerationOperationalAlertDTO,
  right: AdminModerationOperationalAlertDTO,
) => {
  const dateDelta = right.created_at.getTime() - left.created_at.getTime();
  if (dateDelta !== 0) return dateDelta;

  const priorityDelta = priorityWeight[left.priority] - priorityWeight[right.priority];
  if (priorityDelta !== 0) return priorityDelta;

  return left.id.localeCompare(right.id);
};

type BuildOperationalAlertsOptions = {
  itemLimit?: number;
};

type NormalizedOperationalAlertsQuery = Required<
  Pick<
    AdminModerationOperationalAlertsQuery,
    "alertType" | "contentType" | "group" | "reason" | "reporter" | "status"
  >
> &
  Pick<AdminModerationOperationalAlertsQuery, "from" | "limit" | "page" | "q" | "to">;

const buildOperationalAlerts = async (
  repository: AdminModerationRepository,
  options: BuildOperationalAlertsOptions = {},
): Promise<AdminModerationOperationalAlertsDTO> => {
  const now = new Date();
  const uncoveredCutoff = new Date(now.getTime() - POST_COVERAGE_HOURS * HOUR_IN_MS);
  const itemLimit = options.itemLimit;
  const [pendingReports, latestReports, uncoveredPostsCount, uncoveredPosts, psychologistProfiles] =
    await Promise.all([
      repository.countPendingPostReports(),
      repository.listPendingPostReports(itemLimit),
      repository.countUncoveredPatientPosts(uncoveredCutoff),
      repository.listUncoveredPatientPosts(uncoveredCutoff, itemLimit),
      repository.listOperationalPsychologistProfiles(),
    ]);
  const psychologistIds = psychologistProfiles.map((profile) => profile.user_id);
  const [profileViews, whatsappClicks] = await Promise.all([
    repository.countProfileViewsByPsychologist(psychologistIds),
    repository.countWhatsappClicksByPsychologist(psychologistIds),
  ]);
  const psychologistAlerts = buildPsychologistAlerts(
    psychologistProfiles,
    countMap(profileViews),
    countMap(whatsappClicks),
    now,
  );
  const reportAlerts = latestReports.map((report) => mapReportAlert(report, now));
  const uncoveredPostAlerts = uncoveredPosts.map((post) => mapUncoveredPatientPostAlert(post, now));
  const complianceTotal =
    psychologistAlerts.counts.professionalCrpPending + psychologistAlerts.counts.invalidWhatsapp;
  const operationalTotal =
    uncoveredPostsCount +
    psychologistAlerts.counts.unpublishedRequiredSettings +
    psychologistAlerts.counts.psychologistNoTractionAfterAdaptation;
  const urgentTotal = pendingReports + psychologistAlerts.counts.professionalCrpPending;
  const items = [...reportAlerts, ...uncoveredPostAlerts, ...psychologistAlerts.alerts].sort(
    sortOperationalAlertsByLatest,
  );

  return {
    counts: {
      compliance_total: complianceTotal,
      invalid_whatsapp: psychologistAlerts.counts.invalidWhatsapp,
      operational_total: operationalTotal,
      patient_posts_without_coverage_48h: uncoveredPostsCount,
      pending_reports: pendingReports,
      professional_crp_pending: psychologistAlerts.counts.professionalCrpPending,
      psychologist_no_traction_after_adaptation:
        psychologistAlerts.counts.psychologistNoTractionAfterAdaptation,
      total: pendingReports + complianceTotal + operationalTotal,
      unpublished_required_settings: psychologistAlerts.counts.unpublishedRequiredSettings,
      urgent_total: urgentTotal,
    },
    excluded_dimensions: excludedOperationalDimensions,
    items: typeof itemLimit === "number" ? items.slice(0, itemLimit) : items,
    source:
      "post_report+community_post+post_reply+psychologist_profile+professional_subscription+profile_view_event+contact_request",
    thresholds: {
      patient_post_without_coverage_hours: POST_COVERAGE_HOURS,
      psychologist_adaptation_days: PSYCHOLOGIST_ADAPTATION_DAYS,
    },
  };
};

const normalizeOperationalGroup = (
  value?: string | null,
): AdminModerationOperationalAlertsGroup => {
  const normalized = normalizeFilter(value);

  return normalized === "denuncias" || normalized === "compliance" || normalized === "operacional"
    ? normalized
    : "all";
};

const normalizeOperationalStatus = (
  value?: string | null,
): NonNullable<AdminModerationOperationalAlertsQuery["status"]> => {
  const normalized = normalizeFilter(value).toLowerCase();

  return normalized === "pending" || normalized === "upheld" || normalized === "dismissed"
    ? normalized
    : "all";
};

const normalizeOperationalContentType = (
  value?: string | null,
): NonNullable<AdminModerationOperationalAlertsQuery["contentType"]> => {
  const normalized = normalizeFilter(value).toLowerCase();

  return normalized === "post" || normalized === "reply" ? normalized : "all";
};

const normalizeOperationalAlertType = (
  value?: string | null,
): NonNullable<AdminModerationOperationalAlertsQuery["alertType"]> => {
  const normalized = normalizeFilter(value).toLowerCase();

  return normalized === "invalid_whatsapp" ||
    normalized === "patient_post_without_coverage" ||
    normalized === "post_report" ||
    normalized === "professional_crp_pending" ||
    normalized === "psychologist_no_traction" ||
    normalized === "unpublished_required_settings"
    ? normalized
    : "all";
};

const normalizeOperationalReporter = (
  value?: string | null,
): NonNullable<AdminModerationOperationalAlertsQuery["reporter"]> => {
  const normalized = normalizeFilter(value).toLowerCase();

  return normalized === "paciente" || normalized === "psicologo" ? normalized : "all";
};

const normalizeOperationalReason = (
  value?: string | null,
): NonNullable<AdminModerationOperationalAlertsQuery["reason"]> => {
  const normalized = normalizeFilter(value).toLowerCase();

  return normalized === "spam" ||
    normalized === "abuse" ||
    normalized === "self_harm" ||
    normalized === "privacy" ||
    normalized === "other"
    ? normalized
    : "all";
};

const parseOperationalDateOnly = (value: string | undefined, boundary: "end" | "start") => {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  if (Number.isNaN(date.getTime())) return null;

  if (boundary === "start") date.setHours(0, 0, 0, 0);
  else date.setHours(23, 59, 59, 999);

  return date;
};

const normalizedText = (value?: string | null) =>
  String(value ?? "")
    .trim()
    .toLowerCase();

const operationalFactValue = (alert: AdminModerationOperationalAlertDTO, label: string) =>
  alert.facts.find((fact) => normalizedText(fact.label) === normalizedText(label))?.value ?? "";

const operationalStatusAliases: Record<
  Exclude<NonNullable<AdminModerationOperationalAlertsQuery["status"]>, "all">,
  string[]
> = {
  dismissed: ["rejeitada", "rejected", "improcedente", "dismissed"],
  pending: ["pendente", "pending", "em_analise", "em analise", "in_review", "in review"],
  upheld: ["resolvida", "resolved", "procedente", "upheld"],
};

const operationalAlertMatchesSearch = (
  alert: AdminModerationOperationalAlertDTO,
  search: string,
) => {
  if (!search) return true;

  return [
    alert.action_label,
    alert.community?.name,
    alert.description,
    alert.entity.label,
    alert.priority,
    alert.source,
    alert.title,
    alert.type,
    ...alert.facts.flatMap((fact) => [fact.label, fact.value]),
  ]
    .filter(Boolean)
    .some((value) => normalizedText(value).includes(search));
};

const operationalAlertMatchesFilters = (
  alert: AdminModerationOperationalAlertDTO,
  query: NormalizedOperationalAlertsQuery,
) => {
  const search = normalizeSearch(query.q);
  if (!operationalAlertMatchesSearch(alert, search)) return false;

  const from = parseOperationalDateOnly(query.from, "start");
  const to = parseOperationalDateOnly(query.to, "end");
  if (from && alert.created_at < from) return false;
  if (to && alert.created_at > to) return false;

  if (query.alertType !== "all" && alert.type !== query.alertType) {
    return false;
  }

  if (query.contentType !== "all" && alert.report?.content.type !== query.contentType) {
    return false;
  }

  if (query.status !== "all") {
    const reportStatus = normalizedText(operationalFactValue(alert, "Status"));
    if (!operationalStatusAliases[query.status].includes(reportStatus)) return false;
  }

  if (query.reporter !== "all") {
    const reporter = normalizedText(operationalFactValue(alert, "Denunciante"));
    if (reporter !== query.reporter) return false;
  }

  if (query.reason !== "all") {
    const reason = normalizedText(operationalFactValue(alert, "Motivo"));
    const expectedLabel = normalizedText(postReportReasonLabel(query.reason));
    if (reason !== query.reason && reason !== expectedLabel) {
      return false;
    }
  }

  return true;
};

const operationalAlertMatchesGroup = (
  alert: AdminModerationOperationalAlertDTO,
  group: AdminModerationOperationalAlertsGroup,
) => {
  if (group === "all") return true;
  if (group === "operacional") return alert.group === "operacional";
  if (group === "compliance") return alert.group === "compliance";

  return alert.group === "denuncias";
};

const normalizeOperationalAlertsQuery = (
  query: AdminModerationOperationalAlertsQuery = {},
): NormalizedOperationalAlertsQuery => ({
  ...query,
  alertType: normalizeOperationalAlertType(query.alertType),
  contentType: normalizeOperationalContentType(query.contentType),
  group: normalizeOperationalGroup(query.group),
  reason: normalizeOperationalReason(query.reason),
  reporter: normalizeOperationalReporter(query.reporter),
  status: normalizeOperationalStatus(query.status),
});

const reportChartTypes = [
  "all",
  "patient_comments",
  "patient_posts",
  "psychologist_posts",
  "psychologist_replies",
] as const satisfies readonly AdminModerationReportChartType[];

const chartDateKey = (date: Date) => date.toISOString().slice(0, 10);

const incrementChartPoint = <T extends { date: string }>(
  map: Map<string, T>,
  date: Date,
  createPoint: (date: string) => T,
  key: string,
) => {
  const day = chartDateKey(date);
  const point = map.get(day) ?? createPoint(day);
  const writable = point as unknown as Record<string, number>;

  writable[key] = Number(writable[key] ?? 0) + 1;
  map.set(day, point);
};

const sortChartPoints = <T extends { date: string }>(map: Map<string, T>) =>
  [...map.values()].sort((left, right) => left.date.localeCompare(right.date));

const createReportChartPoint = (date: string) => ({
  date,
  dismissed: 0,
  pending: 0,
  upheld: 0,
});

const createComplianceChartPoint = (date: string) => ({
  date,
  invalid_whatsapp: 0,
  professional_crp_pending: 0,
});

const createOperationalChartPoint = (date: string) => ({
  date,
  patient_posts_without_coverage_48h: 0,
  psychologist_no_traction_after_adaptation: 0,
  unpublished_required_settings: 0,
});

const createSensitiveContentChartPoint = (date: string) => ({
  allow_sensitive: 0,
  block: 0,
  date,
  safety_hold: 0,
});

const reportChartType = (report: AdminPostReportRecord): AdminModerationReportChartType => {
  const author = reportAuthor(report);

  if (report.reply) {
    return author.role === "psicologo" ? "psychologist_replies" : "patient_comments";
  }

  return author.role === "psicologo" ? "psychologist_posts" : "patient_posts";
};

const buildReportOverviewCharts = (reports: AdminPostReportRecord[]) => {
  const maps = Object.fromEntries(reportChartTypes.map((type) => [type, new Map()])) as Record<
    AdminModerationReportChartType,
    Map<string, ReturnType<typeof createReportChartPoint>>
  >;

  for (const report of reports) {
    const status = postReportStatusGroup(report.status);
    for (const type of ["all", reportChartType(report)] as const) {
      incrementChartPoint(maps[type], report.createdAt, createReportChartPoint, status);
    }
  }

  return Object.fromEntries(
    reportChartTypes.map((type) => [type, { points: sortChartPoints(maps[type]) }]),
  ) as AdminModerationOverviewChartsDTO["reports"];
};

const buildAlertOverviewCharts = (alerts: AdminModerationOperationalAlertDTO[]) => {
  const compliance = new Map<string, ReturnType<typeof createComplianceChartPoint>>();
  const operational = new Map<string, ReturnType<typeof createOperationalChartPoint>>();

  for (const alert of alerts) {
    if (alert.type === "professional_crp_pending" || alert.type === "invalid_whatsapp") {
      incrementChartPoint(compliance, alert.created_at, createComplianceChartPoint, alert.type);
      continue;
    }

    if (alert.type === "patient_post_without_coverage") {
      incrementChartPoint(
        operational,
        alert.created_at,
        createOperationalChartPoint,
        "patient_posts_without_coverage_48h",
      );
      continue;
    }

    if (alert.type === "unpublished_required_settings") {
      incrementChartPoint(
        operational,
        alert.created_at,
        createOperationalChartPoint,
        "unpublished_required_settings",
      );
      continue;
    }

    if (alert.type === "psychologist_no_traction") {
      incrementChartPoint(
        operational,
        alert.created_at,
        createOperationalChartPoint,
        "psychologist_no_traction_after_adaptation",
      );
    }
  }

  return {
    compliance: { points: sortChartPoints(compliance) },
    operational: { points: sortChartPoints(operational) },
  };
};

const buildSensitiveContentOverviewCharts = (events: AdminModerationEventRecord[]) => {
  const byCategory = new Map<
    string,
    Map<string, ReturnType<typeof createSensitiveContentChartPoint>>
  >();
  const ensureCategoryMap = (category: string) => {
    const existing = byCategory.get(category);
    if (existing) return existing;

    const created = new Map<string, ReturnType<typeof createSensitiveContentChartPoint>>();
    byCategory.set(category, created);

    return created;
  };

  for (const event of events) {
    if (
      event.decision !== "allow_sensitive" &&
      event.decision !== "block" &&
      event.decision !== "safety_hold"
    ) {
      continue;
    }

    const categories = toStringArray(event.categories);
    const categoryIds = categories.length > 0 ? categories : ["other"];

    for (const category of ["all", ...categoryIds]) {
      incrementChartPoint(
        ensureCategoryMap(category),
        event.createdAt,
        createSensitiveContentChartPoint,
        event.decision,
      );
    }
  }

  const categories = [...byCategory.keys()].sort((left, right) => {
    if (left === "all") return -1;
    if (right === "all") return 1;

    return left.localeCompare(right);
  });
  const categoryEntries = categories.map((category) => [
    category,
    { points: sortChartPoints(ensureCategoryMap(category)) },
  ]);

  return {
    by_category: Object.fromEntries(categoryEntries),
    categories,
  };
};

const buildOverviewCharts = (
  events: AdminModerationEventRecord[],
  reports: AdminPostReportRecord[],
  operationalAlerts: AdminModerationOperationalAlertsDTO,
): AdminModerationOverviewChartsDTO => {
  const alertCharts = buildAlertOverviewCharts(operationalAlerts.items);

  return {
    compliance: alertCharts.compliance,
    content_sensitive: buildSensitiveContentOverviewCharts(events),
    operational: alertCharts.operational,
    reports: buildReportOverviewCharts(reports),
  };
};

export const getSummary = async (_data: IAdminModerationSummaryDTO): Promise<Resolve> => {
  const repository = new AdminModerationRepository();
  const [allEvents, latestPending, pendingTotal, urgentPendingTotal, operationalAlerts, reports] =
    await Promise.all([
      repository.listEvents({}),
      repository.listLatestPending(5),
      repository.countPending(),
      repository.countUrgentPending(),
      buildOperationalAlerts(repository),
      repository.listPostReports(),
    ]);
  const limitedOperationalAlerts: AdminModerationOperationalAlertsDTO = {
    ...operationalAlerts,
    items: operationalAlerts.items.slice(0, OPERATIONAL_ALERT_LIMIT),
  };
  const replyMap = await hydrateReplyTargets(latestPending);
  const summary: AdminModerationSummaryDTO = {
    by_category: countBy(allEvents, (event) => toStringArray(event.categories)),
    by_decision: countBy(allEvents, (event) => [event.decision]),
    by_severity: countBy(allEvents, (event) => [event.severity]),
    by_status: countBy(allEvents, (event) => [event.status]),
    latest_pending: latestPending.map((event) => mapEvent(event, replyMap)),
    operational_alerts: limitedOperationalAlerts,
    overview_charts: buildOverviewCharts(allEvents, reports, operationalAlerts),
    pending_total: pendingTotal,
    source: "content_moderation_event",
    urgent_pending_total: urgentPendingTotal,
  };

  return {
    status: 200,
    ...msg("index", {}),
    data: summary,
  };
};

export const listOperationalAlerts = async (
  data: IAdminModerationOperationalAlertsDTO,
): Promise<Resolve> => {
  const repository = new AdminModerationRepository();
  const query = normalizeOperationalAlertsQuery(data.q ?? {});
  const page = normalizePage(query.page);
  const limit = normalizeLimit(query.limit);
  const group = query.group;
  const operationalAlerts = await buildOperationalAlerts(repository);
  const baseItems =
    group === "denuncias"
      ? (await repository.listPostReports()).map((report) => mapReportAlert(report, new Date()))
      : operationalAlerts.items;
  const items = baseItems
    .sort(sortOperationalAlertsByLatest)
    .filter((alert) => operationalAlertMatchesGroup(alert, group))
    .filter((alert) => operationalAlertMatchesFilters(alert, query));
  const paginated = paginate(items, page, limit);
  const payload: AdminModerationOperationalAlertsPageDTO = {
    ...paginated,
    counts: operationalAlerts.counts,
    excluded_dimensions: operationalAlerts.excluded_dimensions,
    group,
    source: operationalAlerts.source,
    thresholds: operationalAlerts.thresholds,
  };

  return {
    status: 200,
    ...msg("index", {}),
    data: payload,
  };
};

export const listEvents = async (data: IAdminModerationEventsDTO): Promise<Resolve> => {
  const repository = new AdminModerationRepository();
  const query = normalizeQuery(data.q ?? {});
  const page = normalizePage(query.page);
  const limit = normalizeLimit(query.limit);
  const category = normalizeFilter(query.category);
  const search = normalizeSearch(query.q);
  const records = await repository.listEvents(query);
  const replyMap = await hydrateReplyTargets(records);
  const items = records
    .filter((event) => eventMatchesCategory(event, category))
    .map((event) => mapEvent(event, replyMap))
    .filter((event) => eventMatchesSearch(event, search));
  const paginated = paginate(items, page, limit);
  const payload: AdminModerationEventsDTO = {
    ...paginated,
    source: "content_moderation_event",
  };

  return {
    status: 200,
    ...msg("index", {}),
    data: payload,
  };
};

export const showEvent = async (data: IAdminModerationEventDTO): Promise<Resolve> => {
  const repository = new AdminModerationRepository();
  const event = await repository.findEvent(data.p.id);
  if (!event) {
    return {
      status: 404,
      ...error("admin_moderation_event_not_found", {}),
    };
  }

  const replyMap = await hydrateReplyTargets([event]);

  return {
    status: 200,
    ...msg("show", {}),
    data: mapEventDetail(event, replyMap),
  };
};

export const reviewEvent = async (data: IAdminModerationEventDTO): Promise<Resolve> => {
  const admin = data.admin ?? data.auth;
  if (!admin?.id) {
    return {
      status: 401,
      ...error("token_not_authorized", {}),
    };
  }

  const repository = new AdminModerationRepository();
  const event = await repository.markReviewing(data.p.id, admin.id);
  if (!event) {
    return {
      status: 404,
      ...error("admin_moderation_event_not_found", {}),
    };
  }

  const replyMap = await hydrateReplyTargets([event]);

  return {
    status: 200,
    ...msg("admin_moderation_event_reviewed", {}),
    data: mapEventDetail(event, replyMap),
  };
};

export const resolveEvent = async (data: IAdminModerationResolveDTO): Promise<Resolve> => {
  const admin = data.admin ?? data.auth;
  const note = data.b.note?.trim();
  if (!admin?.id) {
    return {
      status: 401,
      ...error("token_not_authorized", {}),
    };
  }
  if (!note) {
    return {
      status: 422,
      ...error("admin_moderation_event_resolve_note_required", {}),
    };
  }

  const repository = new AdminModerationRepository();
  const event = await repository.resolveEvent(data.p.id, { adminId: admin.id, note });
  if (!event) {
    return {
      status: 404,
      ...error("admin_moderation_event_not_found", {}),
    };
  }

  const replyMap = await hydrateReplyTargets([event]);

  return {
    status: 200,
    ...msg("admin_moderation_event_resolved", {}),
    data: mapEventDetail(event, replyMap),
  };
};

export const resolveReport = async (data: IAdminModerationReportResolveDTO): Promise<Resolve> => {
  const admin = data.admin ?? data.auth;
  if (!admin?.id) {
    return {
      status: 401,
      ...error("token_not_authorized", {}),
    };
  }

  const reason = data.b.reason?.trim();
  if (!reason) {
    return {
      status: 422,
      ...error("admin_moderation_report_reason_required", {}),
    };
  }

  const requestedStatus = reportResolveStatusFromResolution(data.b.resolution);
  if (!requestedStatus) return invalidReportStatus();

  const repository = new AdminModerationRepository();
  const report = await repository.findPostReport(data.p.reportId);
  if (!report) {
    return {
      status: 404,
      ...error("admin_moderation_report_not_found", {}),
    };
  }

  if (postReportStatusGroup(report.status) !== "pending") return invalidReportStatus();

  if (data.b.resolution === "dismissed") {
    if (!dismissConfirmationIsValid(data.b.confirmation)) {
      return {
        status: 400,
        ...error("admin_moderation_report_dismiss_confirmation_invalid", {}),
      };
    }

    const result = await repository.resolveReportDismissed({
      audit: createReportAudit({
        action: "moderation_report_dismissed",
        adminId: admin.id,
        changedFields: ["Status da denuncia"],
        metadata: {
          resolution: "dismissed",
        },
        reason,
        report,
        safeAfter: {
          "Status da denuncia": "Improcedente",
          ...safeReportTargetSummary(report),
        },
      }),
      report,
    });

    return {
      status: 200,
      ...msg("admin_moderation_report_dismissed", {}),
      data: reportActionResponse(result),
    };
  }

  if (data.b.resolution !== "upheld") return invalidReportStatus();

  if (!upholdConfirmationIsValid(data.b.confirmation)) {
    return {
      status: 400,
      ...error("admin_moderation_report_uphold_confirmation_invalid", {}),
    };
  }

  const measure = data.b.measure === "remove_content" ? "remove_content" : "none";
  const result = await repository.resolveReportUpheld({
    audit: createReportAudit({
      action:
        measure === "remove_content"
          ? "moderation_report_content_removed"
          : "moderation_report_upheld",
      adminId: admin.id,
      changedFields:
        measure === "remove_content"
          ? ["Status da denuncia", "Conteudo denunciado"]
          : ["Status da denuncia"],
      metadata: {
        measure,
        resolution: "upheld",
        requested_status: requestedStatus,
      },
      reason,
      report,
      safeAfter: {
        "Medida aplicada":
          measure === "remove_content" ? "Remover conteudo denunciado" : "Manter conteudo",
        "Status da denuncia": "Procedente",
        ...safeReportTargetSummary(report),
      },
    }),
    measure,
    report,
  });

  return {
    status: 200,
    ...msg(
      result.contentRemoved
        ? "admin_moderation_report_content_removed"
        : "admin_moderation_report_upheld",
      {},
    ),
    data: reportActionResponse(result),
  };
};
