import type {
  AdminPsychologistAccount,
  AdminPsychologistBilling,
  AdminPsychologistDetail,
  AdminPsychologistDetailMetric,
  AdminPsychologistEngagementMetric,
  AdminPsychologistStatistics,
} from "@/api/req/psychologists";
import type { StatisticsMetricComparison } from "./config";
import {
  currencyFormatter,
  dateFormatter,
  GENERAL_METRIC_LABELS,
  numberFormatter,
  resolveCrpRegionFieldValue,
  timeFormatter,
} from "./config";
import { formatDayMonth, formatDayShortMonth } from "./date-period";
import { onlyDigits } from "./schemas";

export const formatDateTime = (value?: string | null) => {
  if (!value) return "Não informado";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Não informado";

  return `${dateFormatter.format(date)} às ${timeFormatter.format(date)}`;
};

export const formatNullable = (value?: string | number | null) => {
  if (value === null || value === undefined || value === "") return "Não informado";

  return String(value);
};

export const formatCrpRegion = (value?: string | null) =>
  formatNullable(resolveCrpRegionFieldValue(value));

export const formatAdminHeaderCrp = (detail: AdminPsychologistDetail) => {
  const professional = detail.profile.professional;
  const [fallbackRegion, ...fallbackRegistrationParts] = String(detail.header.crp ?? "").split("/");
  const regionDigits = onlyDigits(professional.regional_crp || fallbackRegion).slice(0, 2);
  const registrationDigits = onlyDigits(
    professional.registration_number || fallbackRegistrationParts.join("/"),
  ).slice(0, 5);

  if (regionDigits && registrationDigits) {
    return `${regionDigits.padStart(2, "0")}/${registrationDigits.padStart(5, "0")}`;
  }

  return detail.header.crp || "CRP não informado";
};

export const getPsychologistTitle = (gender?: string | null) => {
  const normalized = String(gender ?? "")
    .trim()
    .toLowerCase();

  return normalized === "feminino" || normalized === "mulher" ? "Psicóloga" : "Psicólogo";
};

export const getHeaderPlanLabel = (detail: AdminPsychologistDetail) => {
  const subscription = detail.general.subscription;
  const hasCourtesy =
    subscription.source === "admin_grant" &&
    subscription.status === "ativa" &&
    subscription.plan_slug !== "gratuito";

  if (hasCourtesy) return "Plano de cortesia";

  return detail.header.plan_name || "Sem plano ativo";
};

export const getHeaderRatingLabel = (header: AdminPsychologistDetail["header"]) => {
  const rating = header.rating_avg.toLocaleString("pt-BR", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 1,
  });

  return `${rating} (${numberFormatter.format(header.rating_count)})`;
};

export const getHeaderAccountStatus = (
  account: AdminPsychologistAccount | undefined,
  state: { isError: boolean; isLoading: boolean },
) => {
  if (!account) {
    if (state.isError) {
      return {
        label: "Conta indisponível",
        title: "Não foi possível carregar o status real da conta.",
      };
    }

    return {
      label: state.isLoading ? "Conta..." : "Conta indisponível",
      title: "Carregando status real da conta.",
    };
  }

  if (account.account_status !== "active") {
    const statusLabel = account.account_status_label.toLocaleLowerCase("pt-BR");

    return {
      label: `Conta ${statusLabel}`,
      title: "Login bloqueado enquanto a conta não estiver ativa.",
    };
  }

  if (!account.active) {
    return {
      label: "Login bloqueado",
      title: "Login bloqueado porque a conta está inativa.",
    };
  }

  if (!account.confirmed) {
    return {
      label: "E-mail pendente",
      title: "E-mail ainda não confirmado; a conta não está totalmente liberada.",
    };
  }

  return {
    label: "Conta ativa",
    title: "E-mail confirmado e login liberado.",
  };
};

const hasTextValue = (value?: string | null) => Boolean(value?.trim());

const hasItemsValue = <T>(value?: T[] | null) => Boolean(value?.length);

