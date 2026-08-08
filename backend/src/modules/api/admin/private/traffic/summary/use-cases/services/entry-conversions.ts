import type { AdminTrafficEntryPage } from "../../DTOs/IAdminTrafficSummaryDTO";
import type { TrafficPageViewRecord } from "../../repositories/interfaces/IAdminTrafficRepository";

import {
  entryPageViews,
  metric,
  pwaInstalls,
  safePercentage,
  sessionKey,
  type TrafficStats,
} from "./overview";

export const pathLabel = (path: string) => {
  const normalized = path || "/";
  if (normalized === "/") return "Página inicial";
  if (normalized === "/auth/login" || normalized === "/login") return "Login";
  if (normalized === "/auth/register/psychologist" || normalized === "/register/psychologist")
    return "Cadastro de psicólogo";
  if (normalized === "/auth/register/patient" || normalized === "/register/patient")
    return "Cadastro de paciente";
  if (normalized === "/auth/register" || normalized === "/register") return "Cadastro";
  if (normalized.includes("signup/psychologist")) return "Cadastro de psicólogo";
  if (normalized.includes("signup/patient")) return "Cadastro de paciente";
  if (normalized.includes("cadastro") || normalized.includes("signup")) return "Cadastro";
  if (normalized === "/psicologos" || normalized === "/psychologists")
    return "Página de Psicólogos";
  if (normalized.startsWith("/psicologos/") || normalized.startsWith("/psychologists/"))
    return "Perfil de Psicólogo";
  if (
    normalized === "/comunidades" ||
    normalized === "/comunidades/feed" ||
    normalized === "/community" ||
    normalized === "/community/feed"
  )
    return "Comunidades";
  if (
    (normalized.startsWith("/comunidades/") && normalized.includes("/publicacao/")) ||
    (normalized.startsWith("/community/") && normalized.includes("/post/"))
  )
    return "Post específico";
  if (normalized.startsWith("/comunidades/") || normalized.startsWith("/community/"))
    return "Comunidade";

  return normalized;
};

export const ENTRY_PAGE_GROUPS = {
  communities: {
    id: "entry_group:communities",
    label: "Comunidades",
    path: "/comunidades/*",
  },
  communityPosts: {
    id: "entry_group:community_posts",
    label: "Posts",
    path: "/comunidades/*/publicacao/*",
  },
  psychologistProfiles: {
    id: "entry_group:psychologist_profiles",
    label: "Perfis de psicólogos",
    path: "/psicologos/*",
  },
} as const;

export const NON_COMMUNITY_DETAIL_SEGMENTS = new Set([
  "feed",
  "suggest",
  "top-mentors",
  "top-mentores",
]);

export const entryPath = (entry: TrafficPageViewRecord) => entry.entry_path || entry.path || "/";

export const pathSegments = (path: string) => (path || "/").split("/").filter(Boolean);

export const communitySlugFromPath = (path: string) => {
  const [first, second, third] = pathSegments(path);
  if (first === "community" || first === "comunidades") return second ?? null;
  if (first === "app" && (second === "community" || second === "comunidades")) return third ?? null;

  return null;
};

export const isCommunityPostEntryPage = (entry: TrafficPageViewRecord, path: string) =>
  entry.page_kind === "community_post" ||
  entry.target_type === "community_post" ||
  entry.target_type === "post" ||
  path.includes("/publicacao/") ||
  path.includes("/post/");

export const isPsychologistProfileEntryPage = (entry: TrafficPageViewRecord, path: string) =>
  entry.page_kind === "psychologist_profile" ||
  entry.target_type === "psychologist" ||
  path.startsWith("/psicologos/") ||
  path.startsWith("/psychologists/") ||
  path.startsWith("/app/psicologo/") ||
  path.startsWith("/app/psychologist/");

export const isCommunityEntryPage = (entry: TrafficPageViewRecord, path: string) => {
  const slug = communitySlugFromPath(path);
  const isSpecificCommunityPath = Boolean(slug && !NON_COMMUNITY_DETAIL_SEGMENTS.has(slug));
  const hasSpecificCommunityTarget = Boolean(
    entry.target_id && !NON_COMMUNITY_DETAIL_SEGMENTS.has(entry.target_id),
  );

  return (
    (entry.target_type === "community" && hasSpecificCommunityTarget) ||
    (entry.page_kind === "community" && hasSpecificCommunityTarget) ||
    isSpecificCommunityPath
  );
};

