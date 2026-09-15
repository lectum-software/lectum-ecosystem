import type { Resolve } from "@/helpers/return";
import { error, msg } from "@/helpers/translate";
import type {
  AdminPsychologistReportActionDTO,
  AdminPsychologistReportResolveBody,
  IAdminPsychologistReportResolveDTO,
} from "../../DTOs/IAdminPsychologistFeedbackDTO";
import {
  AdminPsychologistFeedbackRepository,
  type AdminPsychologistReportAudit,
  type AdminPsychologistReportMutationResult,
  type AdminPsychologistReportRecord,
} from "../../repositories/AdminPsychologistFeedbackRepository";

import {
  canResolve,
  reportCommunity,
  reportStatusFromResolution,
  reportStatusLabelFromResolution,
  reportTitle,
  toReportItem,
} from "./reports";

import {
  adminRequired,
  DISMISS_REPORT_CONFIRMATION,
  invalidReportStatus,
  labelFromStatus,
  notFound,
  REVIEW_REPORT_CONFIRMATION,
  reportNotFound,
  reportStatusGroup,
  UPHOLD_REPORT_CONFIRMATION,
} from "./reviews";

export const loadReport = async (psychologistId: string, reportId: string) => {
  const repository = new AdminPsychologistFeedbackRepository();
  const profile = await repository.findPsychologist(psychologistId);
  if (!profile) return { profile: null, report: null, repository };

  const report = await repository.findReportForPsychologist(profile.user.id, reportId);

  return { profile, report, repository };
};

export const safeTargetSummary = (report: AdminPsychologistReportRecord) => ({
  Comunidade: reportCommunity(report).name,
  Conteudo: reportTitle(report),
  Tipo: report.reply ? "Resposta" : "Post",
});

export const createReportAudit = (input: {
  action: AdminPsychologistReportAudit["action"];
  adminId: string;
  changedFields: string[];
  metadata?: AdminPsychologistReportAudit["metadata"];
  reason: string;
  report: AdminPsychologistReportRecord;
  safeAfter?: AdminPsychologistReportAudit["safeAfter"];
  targetId: string;
}): AdminPsychologistReportAudit => ({
  action: input.action,
  adminId: input.adminId,
  changedFields: input.changedFields,
  metadata: input.metadata,
  reason: input.reason,
  safeAfter: input.safeAfter,
  safeBefore: {
    "Status da denuncia": labelFromStatus(input.report.status),
    ...safeTargetSummary(input.report),
  },
  targetId: input.targetId,
});

export const reportActionResponse = (
  result: AdminPsychologistReportMutationResult,
): AdminPsychologistReportActionDTO => ({
  affected_reports_count: result.affectedReportsCount,
  content_already_unavailable: result.contentAlreadyUnavailable,
  content_removed: result.contentRemoved,
  report: toReportItem(result.report),
  source: "post_report+admin_activity_log",
});

export const dismissConfirmationIsValid = (body: AdminPsychologistReportResolveBody) =>
  body.confirmation.trim().toUpperCase() === DISMISS_REPORT_CONFIRMATION;

export const upholdConfirmationIsValid = (body: AdminPsychologistReportResolveBody) =>
  body.confirmation.trim().toUpperCase() === UPHOLD_REPORT_CONFIRMATION;

export const resolveAdminPsychologistReport = async (
  data: IAdminPsychologistReportResolveDTO,
): Promise<Resolve> => {
  const admin = data.admin ?? data.auth;
  if (!admin?.id) return adminRequired();

  const { profile, report, repository } = await loadReport(data.p.id, data.p.reportId);
  if (!profile) return notFound();
  if (!report) return reportNotFound();

  const requestedStatus = reportStatusFromResolution(data.b.resolution);
  if (!requestedStatus) return invalidReportStatus();

  const isRevision = !canResolve(report.status);
  if (isRevision) {
    const currentGroup = reportStatusGroup(report.status);
    if (currentGroup === data.b.resolution) return invalidReportStatus();
    if (data.b.confirmation.trim().toUpperCase() !== REVIEW_REPORT_CONFIRMATION) {
      return {
        status: 400,
        ...error("admin_psychologist_report_review_confirmation_invalid", {}),
      };
    }

    const result = await repository.reviseResolution({
      audit: createReportAudit({
        action: "psychologist_report_decision_reviewed",
        adminId: admin.id,
        changedFields: ["Status da denuncia"],
        metadata: {
          previous_resolution: currentGroup,
          resolution: data.b.resolution,
          review: true,
        },
        reason: data.b.reason.trim(),
        report,
        safeAfter: {
          "Status da denuncia": reportStatusLabelFromResolution(data.b.resolution),
          ...safeTargetSummary(report),
        },
        targetId: profile.user.id,
      }),
      report,
      status: requestedStatus,
    });

    return {
      status: 200,
      ...msg("admin_psychologist_report_decision_reviewed", {}),
      data: reportActionResponse(result),
    };
  }

  if (data.b.resolution === "pending") return invalidReportStatus();

  if (data.b.resolution === "dismissed") {
    if (!dismissConfirmationIsValid(data.b)) {
      return {
        status: 400,
        ...error("admin_psychologist_report_dismiss_confirmation_invalid", {}),
      };
    }

    const result = await repository.resolveDismissed({
      audit: createReportAudit({
        action: "psychologist_report_dismissed",
        adminId: admin.id,
        changedFields: ["Status da denuncia"],
        metadata: {
          resolution: "dismissed",
        },
        reason: data.b.reason.trim(),
        report,
        safeAfter: {
          "Status da denuncia": "Improcedente",
          ...safeTargetSummary(report),
        },
        targetId: profile.user.id,
      }),
      report,
    });

    return {
      status: 200,
      ...msg("admin_psychologist_report_dismissed", {}),
      data: reportActionResponse(result),
    };
  }

  if (data.b.resolution !== "upheld") return invalidReportStatus();

  if (!upholdConfirmationIsValid(data.b)) {
    return {
      status: 400,
      ...error("admin_psychologist_report_uphold_confirmation_invalid", {}),
    };
  }

  const measure = data.b.measure === "remove_content" ? "remove_content" : "none";
  const action: AdminPsychologistReportAudit["action"] =
    measure === "remove_content"
      ? "psychologist_report_content_removed"
      : "psychologist_report_upheld";
  const result = await repository.resolveUpheld({
    audit: createReportAudit({
      action,
      adminId: admin.id,
      changedFields:
        measure === "remove_content"
          ? ["Status da denuncia", "Conteudo denunciado"]
          : ["Status da denuncia"],
      metadata: {
        measure,
        resolution: "upheld",
      },
      reason: data.b.reason.trim(),
      report,
      safeAfter: {
        "Medida aplicada":
          measure === "remove_content" ? "Remover conteudo denunciado" : "Manter conteudo",
        "Status da denuncia": "Procedente",
        ...safeTargetSummary(report),
      },
      targetId: profile.user.id,
    }),
    measure,
    report,
  });

  return {
    status: 200,
    ...msg(
      result.contentRemoved
        ? "admin_psychologist_report_content_removed"
        : "admin_psychologist_report_upheld",
      {},
    ),
    data: reportActionResponse(result),
  };
};
