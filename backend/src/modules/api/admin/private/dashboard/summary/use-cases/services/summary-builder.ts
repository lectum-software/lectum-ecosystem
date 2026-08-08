import type { Resolve } from "@/helpers/return";
import { error, msg } from "@/helpers/translate";
import type {
  AdminDashboardQuery,
  AdminDashboardSummary,
} from "../../DTOs/IAdminDashboardSummaryDTO";
import { AdminDashboardRepository } from "../../repositories/AdminDashboardRepository";
import {
  buildDevices,
  buildFinancial,
  buildIntentConversionFlow,
  buildLocations,
  estimateMrrAt,
} from "./conversion-finance";
import { countByDate, metric, resolvePeriod } from "./intent-support";

import { buildPendingReports, buildWhatsAppClickDistribution } from "./reports-distribution";

export const buildDashboardSummary = async (query: AdminDashboardQuery): Promise<Resolve> => {
  const repository = new AdminDashboardRepository();
  const allPeriodStartDate =
    query?.period === "all" ? await repository.findEarliestDashboardDate() : null;
  const resolvedPeriod = resolvePeriod(query ?? {}, allPeriodStartDate);
  if (!resolvedPeriod.success) {
    return {
      status: 400,
      ...error(resolvedPeriod.code, {}),
    };
  }

  const { current, days, labels, period, previous } = resolvedPeriod.period;
  const publishedPsychologistProfiles = await repository.listPublishedPsychologistProfiles();
  const publishedPsychologistIds = publishedPsychologistProfiles.map((profile) => profile.user_id);

  const [
    sessions,
    previousSessions,
    patients,
    previousPatients,
    psychologists,
    previousPsychologists,
    pendingReportsTotal,
    previousPendingReports,
    patientCommunityPostDates,
    psychologistCommunityPostDates,
    patientCommentDates,
    psychologistReplyDates,
    visitorLocations,
    visitorSessions,
    paidSubscriptions,
    pendingReportRows,
    intentConversionSignals,
    psychologistConversionEvents,
    psychologistConversionProfiles,
    whatsappClickCountsByPsychologist,
  ] = await Promise.all([
    repository.countVisitorSessions(current),
    repository.countVisitorSessions(previous),
    repository.countUsersByRole("paciente", current),
    repository.countUsersByRole("paciente", previous),
    repository.countUsersByRole("psicologo", current),
    repository.countUsersByRole("psicologo", previous),
    repository.countPendingReports(current),
    repository.countPendingReports(previous),
    repository.listCommunityPostDates(current, "paciente"),
    repository.listCommunityPostDates(current, "psicologo"),
    repository.listPostReplyDates(current, "paciente"),
    repository.listPostReplyDates(current, "psicologo"),
    repository.listVisitorLocations(current),
    repository.listVisitorSessions(current),
    repository.listPaidSubscriptionsUntil(current.end),
    repository.listPendingReports(current),
    repository.listIntentConversionSignals(current),
    repository.listPsychologistConversionEvents(current),
    repository.listPsychologistConversionProfiles(),
    repository.listWhatsappClickCountsByPsychologist(current, publishedPsychologistIds),
  ]);

  const financial = buildFinancial(paidSubscriptions, labels, current.end, days);
  const previousFinancial = estimateMrrAt(paidSubscriptions, previous.end);
  const devices = buildDevices(visitorSessions);
  const locations = buildLocations(visitorLocations);
  const intentConversionFlow = buildIntentConversionFlow({
    psychologistConversionEvents,
    psychologistProfiles: psychologistConversionProfiles,
    range: current,
    signals: intentConversionSignals,
  });
  const whatsappClickDistribution = buildWhatsAppClickDistribution(
    publishedPsychologistProfiles,
    whatsappClickCountsByPsychologist,
  );

  const summary: AdminDashboardSummary = {
    cards: {
      patients: metric({
        current: patients,
        description: "Pacientes ativos cadastrados no período selecionado.",
        id: "patients",
        label: "Pacientes",
        previous: previousPatients,
        source: "user.role=paciente",
      }),
      pending_reports: metric({
        current: pendingReportsTotal,
        description: "Denúncias pendentes registradas no período selecionado.",
        id: "pending_reports",
        label: "Denúncias pendentes",
        previous: previousPendingReports,
        source: "post_report.status=pendente",
      }),
      psychologists: metric({
        current: psychologists,
        description: "Psicólogos ativos cadastrados no período selecionado.",
        id: "psychologists",
        label: "Psicólogos",
        previous: previousPsychologists,
        source: "user.role=psicologo",
      }),
      revenue: metric({
        current: financial.mrr_cents,
        description:
          "MRR estimado pelas assinaturas profissionais ativas. Não representa receita já confirmada pelo provedor de pagamento.",
        id: "revenue",
        label: "MRR estimado",
        previous: previousFinancial.mrrCents,
        source: financial.source,
        unit: "currency_cents",
      }),
      sessions: metric({
        current: sessions,
        description: "Sessões registradas no período selecionado.",
        id: "sessions",
        label: "Sessões do site",
        previous: previousSessions,
        source: "visitor_session",
      }),
    },
    community_activity: {
      comments: countByDate([...patientCommentDates, ...psychologistReplyDates], labels),
      patient_comments: countByDate(patientCommentDates, labels),
      patient_posts: countByDate(patientCommunityPostDates, labels),
      posts: countByDate([...patientCommunityPostDates, ...psychologistCommunityPostDates], labels),
      psychologist_posts: countByDate(psychologistCommunityPostDates, labels),
      psychologist_replies: countByDate(psychologistReplyDates, labels),
      source: "community_post+post_reply+user.role",
    },
    devices: {
      ...devices,
      source: "visitor_session.device_type",
    },
    financial: {
      confirmed_revenue_available: financial.confirmed_revenue_available,
      daily: financial.daily,
      label: financial.label,
      mrr_cents: financial.mrr_cents,
      period_estimate_cents: financial.period_estimate_cents,
      source: financial.source,
      unavailable_reason: financial.unavailable_reason,
    },
    intent_conversion_flow: intentConversionFlow,
    locations: {
      ...locations,
      source: "visitor_location.country",
    },
    pending_reports: buildPendingReports(pendingReportRows, pendingReportsTotal),
    period,
    unavailable: [
      {
        description:
          "Alguns pagamentos confirmados não informam um valor que possa ser somado com segurança.",
        id: "confirmed_revenue",
        label: "Receita confirmada",
        source: "payment_event",
      },
    ],
    whatsapp_click_distribution: whatsappClickDistribution,
  };

  return {
    status: 200,
    ...msg("index", {}),
    data: summary,
  };
};
