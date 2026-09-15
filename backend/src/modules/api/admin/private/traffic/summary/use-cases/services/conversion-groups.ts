import type {
  AdminTrafficConversionAction,
  AdminTrafficConversionChart,
} from "../../DTOs/IAdminTrafficSummaryDTO";
import type {
  TrafficActionRecord,
  TrafficDomainConversionKind,
  TrafficDomainConversionRecord,
  TrafficUserRecord,
} from "../../repositories/interfaces/IAdminTrafficRepository";
import { PWA_IMPORTANT_ACTION_TYPES, WHATSAPP_IMPORTANT_ACTION_TYPES } from "./entry-conversions";
import { getVisitorIds, safePercentage, type TrafficStats } from "./overview";

export const userRecordById = (stats: TrafficStats) =>
  new Map(stats.users.map((user) => [user.id, user]));

export const visitorIdsByUserId = (stats: TrafficStats) => {
  const visitors = new Map<string, Set<string>>();
  const addVisitor = (userId: string | null | undefined, visitorId: string | null | undefined) => {
    if (!userId || !visitorId) return;

    const current = visitors.get(userId) ?? new Set<string>();
    current.add(visitorId);
    visitors.set(userId, current);
  };

  for (const session of stats.sessions) addVisitor(session.user_id, session.visitor_id);
  for (const pageView of stats.pageViews) addVisitor(pageView.user_id, pageView.visitor_id);
  for (const action of stats.actions) addVisitor(action.user_id, action.visitor_id);
  for (const conversion of stats.domainConversions) {
    addVisitor(conversion.user_id, conversion.visitor_id);
  }

  return visitors;
};

export const conversionChart = (params: {
  description: string;
  id: string;
  items: Array<{ count: number; id: string; label: string }>;
  label: string;
  source: string;
  total: number;
}): AdminTrafficConversionChart => ({
  description: params.description,
  id: params.id,
  items: params.items.map((item) => ({
    count: item.count,
    id: item.id,
    label: item.label,
    percentage: safePercentage(item.count, params.total),
  })),
  label: params.label,
  source: params.source,
  total: params.total,
});

export const isBeforeSignupImportantAction = (
  action: TrafficActionRecord,
  usersById: Map<string, TrafficUserRecord>,
  actionTypes: Set<string>,
) => {
  if (!actionTypes.has(action.action_type)) return false;
  if (!action.user_id) return true;

  const user = usersById.get(action.user_id);
  if (!user) return false;

  return action.occurred_at < user.createdAt;
};

export const isPostSignupDomainConversion = (
  conversion: TrafficDomainConversionRecord,
  usersById: Map<string, TrafficUserRecord>,
) => {
  if (!conversion.user_id) return false;

  const user = usersById.get(conversion.user_id);
  if (!user) return false;

  return conversion.occurred_at >= user.createdAt;
};

export const conversionAction = (params: {
  actorIds: Set<string>;
  actorLabel: string;
  description: string;
  events: number;
  id: string;
  label: string;
  patientActorIds?: Set<string>;
  psychologistActorIds?: Set<string>;
  source: string;
  totalActors: number;
}): AdminTrafficConversionAction => ({
  actor_label: params.actorLabel,
  actor_percentage: safePercentage(params.actorIds.size, params.totalActors),
  actors: params.actorIds.size,
  description: params.description,
  events: params.events,
  id: params.id,
  label: params.label,
  patient_actors: params.patientActorIds?.size ?? 0,
  psychologist_actors: params.psychologistActorIds?.size ?? 0,
  source: params.source,
});

export const domainConversionRecordsByKind = (
  stats: TrafficStats,
  usersById: Map<string, TrafficUserRecord>,
  kind: TrafficDomainConversionKind,
) =>
  stats.domainConversions.filter(
    (conversion) => conversion.kind === kind && isPostSignupDomainConversion(conversion, usersById),
  );

