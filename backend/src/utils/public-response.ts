export type PublicProvenanceSource =
  | "contas"
  | "conteudo"
  | "engajamento"
  | "pagamentos"
  | "plataforma";

const SOURCE_GROUPS = {
  contas: [
    "admin_activity_log",
    "patient_profile",
    "psychologist_profile",
    "psychologist_approach",
    "psychologist_service",
    "psychologist_specialty",
    "user_background",
    "user_token",
  ],
  conteudo: [
    "community",
    "community_member",
    "community_mentor_ranking",
    "community_post",
    "content_attention_session",
    "content_moderation_event",
    "content_video_watch_session",
    "post_reply",
    "post_reply_save",
    "post_report",
    "post_save",
    "post_share",
    "post_vote",
    "professional_review",
    "verified_responses",
  ],
  engajamento: [
    "contact_request",
    "important_action_event",
    "page_view_event",
    "profile_video_watch_session",
    "profile_view_event",
    "profile_events",
    "psychologist_favorite",
    "psychologist_follow",
    "visitor_location",
    "visitor_session",
    "traffic_origin_events",
  ],
  pagamentos: [
    "admin_grant_service",
    "payment_event",
    "payment_method",
    "professional_subscription",
    "subscription_plan",
  ],
} as const;

const TECHNICAL_OPERATOR_PATTERN = /[+./:=<>|*]/;
const OTHER_TECHNICAL_SOURCE_PATTERN =
  /^(?:active_(?:paid_)?subscriptions?|active_subscription_estimate|admin_.+_v\d+|bucket_\d+_percent|cancelled_paid_subscriptions?|domain_events|shared_.+_helper)$/i;

const SIMPLE_TECHNICAL_SOURCES: Record<string, PublicProvenanceSource> = {
  admin_panel: "plataforma",
  google_registration: "contas",
  patient_registration: "contas",
  psychologist_registration: "contas",
  visitor_id: "engajamento",
};

const containsToken = (source: string, token: string) => {
  const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const boundary = token === "user" ? "[^a-z0-9_]" : "[^a-z0-9]";
  return new RegExp(`(^|${boundary})${escaped}(${boundary}|$)`, "i").test(source);
};

export const sanitizePublicProvenanceSource = (value: unknown): unknown => {
  if (typeof value !== "string") return value;

  const source = value.trim();
  if (!source) return source;

  const simpleSource = SIMPLE_TECHNICAL_SOURCES[source.toLowerCase()];
  if (simpleSource) return simpleSource;

  const matchedGroups = (
    Object.entries(SOURCE_GROUPS) as Array<
      [Exclude<PublicProvenanceSource, "plataforma">, readonly string[]]
    >
  )
    .filter(([, tokens]) => tokens.some((token) => containsToken(source, token)))
    .map(([group]) => group);

  // `user` sozinho ou em expressões também representa a tabela, mas palavras
  // de domínio como `user_generated` devem continuar intactas.
  if (containsToken(source, "user")) matchedGroups.push("contas");

  const groups = [...new Set(matchedGroups)];
  if (groups.length === 1) return groups[0];
  if (
    groups.length > 1 ||
    TECHNICAL_OPERATOR_PATTERN.test(source) ||
    OTHER_TECHNICAL_SOURCE_PATTERN.test(source)
  ) {
    return "plataforma";
  }

  return value;
};

export const sanitizePublicResponseData = <T = unknown>(value: T): T => {
  const seen = new WeakSet<object>();

  const visit = (entry: unknown): unknown => {
    if (entry === null || entry === undefined || typeof entry !== "object") return entry;
    if (entry instanceof Date || entry instanceof Buffer) return entry;
    if (seen.has(entry)) return "[REDACTED]";
    seen.add(entry);

    if (Array.isArray(entry)) return entry.map(visit);

    const sanitized: Record<string, unknown> = {};
    for (const [key, entryValue] of Object.entries(entry)) {
      sanitized[key] =
        key.toLowerCase() === "source"
          ? sanitizePublicProvenanceSource(entryValue)
          : visit(entryValue);
    }

    return sanitized;
  };

  return visit(value) as T;
};
