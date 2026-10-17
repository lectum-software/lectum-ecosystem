import { error, msg } from "@/helpers/translate";
import type { user } from "@/interfaces/objects";
import {
  answerWhatsappReport,
  getWhatsappReport,
  latestWhatsappReport,
  openWhatsappReport,
} from "@/modules/whatsapp-reports/repository";

type Input = { auth: user; p: { id: string }; b: { count?: number } };
export type ReportOperation = "latest" | "show" | "open" | "claim" | "answer";

export async function reportService(data: Input, operation: ReportOperation) {
  if (!data.auth.id || data.auth.role !== "psicologo")
    return { status: 403, ...error("role_not_authorized", {}) };
  const userId = data.auth.id;
  if (operation === "answer") {
    const result = await answerWhatsappReport(userId, data.p.id, data.b.count);
    if (result.kind === "missing") return { status: 404, ...error("not_found", {}) };
    if (result.kind === "invalid")
      return { status: 400, ...error("invalid_whatsapp_report_count", {}) };
    return { status: 200, ...msg("update", {}), data: result.data };
  }
  const report =
    operation === "latest"
      ? await latestWhatsappReport(userId)
      : operation === "show"
        ? await getWhatsappReport(userId, data.p.id)
        : await openWhatsappReport(userId, data.p.id, operation === "claim");
  if (!report && operation === "show") return { status: 404, ...error("not_found", {}) };
  return { status: 200, ...msg("index", {}), data: report };
}