export const hasProfileVisibilityConfigurationGaps = (detail: AdminPsychologistDetail) => {
  const { content, personal, professional } = detail.profile;
  const address = personal.address;

  return !(
    hasTextValue(detail.header.name) &&
    hasTextValue(content.video_url) &&
    hasTextValue(professional.modality) &&
    hasItemsValue(professional.specialties) &&
    hasItemsValue(professional.services) &&
    hasItemsValue(professional.approaches) &&
    hasItemsValue(professional.target_audience) &&
    hasTextValue(professional.gender) &&
    hasTextValue(personal.cpf) &&
    Boolean(personal.birthdate) &&
    (hasTextValue(professional.crp) ||
      (hasTextValue(professional.regional_crp) &&
        hasTextValue(professional.registration_number))) &&
    hasTextValue(address.state) &&
    hasTextValue(address.city)
  );
};

export const needsProfileConfigurationAlert = (detail: AdminPsychologistDetail) =>
  !detail.header.active && hasProfileVisibilityConfigurationGaps(detail);

export const formatGrantedByName = (value?: string | null) => {
  const formatted = formatNullable(value);
  if (formatted === "Não informado") return formatted;

  const nameOnly = formatted
    .replace(/\s+[\w.!#$%&'*+/=?^`{|}~-]+@[\w-]+(?:\.[\w-]+)+/g, "")
    .replace(/\s*\([^)]*\)\s*$/g, "")
    .trim();

  return nameOnly || formatted;
};

export const formatMoney = (cents: number | null) => {
  if (cents === null) return "Não informado";

  return currencyFormatter.format(cents / 100);
};

const formatPlanInterval = (interval?: string | null) => {
  const normalized = String(interval ?? "")
    .trim()
    .toLowerCase();

  if (!normalized) return null;
  if (["month", "monthly", "mes", "mês"].includes(normalized)) return "mês";
  if (["year", "yearly", "ano"].includes(normalized)) return "ano";

  return normalized;
};

export const formatPlanPrice = (cents: number | null, interval?: string | null) => {
  const price = formatMoney(cents);
  const planInterval = formatPlanInterval(interval);

  return planInterval && price !== "Nao informado" && price !== "Não informado"
    ? `${price}/${planInterval}`
    : price;
};

export const formatInputDate = (value?: string | null) => {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toISOString().slice(0, 10);
};

export const limitDateInputToFourDigitYear = (value: string) =>
  value.replace(/^\+?(\d{4})\d+-(\d{2})-(\d{2})$/, "$1-$2-$3");

export const normalizeCpfInput = (value?: string | null) => onlyDigits(value).slice(0, 11);

export const formatCpfInput = (value?: string | null) => {
  const digits = normalizeCpfInput(value);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) {
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  }

  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
};

export const formatCpfDisplay = (value?: string | null) => {
  const formatted = formatCpfInput(value);

  return formatted || formatNullable(value);
};

export const formatPhoneDisplay = (value?: string | null) => {
  const raw = String(value ?? "").trim();
  if (!raw) return "Não informado";

  const digits = onlyDigits(raw);
  if (!digits) return raw;

  const hasBrazilCode = digits.startsWith("55") && [12, 13].includes(digits.length);
  const nationalDigits = hasBrazilCode ? digits.slice(2) : digits;
  const prefix = hasBrazilCode ? "+55 " : "";

  if (nationalDigits.length === 11) {
    return `${prefix}(${nationalDigits.slice(0, 2)}) ${nationalDigits.slice(2, 7)}-${nationalDigits.slice(7)}`;
  }

  if (nationalDigits.length === 10) {
    return `${prefix}(${nationalDigits.slice(0, 2)}) ${nationalDigits.slice(2, 6)}-${nationalDigits.slice(6)}`;
  }

  if (nationalDigits.length === 9) {
    return `${nationalDigits.slice(0, 5)}-${nationalDigits.slice(5)}`;
  }

  if (nationalDigits.length === 8) {
    return `${nationalDigits.slice(0, 4)}-${nationalDigits.slice(4)}`;
  }

  return raw;
};

