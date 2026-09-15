import { buildProfessionalFullDisplayName } from "@/utils/professional-name";
import { hasProfessionalRegistryApproval } from "@/utils/subscription-entitlement";
import type {
  AdminModerationAuthorDTO,
  AdminModerationEventDetailDTO,
  AdminModerationEventItemDTO,
  AdminModerationEventsQuery,
} from "../../DTOs/IAdminModerationDTO";
import { AdminModerationRepository } from "../../repositories/AdminModerationRepository";
import type {
  AdminModerationEventDetailRecord,
  AdminModerationEventRecord,
  ReplyTargetRecord,
} from "../../repositories/interfaces/IAdminModerationRepository";

export const DEFAULT_PAGE = 1;

export const DEFAULT_LIMIT = 10;

export const MAX_LIMIT = 50;

export const OPERATIONAL_ALERT_LIMIT = 50;

export const POST_COVERAGE_HOURS = 48;

export const PSYCHOLOGIST_ADAPTATION_DAYS = 30;

export const HOUR_IN_MS = 60 * 60 * 1000;

export const DAY_IN_MS = 24 * HOUR_IN_MS;

export const COMMUNITY_ENGAGEMENT_SCORE_WEIGHTS = {
  posts: 3,
  replies: 2,
  saves: 1,
  shares: 1,
  votes: 1,
} as const;

export const COMMUNITY_ENGAGEMENT_LABELS = {
  active: "Ativo",
  low: "Pouco ativo",
  none: "Sem atividade previa",
  very_active: "Muito ativo",
} as const;

export const DISMISS_REPORT_CONFIRMATION = "DENUNCIA IMPROCEDENTE";

export const UPHOLD_REPORT_CONFIRMATION = "DENUNCIA PROCEDENTE";

export const toStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];

  return value.filter((item): item is string => typeof item === "string");
};

export const normalizePage = (value?: number) =>
  Math.max(DEFAULT_PAGE, Number(value || DEFAULT_PAGE));

export const normalizeLimit = (value?: number) =>
  Math.min(MAX_LIMIT, Math.max(1, Number(value || DEFAULT_LIMIT)));

export const normalizeSearch = (value?: string | null) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

export const normalizeFilter = (value?: string | null) => value?.trim() || "all";

