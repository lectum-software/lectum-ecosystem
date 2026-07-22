import type { Prisma } from "@/external/generated/prisma/client";

export const NOTIFICATION_MESSAGE_KEYS = [
  "nova_avaliacao",
  "novo_favorito",
  "visualizacao_perfil",
  "clique_whatsapp",
  "novo_post",
  "nova_resposta",
  "upvote",
  "downvote",
  "compartilhamento",
  "salvamento",
  "admin_campaign",
] as const;

export type NotificationMessageKey = (typeof NOTIFICATION_MESSAGE_KEYS)[number];
export type NotificationUserRole = "paciente" | "psicologo" | string | null | undefined;
export type NewPostAuthorScope = "patients_only" | "professionals_only" | "all" | "favorites";

export type NotificationPreferenceEntry = {
  email?: boolean;
  enabled?: boolean;
  in_app?: boolean;
  push?: boolean;
  post_author_scope?: NewPostAuthorScope;
};

export type NotificationPrefs = Record<string, NotificationPreferenceEntry>;

const SWITCH_NOTIFICATION_KEYS = NOTIFICATION_MESSAGE_KEYS.filter((key) => key !== "novo_post");

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === "object" && !Array.isArray(value));

export const defaultNewPostAuthorScope = (role: NotificationUserRole): NewPostAuthorScope =>
  role === "psicologo" ? "patients_only" : "all";

const normalizeEnabled = (entry: Record<string, unknown> | undefined) => {
  if (!entry) return true;
  if (typeof entry.enabled === "boolean") return entry.enabled;
  if (entry.in_app === false && entry.push === false && entry.email !== true) return false;
  return true;
};

const isNewPostDisabledByScope = (
  entry: { author_scope?: unknown; post_author_scope?: unknown } | undefined,
) => (entry?.post_author_scope ?? entry?.author_scope) === "disabled";

const normalizeNewPostAuthorScope = (
  value: unknown,
  role: NotificationUserRole,
): NewPostAuthorScope => {
  if (role === "paciente") {
    if (value === "favorites") return "favorites";
    if (value === "all" || value === "professionals_only") return "all";

    return defaultNewPostAuthorScope(role);
  }

  if (role === "psicologo") {
    if (value === "patients_only" || value === "all") return value;

    return defaultNewPostAuthorScope(role);
  }

  if (
    value === "patients_only" ||
    value === "professionals_only" ||
    value === "all" ||
    value === "favorites"
  ) {
    return value;
  }

  return defaultNewPostAuthorScope(role);
};

export const normalizeNotificationPrefs = (
  prefs: unknown,
  role: NotificationUserRole,
): NotificationPrefs => {
  const source = isRecord(prefs) ? prefs : {};
  const normalized: NotificationPrefs = {};

  for (const key of SWITCH_NOTIFICATION_KEYS) {
    const entry = isRecord(source[key]) ? source[key] : undefined;
    normalized[key] = {
      enabled: normalizeEnabled(entry),
    };
  }

  const newPostEntry = isRecord(source.novo_post) ? source.novo_post : undefined;
  normalized.novo_post = {
    enabled: isNewPostDisabledByScope(newPostEntry) ? false : normalizeEnabled(newPostEntry),
    post_author_scope: normalizeNewPostAuthorScope(
      newPostEntry?.post_author_scope ?? newPostEntry?.author_scope,
      role,
    ),
  };

  return normalized;
};

export const normalizeNotificationPrefsForJson = (
  prefs: unknown,
  role: NotificationUserRole,
): Prisma.InputJsonValue => normalizeNotificationPrefs(prefs, role) as Prisma.InputJsonValue;

export const isChannelAllowed = (
  prefs: unknown,
  key: string,
  channel: keyof Pick<NotificationPreferenceEntry, "email" | "in_app" | "push">,
) => {
  if (!isRecord(prefs)) return true;

  const entry = isRecord(prefs[key]) ? (prefs[key] as NotificationPreferenceEntry) : undefined;
  if (!entry) return true;

  if (key === "novo_post" && isNewPostDisabledByScope(entry)) return false;

  if (typeof entry.enabled === "boolean") return entry.enabled;

  return entry[channel] !== false;
};

export const isNotificationEnabled = (prefs: unknown, key: string) => {
  if (!isRecord(prefs)) return true;

  const entry = isRecord(prefs[key]) ? (prefs[key] as NotificationPreferenceEntry) : undefined;
  if (!entry) return true;

  if (key === "novo_post" && isNewPostDisabledByScope(entry)) return false;

  return normalizeEnabled(entry);
};

export const getNewPostAuthorScope = (
  prefs: unknown,
  recipientRole: NotificationUserRole,
): NewPostAuthorScope => {
  if (!isRecord(prefs)) return defaultNewPostAuthorScope(recipientRole);

  const entry = isRecord(prefs.novo_post) ? prefs.novo_post : undefined;
  return normalizeNewPostAuthorScope(
    entry?.post_author_scope ?? entry?.author_scope,
    recipientRole,
  );
};

export const shouldReceiveNewPostNotification = (params: {
  authorRole: NotificationUserRole;
  isFavoritePsychologistAuthor?: boolean;
  prefs: unknown;
  recipientRole: NotificationUserRole;
}) => {
  if (!isNotificationEnabled(params.prefs, "novo_post")) return false;

  const scope = getNewPostAuthorScope(params.prefs, params.recipientRole);
  if (scope === "favorites") {
    return params.authorRole === "psicologo" && params.isFavoritePsychologistAuthor === true;
  }

  if (scope === "all") {
    return params.recipientRole === "paciente" ? params.authorRole === "psicologo" : true;
  }
  if (scope === "patients_only") return params.authorRole === "paciente";
  if (scope === "professionals_only") return params.authorRole === "psicologo";

  return true;
};
