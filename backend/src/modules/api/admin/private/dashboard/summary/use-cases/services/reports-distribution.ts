import type {
  AdminDashboardPendingReport,
  AdminDashboardWhatsAppClickDistribution,
  AdminDashboardWhatsAppClickDistributionConcentrationLevel,
  AdminDashboardWhatsAppClickDistributionPoint,
  AdminDashboardWhatsAppClickDistributionSegment,
} from "../../DTOs/IAdminDashboardSummaryDTO";

import {
  type PendingReportRecord,
  type PublishedPsychologistProfile,
  SEVERITY_WEIGHTS,
  safePercentage,
  type WhatsappClickCountByPsychologist,
} from "./intent-support";

export const snippet = (text: string | null | undefined, fallback: string) => {
  const normalized = text?.replace(/\s+/g, " ").trim();
  if (!normalized) return fallback;

  return normalized.length > 80 ? `${normalized.slice(0, 77)}...` : normalized;
};

export const normalizeSeverityText = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

export const deriveReportSeverity = (
  report: Pick<PendingReportRecord, "reason" | "target_type">,
) => {
  const text = normalizeSeverityText(`${report.reason} ${report.target_type}`);

  if (
    ["odio", "violencia", "risco", "ameaca", "suic", "automutil", "abuso"].some((term) =>
      text.includes(term),
    )
  ) {
    return "alta" as const;
  }

  if (
    report.target_type === "reply" ||
    ["ofens", "desrespeito", "desinform", "assedio", "spam"].some((term) => text.includes(term))
  ) {
    return "media" as const;
  }

  return "baixa" as const;
};

export const mapPendingReport = (report: PendingReportRecord): AdminDashboardPendingReport => {
  const severity = deriveReportSeverity(report);
  const isReply = report.target_type === "reply" && report.reply;
  const communityName = isReply ? report.reply?.post.community.name : report.post.community.name;
  const targetTitle = isReply
    ? report.reply?.title ||
      snippet(report.reply?.content, report.reply?.post.title || "Comentário denunciado")
    : report.post.title || snippet(report.post.content, "Post denunciado");

  return {
    community_name: communityName ?? null,
    created_at: report.createdAt,
    description: report.description,
    id: report.id,
    reason: report.reason,
    reporter_role: report.reporter.role,
    severity,
    status: report.status,
    target_id: report.target_id,
    target_title: targetTitle,
    target_type: report.target_type,
  };
};

export const buildPendingReports = (reports: PendingReportRecord[], total: number) => ({
  items: reports
    .map(mapPendingReport)
    .sort((left, right) => {
      const severityDiff = SEVERITY_WEIGHTS[right.severity] - SEVERITY_WEIGHTS[left.severity];
      if (severityDiff !== 0) return severityDiff;

      return new Date(right.created_at).getTime() - new Date(left.created_at).getTime();
    })
    .slice(0, 5),
  source: "post_report" as const,
  total,
});

export const formatPercentText = (value: number) =>
  `${value.toLocaleString("pt-BR", {
    maximumFractionDigits: 1,
    minimumFractionDigits: Number.isInteger(value) ? 0 : 1,
  })}%`;

export const formatCountText = (value: number, singular: string, plural: string) =>
  `${value.toLocaleString("pt-BR")} ${value === 1 ? singular : plural}`;

export const sumNumbers = (values: number[]) => values.reduce((sum, value) => sum + value, 0);

export const concentrationFromGini = (
  gini: number | null,
  totalClicks: number,
  totalPsychologists: number,
): {
  label: string;
  level: AdminDashboardWhatsAppClickDistributionConcentrationLevel;
} => {
  if (totalPsychologists === 0) {
    return {
      label: "Sem psicólogos publicados",
      level: "unavailable",
    };
  }

  if (totalClicks === 0 || gini === null) {
    return {
      label: "Sem cliques no período",
      level: "unavailable",
    };
  }

  if (gini < 0.3) {
    return {
      label: "Baixa concentração",
      level: "balanced",
    };
  }

  if (gini < 0.55) {
    return {
      label: "Concentração moderada",
      level: "moderate",
    };
  }

  return {
    label: "Alta concentração",
    level: "concentrated",
  };
};

