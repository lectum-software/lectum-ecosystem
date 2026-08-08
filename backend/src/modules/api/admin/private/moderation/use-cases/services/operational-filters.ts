import type {
  AdminModerationOperationalAlertDTO,
  AdminModerationOperationalAlertsGroup,
  AdminModerationOperationalAlertsQuery,
} from "../../DTOs/IAdminModerationDTO";

import { normalizeFilter, normalizeSearch } from "./events";

import type { NormalizedOperationalAlertsQuery } from "./operational-alerts";

import { postReportReasonLabel } from "./reports";

export const normalizeOperationalGroup = (
  value?: string | null,
): AdminModerationOperationalAlertsGroup => {
  const normalized = normalizeFilter(value);

  return normalized === "denuncias" || normalized === "compliance" || normalized === "operacional"
    ? normalized
    : "all";
};

export const normalizeOperationalStatus = (
  value?: string | null,
): NonNullable<AdminModerationOperationalAlertsQuery["status"]> => {
  const normalized = normalizeFilter(value).toLowerCase();

  return normalized === "pending" || normalized === "upheld" || normalized === "dismissed"
    ? normalized
    : "all";
};

export const normalizeOperationalContentType = (
  value?: string | null,
): NonNullable<AdminModerationOperationalAlertsQuery["contentType"]> => {
  const normalized = normalizeFilter(value).toLowerCase();

  return normalized === "post" || normalized === "reply" ? normalized : "all";
};

export const normalizeOperationalAlertType = (
  value?: string | null,
): NonNullable<AdminModerationOperationalAlertsQuery["alertType"]> => {
  const normalized = normalizeFilter(value).toLowerCase();

  return normalized === "invalid_whatsapp" ||
    normalized === "patient_post_without_coverage" ||
    normalized === "post_report" ||
    normalized === "professional_crp_pending" ||
    normalized === "psychologist_no_conversion" ||
    normalized === "registration_error" ||
    normalized === "unpublished_required_settings"
    ? normalized
    : "all";
};

export const normalizeOperationalPlan = (
  value?: string | null,
): NonNullable<AdminModerationOperationalAlertsQuery["plan"]> => {
  const normalized = normalizeFilter(value).toLowerCase();

  return normalized === "cortesia" || normalized === "gratuito" || normalized === "profissional"
    ? normalized
    : "all";
};

export const normalizeOperationalProfileStatus = (
  value?: string | null,
): NonNullable<AdminModerationOperationalAlertsQuery["profileStatus"]> => {
  const normalized = normalizeFilter(value).toLowerCase();

  return normalized === "active" || normalized === "inactive" ? normalized : "all";
};

export const normalizeOperationalReporter = (
  value?: string | null,
): NonNullable<AdminModerationOperationalAlertsQuery["reporter"]> => {
  const normalized = normalizeFilter(value).toLowerCase();

  return normalized === "paciente" || normalized === "psicologo" ? normalized : "all";
};

export const normalizeOperationalUserRole = (
  value?: string | null,
): NonNullable<AdminModerationOperationalAlertsQuery["userRole"]> => {
  const normalized = normalizeFilter(value).toLowerCase();

  return normalized === "paciente" || normalized === "psicologo" ? normalized : "all";
};

export const normalizeOperationalReason = (
  value?: string | null,
): NonNullable<AdminModerationOperationalAlertsQuery["reason"]> => {
  const normalized = normalizeFilter(value).toLowerCase();

  return normalized === "spam" ||
    normalized === "abuse" ||
    normalized === "self_harm" ||
    normalized === "privacy" ||
    normalized === "other"
    ? normalized
    : "all";
};

export const parseOperationalDateOnly = (value: string | undefined, boundary: "end" | "start") => {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  if (Number.isNaN(date.getTime())) return null;

  if (boundary === "start") date.setHours(0, 0, 0, 0);
  else date.setHours(23, 59, 59, 999);

  return date;
};

export const normalizedText = (value?: string | null) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

export const operationalFactValue = (alert: AdminModerationOperationalAlertDTO, label: string) =>
  alert.facts.find((fact) => normalizedText(fact.label) === normalizedText(label))?.value ?? "";

export const operationalProfilePublishedStatus = (alert: AdminModerationOperationalAlertDTO) => {
  const published = normalizedText(operationalFactValue(alert, "Publicado"));
  if (["ativo", "publicado", "sim", "true"].includes(published)) return true;
  if (["despublicado", "false", "inativo", "nao"].includes(published)) return false;

  return null;
};