export const buildConversionGroups = (current: TrafficStats) => {
  const totalVisitors = getVisitorIds(current).size;
  const visitorsByUserId = visitorIdsByUserId(current);
  const signupVisitorIds = new Set<string>();

  for (const user of current.usersCreated) {
    const visitorIds = visitorsByUserId.get(user.id);
    if (!visitorIds) continue;

    for (const visitorId of visitorIds) signupVisitorIds.add(visitorId);
  }

  const patientSignups = current.usersCreated.filter((user) => user.role === "paciente").length;
  const psychologistSignups = current.usersCreated.filter(
    (user) => user.role === "psicologo",
  ).length;
  const totalSignups = patientSignups + psychologistSignups;
  const usersById = userRecordById(current);
  const preSignupWhatsappActions = current.actions.filter((action) =>
    isBeforeSignupImportantAction(action, usersById, WHATSAPP_IMPORTANT_ACTION_TYPES),
  );
  const preSignupPwaActions = current.actions.filter((action) =>
    isBeforeSignupImportantAction(action, usersById, PWA_IMPORTANT_ACTION_TYPES),
  );
  const postSignupUsers = new Set<string>();
  const postSignupConversionDefinitions: Array<{
    description: string;
    id: TrafficDomainConversionKind;
    label: string;
    source: string;
  }> = [
    {
      description: "Usuários cadastrados que publicaram posts no período.",
      id: "community_posts",
      label: "Posts criados",
      source: "community_post.status=publicado",
    },
    {
      description: "Usuários cadastrados que comentaram ou responderam posts no período.",
      id: "post_replies",
      label: "Comentários",
      source: "post_reply",
    },
    {
      description: "Usuários cadastrados que clicaram em contato por WhatsApp no período.",
      id: "whatsapp_clicks",
      label: "Cliques no WhatsApp",
      source: "contact_request.channel=whatsapp",
    },
    {
      description: "Psicólogos cadastrados que iniciaram assinatura profissional paga.",
      id: "subscriptions_started",
      label: "Assinaturas iniciadas",
      source: "professional_subscription",
    },
    {
      description: "Usuários cadastrados que instalaram a PWA após o cadastro.",
      id: "pwa_installs",
      label: "Instalações PWA",
      source: "important_action_event.action_type=pwa_installed",
    },
  ];
  const postSignupItems = postSignupConversionDefinitions.map((definition) => {
    const records = domainConversionRecordsByKind(current, usersById, definition.id);
    const actorIds = new Set(records.flatMap((record) => (record.user_id ? [record.user_id] : [])));
    const patientActorIds = new Set(
      [...actorIds].filter((actorId) => usersById.get(actorId)?.role === "paciente"),
    );
    const psychologistActorIds = new Set(
      [...actorIds].filter((actorId) => usersById.get(actorId)?.role === "psicologo"),
    );

    for (const actorId of actorIds) postSignupUsers.add(actorId);

    return conversionAction({
      actorIds,
      actorLabel: "usuários",
      description: definition.description,
      events: records.length,
      id: definition.id,
      label: definition.label,
      patientActorIds,
      psychologistActorIds,
      source: definition.source,
      totalActors: current.users.length,
    });
  });

  return {
    post_signup: {
      items: postSignupItems,
      overall: conversionChart({
        description:
          "Usuários cadastrados observados no período que tiveram ao menos uma conversão de domínio após o cadastro.",
        id: "post_signup_overall",
        items: [
          {
            count: postSignupUsers.size,
            id: "converted",
            label: "Tiveram conversão após cadastro",
          },
          {
            count: Math.max(0, current.users.length - postSignupUsers.size),
            id: "not_converted",
            label: "Sem conversão após cadastro",
          },
        ],
        label: "Conversão geral após cadastro",
        source: "user+domain_events",
        total: current.users.length,
      }),
      source: "user+domain_events" as const,
      total_users: current.users.length,
    },
    pre_signup: {
      actions: [
        conversionAction({
          actorIds: new Set(preSignupWhatsappActions.map((action) => action.visitor_id)),
          actorLabel: "visitantes",
          description:
            "Visitantes não autenticados, inclusive antes do cadastro quando a navegação pôde ser associada, com clique no WhatsApp.",
          events: preSignupWhatsappActions.length,
          id: "whatsapp_clicks",
          label: "Cliques no WhatsApp",
          source:
            "important_action_event.action_type=whatsapp_click|psychologist_video_whatsapp_click",
          totalActors: totalVisitors,
        }),
        conversionAction({
          actorIds: new Set(preSignupPwaActions.map((action) => action.visitor_id)),
          actorLabel: "visitantes",
          description:
            "Visitantes não autenticados, inclusive antes do cadastro quando a navegação pôde ser associada, com instalação do aplicativo.",
          events: preSignupPwaActions.length,
          id: "pwa_installs",
          label: "Instalações PWA",
          source: "important_action_event.action_type=pwa_installed",
          totalActors: totalVisitors,
        }),
      ],
      charts: [
        conversionChart({
          description:
            "Visitantes únicos do período cuja navegação pôde ser associada a uma conta criada no mesmo intervalo.",
          id: "visitor_to_signup",
          items: [
            {
              count: signupVisitorIds.size,
              id: "signed_up",
              label: "Fizeram cadastro",
            },
            {
              count: Math.max(0, totalVisitors - signupVisitorIds.size),
              id: "not_signed_up",
              label: "Não fizeram cadastro",
            },
          ],
          label: "Visitantes para cadastro",
          source: "visitor_id+user.createdAt",
          total: totalVisitors,
        }),
        conversionChart({
          description:
            "Distribuição dos cadastros criados no período entre pacientes e psicólogos.",
          id: "signup_roles",
          items: [
            {
              count: patientSignups,
              id: "patients",
              label: "Pacientes",
            },
            {
              count: psychologistSignups,
              id: "psychologists",
              label: "Psicólogos",
            },
          ],
          label: "Cadastros por perfil",
          source: "user.role+createdAt",
          total: totalSignups,
        }),
      ],
      source: "visitor_id+user+important_action_event" as const,
      total_visitors: totalVisitors,
    },
  };
};