export const entryPageGroup = (entry: TrafficPageViewRecord) => {
  const path = entryPath(entry);

  if (isCommunityPostEntryPage(entry, path)) return ENTRY_PAGE_GROUPS.communityPosts;
  if (isPsychologistProfileEntryPage(entry, path)) return ENTRY_PAGE_GROUPS.psychologistProfiles;
  if (isCommunityEntryPage(entry, path)) return ENTRY_PAGE_GROUPS.communities;

  return {
    id: path,
    label: pathLabel(path),
    path,
  };
};

export const buildEntryPages = (stats: TrafficStats) => {
  const entries = entryPageViews(stats);
  const total = entries.length;
  const actionsBySession = new Map<string, number>();
  const groups = new Map<
    string,
    { conversions: number; count: number; label: string; path: string }
  >();

  for (const action of stats.actions) {
    const key = sessionKey(action);
    actionsBySession.set(key, (actionsBySession.get(key) ?? 0) + 1);
  }

  for (const entry of entries) {
    const group = entryPageGroup(entry);
    const conversionCount = actionsBySession.get(sessionKey(entry)) ?? 0;
    const current = groups.get(group.id) ?? {
      conversions: 0,
      count: 0,
      label: group.label,
      path: group.path,
    };

    groups.set(group.id, {
      ...current,
      conversions: current.conversions + conversionCount,
      count: current.count + 1,
    });
  }

  const items = [...groups.values()]
    .map<AdminTrafficEntryPage>((item) => ({
      conversions: item.conversions,
      count: item.count,
      label: item.label,
      path: item.path,
      percentage: safePercentage(item.count, total),
    }))
    .sort((left, right) => right.count - left.count)
    .slice(0, 7);

  return {
    items,
    source: "page_view_event.is_entry+important_action_event.session_id" as const,
    total,
  };
};

export const buildConversions = (current: TrafficStats, previous: TrafficStats) => ({
  items: [
    metric({
      current: current.patientSignups,
      description: "Usuários com role paciente criados no período.",
      id: "patient_signups",
      label: "Cadastros de pacientes",
      previous: previous.patientSignups,
      source: "user.role=paciente",
    }),
    metric({
      current: current.psychologistSignups,
      description: "Usuários com role psicólogo criados no período.",
      id: "psychologist_signups",
      label: "Cadastros de psicólogos",
      previous: previous.psychologistSignups,
      source: "user.role=psicologo",
    }),
    metric({
      current: current.publishedCommunityPosts,
      description: "Posts publicados em comunidades.",
      id: "community_posts",
      label: "Posts criados",
      previous: previous.publishedCommunityPosts,
      source: "community_post.status=publicado",
    }),
    metric({
      current: current.postReplies,
      description: "Comentários e respostas publicados em posts de comunidade.",
      id: "post_replies",
      label: "Comentários",
      previous: previous.postReplies,
      source: "post_reply",
    }),
    metric({
      current: current.contactRequests,
      description: "Cliques de contato por WhatsApp registrados na plataforma.",
      id: "whatsapp_clicks",
      label: "Cliques no WhatsApp",
      previous: previous.contactRequests,
      source: "contact_request.channel=whatsapp",
    }),
    metric({
      current: current.subscriptionsStarted,
      description: "Assinaturas profissionais pagas iniciadas, excluindo cortesia administrativa.",
      id: "subscriptions_started",
      label: "Assinaturas iniciadas",
      previous: previous.subscriptionsStarted,
      source: "professional_subscription",
    }),
    metric({
      current: pwaInstalls(current),
      description: "Instalações PWA capturadas como ação importante.",
      id: "pwa_installs",
      label: "Instalações PWA",
      previous: pwaInstalls(previous),
      source: "important_action_event.action_type=pwa_installed",
    }),
  ],
  source: "domain_events" as const,
});

export const WHATSAPP_IMPORTANT_ACTION_TYPES = new Set([
  "psychologist_video_whatsapp_click",
  "whatsapp_click",
]);

export const PWA_IMPORTANT_ACTION_TYPES = new Set(["pwa_installed"]);
