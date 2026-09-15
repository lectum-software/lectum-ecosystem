import type { Resolve } from "@/helpers/return";
import { error, msg } from "@/helpers/translate";
import type {
  AdminPatientsDashboardQuery,
  AdminPatientsDashboardSummary,
} from "../../DTOs/IAdminPatientsDashboardDTO";
import { AdminPatientsDashboardRepository } from "../../repositories/AdminPatientsDashboardRepository";
import {
  buildPatientVisitorIds,
  buildPlatformUsage,
  collectAnonymousConversionVisitorIds,
  latestPatientSignupDate,
  summarizeAnonymousConversion,
} from "./anonymous-platform";
import {
  buildDemographics,
  buildDeviceUsage,
  buildLocations,
  buildOperatingSystemUsage,
  buildSeries,
  createdUntil,
  dateInRange,
  deletedAccountInRange,
} from "./device-demographics";
import {
  buildPatientIntentFilters,
  getAllPeriodStartDate,
  mapRecentPatient,
} from "./filters-recent";
import {
  buildPatientCommunityEngagementClassification,
  buildPatientIntentClassification,
  buildPatientIntentEngagement,
} from "./intent-classification";
import { metric, resolvePeriod } from "./intent-support";

export const buildPatientsDashboard = async (
  query: AdminPatientsDashboardQuery,
): Promise<Resolve> => {
  const repository = new AdminPatientsDashboardRepository();
  const [patients, recentPatients, deletedAccounts] = await Promise.all([
    repository.listPatientSnapshots(),
    repository.listRecentPatients(5),
    repository.listDeletedPatientAccounts(),
  ]);
  const resolvedPeriod = resolvePeriod(
    query ?? {},
    getAllPeriodStartDate(patients, deletedAccounts),
  );
  if (!resolvedPeriod.success) {
    return {
      status: 400,
      ...error(resolvedPeriod.code, {}),
    };
  }

  const { current, labels, period, previous } = resolvedPeriod.period;
  const currentPatients = patients.filter((patient) => createdUntil(patient, current.end));
  const previousPatients = patients.filter((patient) => createdUntil(patient, previous.end));
  const currentPeriodPatients = patients.filter((patient) =>
    dateInRange(patient.createdAt, current),
  );
  const previousPeriodPatients = patients.filter((patient) =>
    dateInRange(patient.createdAt, previous),
  );
  const currentDeletedAccounts = deletedAccounts.filter((account) =>
    deletedAccountInRange(account, current),
  );
  const previousDeletedAccounts = deletedAccounts.filter((account) =>
    deletedAccountInRange(account, previous),
  );
  const currentPeriodPatientIds = currentPeriodPatients.map((patient) => patient.id);
  const [
    locations,
    patientPageViews,
    patientPwaInstalls,
    patientPlatformSessions,
    anonymousConversionLinkedPageViews,
    anonymousConversionLinkedSessions,
    anonymousConversionSignupIdentities,
  ] = await Promise.all([
    repository.listLocations(current),
    repository.listPatientPageViews(current),
    repository.listPatientPwaInstallActions(current),
    repository.listPatientPlatformSessions(current),
    repository.listAnonymousConversionLinkedPageViews(currentPeriodPatientIds),
    repository.listAnonymousConversionLinkedSessions(currentPeriodPatientIds),
    repository.listAnonymousConversionSignupIdentities(currentPeriodPatientIds),
  ]);
  const anonymousConversionVisitorIds = collectAnonymousConversionVisitorIds(
    buildPatientVisitorIds({
      linkedPageViews: anonymousConversionLinkedPageViews,
      linkedSessions: anonymousConversionLinkedSessions,
      patientIds: new Set(currentPeriodPatientIds),
      signupIdentities: anonymousConversionSignupIdentities,
    }),
  );
  const anonymousConversionMaxSignupDate = latestPatientSignupDate(currentPeriodPatients);
  const [anonymousConversionPageViews, anonymousConversionSessions] = await Promise.all([
    repository.listAnonymousConversionPageViewsByVisitorIds(
      anonymousConversionVisitorIds,
      currentPeriodPatientIds,
      anonymousConversionMaxSignupDate,
    ),
    repository.listAnonymousConversionSessionsByVisitorIds(
      anonymousConversionVisitorIds,
      currentPeriodPatientIds,
      anonymousConversionMaxSignupDate,
    ),
  ]);
  const [intentSignals, communityEngagementSignals] = await Promise.all([
    repository.listIntentSignals(current),
    repository.listCommunityEngagementEvents(current),
  ]);

  const currentNewPatients = currentPeriodPatients.length;
  const previousNewPatients = previousPeriodPatients.length;
  const activePatients = patients.filter((patient) => patient.active);
  const inactivePatients = patients.filter((patient) => !patient.active);
  const previousActivePatients = previousPatients.filter((patient) => patient.active);
  const previousInactivePatients = previousPatients.filter((patient) => !patient.active);
  const locationSummary = buildLocations(locations);
  const platformUsage = buildPlatformUsage({
    eligiblePatientsCount: currentPatients.length,
    labels,
    pageViews: patientPageViews,
    pwaInstalledUserIds: patientPwaInstalls.flatMap((event) =>
      event.user_id ? [event.user_id] : [],
    ),
  });
  const deviceUsage = buildDeviceUsage(patientPlatformSessions);
  const operatingSystemUsage = buildOperatingSystemUsage(patientPlatformSessions);
  const anonymousConversion = summarizeAnonymousConversion({
    linkedPageViews: anonymousConversionLinkedPageViews,
    linkedSessions: anonymousConversionLinkedSessions,
    pageViews: anonymousConversionPageViews,
    patients: currentPeriodPatients,
    period,
    sessions: anonymousConversionSessions,
    signupIdentities: anonymousConversionSignupIdentities,
  });
  const intentClassification = buildPatientIntentClassification(currentPatients, intentSignals);
  const engagementClassification = buildPatientCommunityEngagementClassification({
    patients: currentPatients,
    range: current,
    signals: communityEngagementSignals,
  });
  const intentEngagement = buildPatientIntentEngagement({
    engagementSegmentByPatientId: engagementClassification.engagementSegmentByPatientId,
    patients: currentPatients,
    segmentByPatientId: intentClassification.segmentByPatientId,
  });
  const intentFilters = buildPatientIntentFilters({
    currentPatients,
    currentPeriodPatients,
    intentAnalysis: intentClassification.analysis,
    labels,
    locations,
    pageViews: patientPageViews,
    platformSessions: patientPlatformSessions,
    pwaInstalledUserIds: patientPwaInstalls.flatMap((event) =>
      event.user_id ? [event.user_id] : [],
    ),
    segmentByPatientId: intentClassification.segmentByPatientId,
  });

  const summary: AdminPatientsDashboardSummary = {
    anonymous_conversion: anonymousConversion,
    cards: {
      active_patients: metric({
        current: activePatients.length,
        description: "Contas de pacientes ativas no momento da consulta.",
        id: "active_patients",
        label: "Pacientes ativos",
        previous: previousActivePatients.length,
        source: "user.role=paciente+user.active=true",
      }),
      deleted_accounts: metric({
        current: currentDeletedAccounts.length,
        description: "Pacientes que excluíram a conta no período selecionado.",
        id: "deleted_accounts",
        label: "Descadastros",
        previous: previousDeletedAccounts.length,
        source: "user.role=paciente+user.deleted=true+user.account_status=deleted+user.deletedAt",
      }),
      inactive_patients: metric({
        current: inactivePatients.length,
        description: "Contas de pacientes inativas no momento da consulta.",
        id: "inactive_patients",
        label: "Pacientes inativos",
        previous: previousInactivePatients.length,
        source: "user.role=paciente+user.active=false",
      }),
      new_signups: metric({
        current: currentNewPatients,
        description: "Pacientes cadastrados no período selecionado.",
        id: "new_signups",
        label: "Novos cadastros",
        previous: previousNewPatients,
        source: "user.role=paciente+user.createdAt",
      }),
      total_patients: metric({
        current: patients.length,
        description: "Total atual de pacientes cadastrados e não excluídos.",
        id: "total_patients",
        label: "Total de pacientes",
        previous: previousPatients.length,
        source: "user.role=paciente",
      }),
    },
    coverage_notes: [
      "O status ativo ou inativo representa o estado atual da conta, não o engajamento recente.",
      "A atividade recente considera interações em comunidades, reações e salvamentos registrados.",
      "O uso da plataforma considera visualizações autenticadas e instalações do aplicativo registradas no período selecionado.",
      "A distribuição de dispositivos considera somente sessões autenticadas de pacientes no período selecionado.",
      "A distribuição de sistemas operacionais considera somente sessões autenticadas de pacientes e não armazena a identificação completa do navegador.",
      "A jornada pré-cadastro considera pacientes cadastrados no período e a navegação anônima anterior que pôde ser associada ao cadastro; outros visitantes ficam fora deste bloco.",
      "Gênero e forma de cadastro consideram somente pacientes cadastrados no período selecionado; em Todo o período incluem a base completa.",
      "Descadastros consideram contas de pacientes marcadas como excluídas pela data registrada da exclusão no período selecionado.",
      "O tempo médio considera visualizações autenticadas e ignora períodos em que o aplicativo fica oculto ou minimizado.",
      "A localização usa cidade e estado declarados pelo paciente no perfil; quem não informou aparece como Não informado, e coordenadas, IP e endereço não são exibidos.",
      "Análise de intenção usa apenas agregados de abertura de perfil, favoritos ativos e cliques no WhatsApp; não expõe conversa, diagnóstico ou atendimento.",
      "O engajamento classifica pacientes únicos pelas ações em comunidades, como posts, comentários, votos e salvamentos.",
      "Intenção x Engajamento cruza intenção de busca com engajamento comunitário por paciente único para leitura observacional; não indica causalidade, atendimento, diagnóstico ou conversa.",
      "Os filtros por intenção usam a mesma classificação do período em todos os blocos agregados.",
    ],
    demographics: buildDemographics(currentPeriodPatients),
    device_usage: deviceUsage,
    engagement_analysis: engagementClassification.engagementAnalysis,
    export: {
      available: false,
      reason: "A exportação de pacientes ainda não está disponível.",
    },
    intent_filters: intentFilters,
    intent_engagement: intentEngagement,
    intent_analysis: intentClassification.analysis,
    locations: locationSummary,
    operating_system_usage: operatingSystemUsage,
    period,
    platform_usage: platformUsage,
    recent_patients: {
      items: recentPatients.map(mapRecentPatient),
      source: "user+patient_profile+community_activity",
      total: patients.length,
    },
    series: {
      points: buildSeries(patients, labels, deletedAccounts),
      source: "user.createdAt+user.active+user.deletedAt",
    },
    unavailable: [
      ...(platformUsage.duration_unavailable_reason
        ? [
            {
              description: platformUsage.duration_unavailable_reason,
              id: "patient_average_duration",
              label: "Tempo médio do paciente",
              source: platformUsage.source,
            },
          ]
        : []),
      ...(platformUsage.unavailable_reason
        ? [
            {
              description:
                "O uso da plataforma depende de visualizações autenticadas de pacientes no período selecionado.",
              id: "platform_usage",
              label: "Uso da plataforma",
              source: "page_view_event",
            },
          ]
        : []),
      ...(deviceUsage.unavailable_reason
        ? [
            {
              description:
                "A distribuição de dispositivos depende de sessões autenticadas de pacientes no período selecionado.",
              id: "patient_device_usage",
              label: "Devices dos pacientes",
              source: "visitor_session",
            },
          ]
        : []),
      ...(operatingSystemUsage.unavailable_reason
        ? [
            {
              description:
                "A distribuição de sistemas operacionais depende de sessões autenticadas de pacientes no período selecionado.",
              id: "patient_operating_system_usage",
              label: "Sistema operacional dos pacientes",
              source: "visitor_session",
            },
          ]
        : []),
      ...(intentEngagement.unavailable_reason
        ? [
            {
              description: intentEngagement.unavailable_reason,
              id: "patient_intent_engagement",
              label: "Intenção x Engajamento",
              source: intentEngagement.source,
            },
          ]
        : []),
      ...(anonymousConversion.unavailable_reason
        ? [
            {
              description: anonymousConversion.unavailable_reason,
              id: "anonymous_conversion",
              label: "Conversão até o cadastro",
              source: anonymousConversion.source,
            },
          ]
        : []),
      ...(currentPeriodPatients.length === 0
        ? [
            {
              description:
                "Nenhum paciente foi cadastrado no período selecionado; gênero e forma de cadastro ficam vazios sem reaproveitar coortes de outros períodos.",
              id: "patient_period_demographics",
              label: "Gênero e forma de cadastro",
              source: "user.createdAt+patient_profile.gender+user.provider",
            },
          ]
        : []),
      ...(locationSummary.total === 0
        ? [
            {
              description:
                "Nenhum perfil de paciente foi encontrado para compor a distribuição de localização declarada.",
              id: "locations",
              label: "Localização declarada",
              source: "patient_profile.city/state",
            },
          ]
        : []),
    ],
  };

  return {
    status: 200,
    ...msg("index", {}),
    data: summary,
  };
};