export const buildGini = (sortedAscendingCounts: number[], totalClicks: number) => {
  if (sortedAscendingCounts.length === 0 || totalClicks === 0) return null;

  const weightedSum = sortedAscendingCounts.reduce(
    (sum, value, index) => sum + (index + 1) * value,
    0,
  );
  const raw =
    (2 * weightedSum) / (sortedAscendingCounts.length * totalClicks) -
    (sortedAscendingCounts.length + 1) / sortedAscendingCounts.length;

  return Math.round(Math.max(0, Math.min(1, raw)) * 1000) / 1000;
};

export const buildWhatsAppCurve = (
  sortedAscendingCounts: number[],
  totalClicks: number,
): AdminDashboardWhatsAppClickDistributionPoint[] => {
  if (sortedAscendingCounts.length === 0) return [];

  let cumulativeClicks = 0;

  return [
    {
      click_percentage: 0,
      cumulative_clicks: 0,
      psychologist_percentage: 0,
      psychologists: 0,
    },
    ...sortedAscendingCounts.map((count, index) => {
      cumulativeClicks += count;

      return {
        click_percentage: safePercentage(cumulativeClicks, totalClicks),
        cumulative_clicks: cumulativeClicks,
        psychologist_percentage: safePercentage(index + 1, sortedAscendingCounts.length),
        psychologists: index + 1,
      };
    }),
  ];
};

export const buildTopSegment = (
  sortedDescendingCounts: number[],
  totalClicks: number,
  percentage: 10 | 20,
): AdminDashboardWhatsAppClickDistributionSegment => {
  const totalPsychologists = sortedDescendingCounts.length;
  if (totalPsychologists === 0) {
    return {
      click_percentage: 0,
      clicks: 0,
      psychologist_count: 0,
      psychologist_percentage: 0,
    };
  }

  const psychologistCount = Math.max(1, Math.ceil(totalPsychologists * (percentage / 100)));
  const clicks = sumNumbers(sortedDescendingCounts.slice(0, psychologistCount));

  return {
    click_percentage: safePercentage(clicks, totalClicks),
    clicks,
    psychologist_count: psychologistCount,
    psychologist_percentage: safePercentage(psychologistCount, totalPsychologists),
  };
};

export const buildWhatsAppDistributionSummary = (params: {
  top20: AdminDashboardWhatsAppClickDistributionSegment;
  totalClicks: number;
  totalPsychologists: number;
}) => {
  if (params.totalPsychologists === 0) {
    return "Nenhum psicólogo ativo e publicado foi encontrado para compor a base da distribuição.";
  }

  if (params.totalClicks === 0) {
    return "Nenhum clique de WhatsApp foi registrado para os psicólogos considerados neste período.";
  }

  return `Top 20% (${formatCountText(
    params.top20.psychologist_count,
    "psicólogo",
    "psicólogos",
  )}) concentram ${formatPercentText(params.top20.click_percentage)} dos cliques de WhatsApp no período.`;
};

export const buildWhatsAppClickDistribution = (
  profiles: PublishedPsychologistProfile[],
  clickCounts: WhatsappClickCountByPsychologist[],
): AdminDashboardWhatsAppClickDistribution => {
  const clicksByPsychologist = new Map(
    clickCounts.map((item) => [item.psychologist_id, item.count]),
  );
  const counts = profiles.map((profile) => clicksByPsychologist.get(profile.user_id) ?? 0);
  const totalPsychologists = counts.length;
  const totalClicks = sumNumbers(counts);
  const sortedAscendingCounts = [...counts].sort((left, right) => left - right);
  const sortedDescendingCounts = [...counts].sort((left, right) => right - left);
  const psychologistsWithClicks = counts.filter((count) => count > 0).length;
  const top10 = buildTopSegment(sortedDescendingCounts, totalClicks, 10);
  const top20 = buildTopSegment(sortedDescendingCounts, totalClicks, 20);
  const gini = buildGini(sortedAscendingCounts, totalClicks);
  const concentration = concentrationFromGini(gini, totalClicks, totalPsychologists);

  return {
    concentration_label: concentration.label,
    concentration_level: concentration.level,
    curve: buildWhatsAppCurve(sortedAscendingCounts, totalClicks),
    gini,
    psychologists_with_clicks: psychologistsWithClicks,
    psychologists_without_clicks: Math.max(0, totalPsychologists - psychologistsWithClicks),
    source: "contact_request.channel=whatsapp+psychologist_profile.published",
    summary: buildWhatsAppDistributionSummary({
      top20,
      totalClicks,
      totalPsychologists,
    }),
    top_10_percent: top10,
    top_20_percent: top20,
    total_clicks: totalClicks,
    total_psychologists: totalPsychologists,
  };
};
