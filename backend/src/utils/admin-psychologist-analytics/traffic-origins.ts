import {
  type AdminPsychologistTrafficOriginPageView,
  type AdminPsychologistTrafficOriginSource,
  type AdminPsychologistTrafficOriginSourceId,
  roundOneDecimal,
} from "./subscription-conversion";

export const psychologistTrafficOriginDefinitions: Array<
  Pick<AdminPsychologistTrafficOriginSource, "description" | "id" | "label">
> = [
  {
    description: "Acessos originados pela página de psicólogos e navegação pelos vídeos.",
    id: "explore",
    label: "Explorar",
  },
  {
    description:
      "Acessos originados por pesquisas de nome, especialidades, abordagem, convênio e demais filtros.",
    id: "search_filters",
    label: "Busca e filtros",
  },
  {
    description:
      "Acessos originados por posts, comentários, respostas, ranking Top Mentor e demais interações dentro das comunidades.",
    id: "communities",
    label: "Comunidades",
  },
  {
    description: "Acessos originados pelo link do perfil compartilhado externamente.",
    id: "direct_link",
    label: "Perfil",
  },
  {
    description:
      "Acessos originados a partir da área de psicólogos favoritos, retorno de usuários que já favoritaram seu perfil antes.",
    id: "favorites",
    label: "Favoritos",
  },
];

export const trafficOriginFromPageViewSource = (
  source?: string | null,
): AdminPsychologistTrafficOriginSourceId => {
  const normalized = (source ?? "").trim().toLowerCase();

  if (normalized === "lectum_community") return "communities";
  if (normalized === "lectum_profile" || normalized === "lectum_internal") return "explore";

  return "direct_link";
};

export const summarizePsychologistTrafficOrigins = (
  pageViews: AdminPsychologistTrafficOriginPageView[],
) => {
  const groups = new Map<
    AdminPsychologistTrafficOriginSourceId,
    { profileViews: number; sessions: Set<string> }
  >(
    psychologistTrafficOriginDefinitions.map((source) => [
      source.id,
      { profileViews: 0, sessions: new Set<string>() },
    ]),
  );

  for (const pageView of pageViews) {
    const sourceId = trafficOriginFromPageViewSource(pageView.traffic_source);
    const current = groups.get(sourceId);
    if (!current) continue;

    current.profileViews += 1;
    current.sessions.add(pageView.session_id);
  }

  const totalProfileViews = pageViews.length;
  const totalSessions = new Set(pageViews.map((pageView) => pageView.session_id)).size;
  const maxProfileViews = Math.max(0, ...[...groups.values()].map((group) => group.profileViews));
  const primarySourceId =
    totalProfileViews > 0
      ? (psychologistTrafficOriginDefinitions.find(
          (definition) => (groups.get(definition.id)?.profileViews ?? 0) === maxProfileViews,
        )?.id ?? null)
      : null;
  const updatedAt =
    pageViews.length > 0
      ? pageViews.reduce<Date | null>(
          (latest, pageView) =>
            !latest || pageView.occurred_at > latest ? pageView.occurred_at : latest,
          null,
        )
      : null;

  const sources = psychologistTrafficOriginDefinitions.map((definition) => {
    const group = groups.get(definition.id);
    const profileViews = group?.profileViews ?? 0;

    return {
      ...definition,
      badge: definition.id === primarySourceId ? ("primary_source" as const) : null,
      conversion_rate: null,
      percentage:
        totalProfileViews > 0 ? roundOneDecimal((profileViews / totalProfileViews) * 100) : 0,
      profile_views: profileViews,
      sessions: group?.sessions.size ?? 0,
      whatsapp_clicks: null,
    };
  });

  return {
    attribution_unavailable_reason:
      "Os cliques no WhatsApp ainda não têm origem identificada; a tabela exibe visualizações dos perfis por origem.",
    description: "Entenda quais canais levam pacientes aos perfis públicos dos psicólogos.",
    sources,
    total_profile_views: totalProfileViews,
    total_sessions: totalSessions,
    unavailable_reason:
      totalProfileViews > 0
        ? null
        : "Nenhuma visita a perfil público de psicólogo com origem de tráfego foi registrada no período.",
    updated_at: updatedAt,
  };
};