export const operationalAlertMatchesPlan = (
  alert: AdminModerationOperationalAlertDTO,
  plan: NonNullable<AdminModerationOperationalAlertsQuery["plan"]>,
) => {
  if (plan === "all") return true;

  const currentPlan = normalizedText(operationalFactValue(alert, "Plano"));
  const currentSource = normalizedText(operationalFactValue(alert, "Origem"));
  const isCourtesy =
    currentSource === "admin_grant" ||
    currentSource.includes("cortesia") ||
    currentPlan.includes("cortesia");

  if (plan === "cortesia") {
    return isCourtesy;
  }

  if (plan === "profissional") {
    return (
      !isCourtesy &&
      (alert.professional?.is_subscriber === true || currentPlan.includes("profissional"))
    );
  }

  return currentPlan.includes("gratuito");
};

export const operationalStatusAliases: Record<
  Exclude<NonNullable<AdminModerationOperationalAlertsQuery["status"]>, "all">,
  string[]
> = {
  dismissed: ["rejeitada", "rejected", "improcedente", "dismissed"],
  pending: ["pendente", "pending", "em_analise", "em analise", "in_review", "in review"],
  upheld: ["resolvida", "resolved", "procedente", "upheld"],
};

export const operationalAlertMatchesSearch = (
  alert: AdminModerationOperationalAlertDTO,
  search: string,
) => {
  if (!search) return true;

  return [
    alert.action_label,
    alert.community?.name,
    alert.description,
    alert.entity.label,
    alert.priority,
    alert.professional?.gender,
    alert.professional?.name,
    alert.professional?.role_label,
    alert.source,
    alert.title,
    alert.type,
    alert.user?.name,
    alert.user?.role_label,
    alert.user?.role,
    ...alert.facts.flatMap((fact) => [fact.label, fact.value]),
  ]
    .filter(Boolean)
    .some((value) => normalizedText(value).includes(search));
};

export const operationalAlertMatchesUserRole = (
  alert: AdminModerationOperationalAlertDTO,
  userRole: NonNullable<AdminModerationOperationalAlertsQuery["userRole"]>,
) => {
  if (userRole === "all") return true;

  const alertRole = normalizedText(alert.user?.role ?? alert.professional?.role_label);
  if (userRole === "psicologo" && ["psicologa", "psicologo"].includes(alertRole)) return true;

  return alertRole === userRole;
};

export const operationalAlertMatchesFilters = (
  alert: AdminModerationOperationalAlertDTO,
  query: NormalizedOperationalAlertsQuery,
) => {
  const search = normalizeSearch(query.q);
  if (!operationalAlertMatchesSearch(alert, search)) return false;

  const from = parseOperationalDateOnly(query.from, "start");
  const to = parseOperationalDateOnly(query.to, "end");
  if (from && alert.created_at < from) return false;
  if (to && alert.created_at > to) return false;

  if (query.alertType !== "all" && alert.type !== query.alertType) {
    return false;
  }

  if (!operationalAlertMatchesUserRole(alert, query.userRole)) return false;

  if (!operationalAlertMatchesPlan(alert, query.plan)) return false;

  if (query.profileStatus !== "all") {
    const published = operationalProfilePublishedStatus(alert);
    if (query.profileStatus === "active" && published !== true) return false;
    if (query.profileStatus === "inactive" && published !== false) return false;
  }

  if (query.contentType !== "all" && alert.report?.content.type !== query.contentType) {
    return false;
  }

  if (query.status !== "all") {
    const reportStatus = normalizedText(operationalFactValue(alert, "Status"));
    if (!operationalStatusAliases[query.status].includes(reportStatus)) return false;
  }

  if (query.reporter !== "all") {
    const reporter = normalizedText(operationalFactValue(alert, "Denunciante"));
    if (reporter !== query.reporter) return false;
  }

  if (query.reason !== "all") {
    const reason = normalizedText(operationalFactValue(alert, "Motivo"));
    const expectedLabel = normalizedText(postReportReasonLabel(query.reason));
    if (reason !== query.reason && reason !== expectedLabel) {
      return false;
    }
  }

  return true;
};

export const operationalAlertMatchesGroup = (
  alert: AdminModerationOperationalAlertDTO,
  group: AdminModerationOperationalAlertsGroup,
) => {
  if (group === "all") return true;
  if (group === "operacional") return alert.group === "operacional";
  if (group === "compliance") return alert.group === "compliance";

  return alert.group === "denuncias";
};

export const normalizeOperationalAlertsQuery = (
  query: AdminModerationOperationalAlertsQuery = {},
): NormalizedOperationalAlertsQuery => ({
  ...query,
  alertType: normalizeOperationalAlertType(query.alertType),
  contentType: normalizeOperationalContentType(query.contentType),
  group: normalizeOperationalGroup(query.group),
  plan: normalizeOperationalPlan(query.plan),
  profileStatus: normalizeOperationalProfileStatus(query.profileStatus),
  reason: normalizeOperationalReason(query.reason),
  reporter: normalizeOperationalReporter(query.reporter),
  status: normalizeOperationalStatus(query.status),
  userRole: normalizeOperationalUserRole(query.userRole),
});
