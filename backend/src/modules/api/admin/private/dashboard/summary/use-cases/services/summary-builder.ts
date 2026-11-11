import type { Resolve } from "@/helpers/return";
import { error, msg } from "@/helpers/translate";
import {
  FinanceLedgerFilterRequiredError,
  readAdminFinanceStripeLedger,
} from "@/modules/api/admin/private/finance/dashboard/repositories/AdminFinanceStripeLedgerRepository";
import { parseFinanceDateOnly } from "@/modules/api/admin/private/finance/dashboard/use-cases/services/periods";
import { projectFinanceStripeLedger } from "@/modules/api/admin/private/finance/dashboard/use-cases/services/stripe-ledger-projection";
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
  // Other analytics keep their existing calendar; financial cutoffs use the displayed civil keys in BRT.
  const financialEnd = parseFinanceDateOnly(period.to, "end")!;
  const previousFinancialEnd = parseFinanceDateOnly(period.previous_to, "end")!;

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
    repository.listPaidSubscriptionsUntil(financialEnd),
    repository.listPendingReports(current),
    repository.listIntentConversionSignals(current),
    repository.listPsychologistConversionEvents(current),
    repository.listPsychologistConversionProfiles(),
    repository.listWhatsappClickCountsByPsychologist(current, publishedPsychologistIds),
  ]);

  let ledger: ReturnType<typeof projectFinanceStripeLedger>;
  try {
    ledger = projectFinanceStripeLedger(await readAdminFinanceStripeLedger());
  } catch (cause) {
    if (cause instanceof FinanceLedgerFilterRequiredError)
      return { status: 503, ...error("finance_history_filter_required", {}) };
    throw cause;
  }
  const financial = buildFinancial(paidSubscriptions, labels, financialEnd, days, ledger);
  const previousFinancial = estimateMrrAt(paidSubscriptions, previousFinancialEnd, ledger);
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
          "MRR por estado observado e período pago Stripe, com corte no dia civil de America/Sao_Paulo. Não representa caixa líquido nem tarifas.",
        id: "revenue",
        label: "MRR estimado",
        previous: previousFinancial.mrrCents ?? 0,
        unavailable: !financial.mrr_available,
        ...(!financial.mrr_available
          ? { unavailableReason: "Preço contratado ou períodos pagos conciliados indisponíveis." }
          : {}),
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
      mrr_available: financial.mrr_available,
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

  if (previousFinancial.mrrCents === null) {
    summary.cards.revenue.previous_value_available = false;
    summary.cards.revenue.change_percent = null;
    summary.cards.revenue.trend = "unavailable";
    summary.cards.revenue.description +=
      " Comparação anterior indisponível por lacuna histórica observada.";
  }
  return {
    status: 200,
    ...msg("index", {}),
    data: summary,
  };
};