export const formatHeaderWhatsappDisplay = (value?: string | null) =>
  formatPhoneDisplay(value).replace(/^\+55\s*/, "");

export const formatWhatsappInput = (value?: string | null) => {
  const digits = onlyDigits(value).slice(0, 15);
  if (!digits) return "";

  const formatNationalPhone = (nationalDigits: string, prefix = "") => {
    if (nationalDigits.length <= 2) {
      return nationalDigits ? `${prefix}(${nationalDigits}` : prefix.trim();
    }

    if (nationalDigits.length <= 7) {
      return `${prefix}(${nationalDigits.slice(0, 2)}) ${nationalDigits.slice(2)}`;
    }

    if (nationalDigits.length <= 10) {
      return `${prefix}(${nationalDigits.slice(0, 2)}) ${nationalDigits.slice(2, 6)}-${nationalDigits.slice(6)}`;
    }

    return `${prefix}(${nationalDigits.slice(0, 2)}) ${nationalDigits.slice(2, 7)}-${nationalDigits.slice(7, 11)}`;
  };

  if (digits === "55") {
    return "+55 ";
  }

  if (digits.startsWith("55") && digits.length > 2) {
    return formatNationalPhone(digits.slice(2), "+55 ");
  }

  if (digits.length <= 11) {
    return formatNationalPhone(digits);
  }

  return `+${digits}`;
};

export const formatZipInput = (value?: string | null) => {
  const digits = onlyDigits(value).slice(0, 8);
  if (digits.length <= 5) return digits;

  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
};

const formatZipDisplay = (value?: string | null) => {
  const raw = String(value ?? "").trim();
  if (!raw) return null;

  const digits = onlyDigits(raw);
  if (digits.length === 8) return `${digits.slice(0, 5)}-${digits.slice(5)}`;

  return raw;
};

export const emptyToNull = (value?: string | null) => {
  const normalized = String(value ?? "").trim();

  return normalized || null;
};

const normalizeAddressPart = (value?: string | null) => {
  const part = String(value ?? "").trim();

  return part || null;
};

export const formatPersonalAddress = (
  address: AdminPsychologistDetail["profile"]["personal"]["address"],
) => {
  const formattedZip = formatZipDisplay(address.zip);
  const line = [
    normalizeAddressPart(address.street),
    normalizeAddressPart(address.number),
    normalizeAddressPart(address.complement),
  ]
    .filter(Boolean)
    .join(", ");
  const cityLine = [
    normalizeAddressPart(address.district),
    normalizeAddressPart(address.city),
    normalizeAddressPart(address.state),
    formattedZip ? `CEP ${formattedZip}` : null,
  ]
    .filter(Boolean)
    .join(" - ");

  return [line, cityLine].filter(Boolean).join("\n") || formatNullable(address.full);
};

export const formatPaymentMethod = (method: AdminPsychologistBilling["payment_method"]) => {
  if (!method) return "Nao informado";

  const brand = method.brand || "Cartao";
  const last4 = method.last4 ? `•••• ${method.last4}` : "final nao informado";
  const expiration =
    method.exp_month && method.exp_year
      ? ` · validade ${String(method.exp_month).padStart(2, "0")}/${method.exp_year}`
      : "";

  return `${brand} ${last4}${expiration}`;
};

export const formatMetricValue = (metric: AdminPsychologistDetailMetric) => {
  if (metric.value === null) return "—";
  if (metric.unit === "decimal") {
    return metric.value.toLocaleString("pt-BR", {
      maximumFractionDigits: 1,
      minimumFractionDigits: 1,
    });
  }
  if (metric.unit === "position") return `Top #${numberFormatter.format(metric.value)}`;

  return numberFormatter.format(metric.value);
};

export const formatMetricLabel = (metric: AdminPsychologistDetailMetric) =>
  GENERAL_METRIC_LABELS[metric.id] ?? metric.label;

export const findGeneralMetric = (metrics: AdminPsychologistDetailMetric[], id: string) =>
  metrics.find((metric) => metric.id === id);

