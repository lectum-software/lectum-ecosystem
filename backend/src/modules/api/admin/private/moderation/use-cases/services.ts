import type { Resolve } from "@/helpers/return";
import { error, msg } from "@/helpers/translate";
import type {
  AdminModerationEventDetailDTO,
  AdminModerationEventItemDTO,
  AdminModerationEventsDTO,
  AdminModerationEventsQuery,
  AdminModerationSummaryDTO,
  IAdminModerationEventDTO,
  IAdminModerationEventsDTO,
  IAdminModerationResolveDTO,
  IAdminModerationSummaryDTO,
} from "../DTOs/IAdminModerationDTO";
import { AdminModerationRepository } from "../repositories/AdminModerationRepository";
import type {
  AdminModerationEventDetailRecord,
  AdminModerationEventRecord,
  ReplyTargetRecord,
} from "../repositories/interfaces/IAdminModerationRepository";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

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

export const getSummary = async (_data: IAdminModerationSummaryDTO): Promise<Resolve> => {
  const repository = new AdminModerationRepository();
  const [allEvents, latestPending, pendingTotal, urgentPendingTotal] = await Promise.all([
    repository.listEvents({}),
    repository.listLatestPending(5),
    repository.countPending(),
    repository.countUrgentPending(),
  ]);
  const replyMap = await hydrateReplyTargets(latestPending);
  const summary: AdminModerationSummaryDTO = {
    by_category: countBy(allEvents, (event) => toStringArray(event.categories)),
    by_decision: countBy(allEvents, (event) => [event.decision]),
    by_severity: countBy(allEvents, (event) => [event.severity]),
    by_status: countBy(allEvents, (event) => [event.status]),
    latest_pending: latestPending.map((event) => mapEvent(event, replyMap)),
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
