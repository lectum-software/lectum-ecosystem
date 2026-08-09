import type { AdminModerationOperationalAlert } from "@/api/req/moderation";
import { cn } from "@/lib/utils";

import { operationalTypeLabel } from "./report-support";

export const operationalTablePendingLabels: Partial<
  Record<AdminModerationOperationalAlert["type"], string>
> = {
  patient_post_without_coverage: "Post sem cobertura",
  psychologist_no_conversion: "Sem conversão",
  registration_error: "Erro no cadastro",
  unpublished_required_settings: "Perfil não publicado",
};

export const operationalTablePendingClass: Partial<
  Record<AdminModerationOperationalAlert["type"], string>
> = {
  patient_post_without_coverage: "bg-warning-soft text-warning",
  psychologist_no_conversion: "bg-warning-soft text-warning",
  registration_error: "bg-danger-soft text-danger",
  unpublished_required_settings: "bg-danger-soft text-danger",
};

export const operationalTablePendingLabel = (alert: AdminModerationOperationalAlert) =>
  operationalTablePendingLabels[alert.type] ?? operationalTypeLabel(alert.type);

export const alertUserName = (alert: AdminModerationOperationalAlert) =>
  alert.user?.name ?? alert.professional?.name ?? alert.entity.label;

export const alertUserRoleLabel = (alert: AdminModerationOperationalAlert) =>
  alert.user?.role_label ??
  alert.professional?.role_label ??
  (alert.entity.type === "patient" || alert.entity.type === "post" || alert.entity.type === "reply"
    ? "Paciente"
    : alert.entity.type === "psychologist"
      ? "Psicólogo"
      : "Usuário");

export const alertUserVerified = (alert: AdminModerationOperationalAlert) =>
  Boolean(alert.user?.show_verified_badge ?? alert.professional?.show_verified_badge);

export const OperationalPendingBadge = ({ alert }: { alert: AdminModerationOperationalAlert }) => {
  const label = operationalTablePendingLabel(alert);

  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center rounded-full px-2.5 py-1 text-xs font-medium",
        operationalTablePendingClass[alert.type] ?? "bg-surface-muted text-muted",
      )}
      title={label}
    >
      <span className="truncate">{label}</span>
    </span>
  );
};

export type OperationalDetailItem = {
  label: string;
  value: string;
};

export const detailValue = (...values: (string | null | undefined)[]) => {
  const seen = new Set<string>();
  const uniqueValues = values
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value))
    .filter((value) => {
      const key = value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

  return uniqueValues.join(" · ") || "—";
};