export const formatRatingCountLabel = (count: number) =>
  `${numberFormatter.format(count)} ${count === 1 ? "avaliação" : "avaliações"}`;

type BusinessProfileConversion = AdminPsychologistStatistics["business"]["profile_conversion"];

const formatWhatsAppClickLabel = (value: number) =>
  `${numberFormatter.format(value)} ${value === 1 ? "contato WhatsApp" : "contatos WhatsApp"}`;

const formatProfileConversionPace = (conversion: BusinessProfileConversion) =>
  `Ritmo estimado: ${formatWhatsAppClickLabel(
    conversion.quality.normalized_whatsapp_clicks_30d,
  )} a cada 30 dias`;

const formatProfileConversionReference = (conversion: BusinessProfileConversion) => {
  const reference = conversion.platform_position.reference_whatsapp_clicks;

  if (reference === null) return "Referência da plataforma indisponível no período";

  return `Referência da plataforma: mediana de ${formatWhatsAppClickLabel(reference)} no período`;
};

export const formatProfileConversionSupport = (conversion: BusinessProfileConversion) => {
  if (conversion.quality.id === "insufficient_data") {
    return "";
  }

  return `${formatProfileConversionPace(conversion)} · ${formatProfileConversionReference(
    conversion,
  )}.`;
};

export const formatDurationSeconds = (value: number | null) => {
  if (typeof value !== "number") return "Indisponível";

  const seconds = Math.max(0, Math.round(value));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainder = seconds % 60;

  if (hours > 0) {
    return `${numberFormatter.format(hours)}h ${String(minutes).padStart(2, "0")}min`;
  }
  if (minutes > 0)
    return `${numberFormatter.format(minutes)}min ${String(remainder).padStart(2, "0")}s`;

  return `${numberFormatter.format(seconds)}s`;
};

export const formatEngagementMetricValue = (metric: AdminPsychologistEngagementMetric) => {
  if (!metric.available || metric.value === null) return "Indisponível";
  if (metric.unit === "percentage") {
    return `${metric.value.toLocaleString("pt-BR", {
      maximumFractionDigits: 1,
      minimumFractionDigits: 1,
    })}%`;
  }
  if (metric.unit === "seconds") return formatDurationSeconds(metric.value);
  if (metric.unit === "position") return `#${numberFormatter.format(metric.value)}`;

  return numberFormatter.format(metric.value);
};

export const formatPlatformDuration = (value: number | null) => {
  return formatDurationSeconds(value);
};

export const formatChange = (value: number | null) => {
  if (value === null) return "sem base anterior";
  if (value === 0) return "0%";

  return `${value > 0 ? "+" : ""}${value.toLocaleString("pt-BR", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 0,
  })}%`;
};

export const formatPreviousPeriod = (
  comparison?: AdminPsychologistEngagementMetric["comparison"] | null,
) => {
  if (!comparison) return "período anterior";

  return `${formatDayMonth(comparison.previous_from)} - ${formatDayMonth(comparison.previous_to)}`;
};

const roundStatisticsPercent = (value: number) => {
  return Number(value.toFixed(1));
};

const calculateStatisticsChangePercent = (current: number, previous: number) => {
  if (previous === 0) return current === 0 ? 0 : null;

  return roundStatisticsPercent(((current - previous) / previous) * 100);
};

export const buildStatisticsMetricComparison = ({
  current,
  period,
  previous,
}: {
  current: number;
  period: AdminPsychologistStatistics["period"];
  previous: number;
}): StatisticsMetricComparison => {
  const change = calculateStatisticsChangePercent(current, previous);

  return {
    change_percent: change,
    previous_from: period.previous_from,
    previous_to: period.previous_to,
    previous_value: previous,
    trend: change === null ? "unavailable" : change > 0 ? "up" : change < 0 ? "down" : "flat",
  };
};

export const formatStatisticsPeriodSummary = (period: AdminPsychologistStatistics["period"]) =>
  `${period.label} · ${formatDayShortMonth(period.from)} a ${formatDayShortMonth(period.to)}`;

export { capitalizeOptionLabel, listText } from "./text";