export const paginate = <T>(items: T[], page: number, limit: number) => {
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

export const authorPublicLabel = (
  event: AdminModerationEventRecord | AdminModerationEventDetailRecord,
) => {
  if (event.author.role === "paciente") return "Paciente";
  if (event.author.role === "psicologo") return event.author.name;

  return "Usuário";
};

export const authorAdminName = (
  event: AdminModerationEventRecord | AdminModerationEventDetailRecord,
) => {
  if (event.author.role === "psicologo") {
    return buildProfessionalFullDisplayName({
      fallbackName: event.author.name,
      firstName: event.author.psychologist_profile?.professional_first_name,
      lastName: event.author.psychologist_profile?.professional_last_name,
    });
  }

  return event.author.name.trim() || "Usuário";
};

export const authorRoleLabel = (
  event: AdminModerationEventRecord | AdminModerationEventDetailRecord,
) => {
  if (event.author.role === "paciente") return "Paciente";

  if (event.author.role === "psicologo") {
    const gender = event.author.psychologist_profile?.gender?.trim().toLowerCase();

    return gender === "feminino" || gender === "mulher" ? "Psicóloga" : "Psicólogo";
  }

  return "Usuário";
};

export const showAuthorVerifiedBadge = (
  event: AdminModerationEventRecord | AdminModerationEventDetailRecord,
) =>
  event.author.role === "psicologo" &&
  hasProfessionalRegistryApproval(event.author.psychologist_profile);

export const mapEventAuthor = (
  event: AdminModerationEventRecord | AdminModerationEventDetailRecord,
  options: { includeAdminLabel?: boolean } = {},
): AdminModerationAuthorDTO => {
  const name = authorAdminName(event);

  return {
    ...(options.includeAdminLabel ? { admin_label: name } : {}),
    id: event.author.id,
    name,
    public_label: authorPublicLabel(event),
    role: event.author.role,
    role_label: authorRoleLabel(event),
    show_verified_badge: showAuthorVerifiedBadge(event),
  };
};

export const createReplyMap = (replies: ReplyTargetRecord[]) => {
  const map = new Map<string, ReplyTargetRecord>();
  for (const reply of replies) map.set(reply.id, reply);

  return map;
};

export const buildPublicUrl = (
  event: AdminModerationEventRecord | AdminModerationEventDetailRecord,
  replies: Map<string, ReplyTargetRecord>,
) => {
  if (!event.target_id) return null;
  if (event.decision !== "allow_sensitive") return null;

  if (event.target_type === "community_post" && event.community?.slug) {
    return `/comunidades/${event.community.slug}/publicacao/${event.target_id}`;
  }

  if (event.target_type === "post_reply") {
    const reply = replies.get(event.target_id);
    if (!reply) return null;

    return `/comunidades/${reply.post.community.slug}/publicacao/${reply.post_id}/resposta/${event.target_id}`;
  }

  return null;
};

export const buildAdminContentUrl = (
  event: AdminModerationEventRecord | AdminModerationEventDetailRecord,
  replies: Map<string, ReplyTargetRecord>,
) => {
  if (!event.target_id) return null;

  if (event.target_type === "community_post" && event.community?.slug) {
    return `/comunidades/${event.community.slug}/conteudo/post/${event.target_id}`;
  }

  if (event.target_type === "post_reply") {
    const reply = replies.get(event.target_id);
    if (!reply) return null;

    return `/comunidades/${reply.post.community.slug}/conteudo/comment/${event.target_id}`;
  }

  return null;
};

export const mapEvent = (
  event: AdminModerationEventRecord,
  replies: Map<string, ReplyTargetRecord>,
): AdminModerationEventItemDTO => ({
  admin_content_url: buildAdminContentUrl(event, replies),
  author: mapEventAuthor(event),
  blocked_before_publication:
    !event.target_id || event.decision === "block" || event.decision === "safety_hold",
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

export const mapEventDetail = (
  event: AdminModerationEventDetailRecord,
  replies: Map<string, ReplyTargetRecord>,
): AdminModerationEventDetailDTO => ({
  ...mapEvent(event, replies),
  admin_note: event.admin_note,
  author: mapEventAuthor(event, { includeAdminLabel: true }),
  content_snapshot: event.content_snapshot,
  reviewed_by_admin_id: event.reviewed_by_admin_id,
});

export const hydrateReplyTargets = async (
  events: (AdminModerationEventDetailRecord | AdminModerationEventRecord)[],
) => {
  const replyIds = events
    .filter((event) => event.target_type === "post_reply" && event.target_id)
    .map((event) => event.target_id as string);

  const repository = new AdminModerationRepository();
  return createReplyMap(await repository.listReplyTargets([...new Set(replyIds)]));
};

export const eventMatchesCategory = (event: AdminModerationEventRecord, category: string) => {
  if (category === "all") return true;

  return toStringArray(event.categories).includes(category);
};

export const eventMatchesSearch = (event: AdminModerationEventItemDTO, search: string) => {
  if (!search) return true;

  return [
    event.author.name,
    event.author.public_label,
    event.author.role_label,
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

export const countBy = (
  events: AdminModerationEventRecord[],
  selector: (event: AdminModerationEventRecord) => string[],
) => {
  const output: Record<string, number> = {};
  for (const event of events) {
    for (const key of selector(event)) output[key] = (output[key] ?? 0) + 1;
  }

  return output;
};

export const normalizeQuery = (
  query: AdminModerationEventsQuery = {},
): AdminModerationEventsQuery => ({
  ...query,
  category: normalizeFilter(query.category),
  community: normalizeFilter(query.community),
  decision: normalizeFilter(query.decision) as AdminModerationEventsQuery["decision"],
  severity: normalizeFilter(query.severity) as AdminModerationEventsQuery["severity"],
  status: normalizeFilter(query.status) as AdminModerationEventsQuery["status"],
  targetType: normalizeFilter(query.targetType) as AdminModerationEventsQuery["targetType"],
});
