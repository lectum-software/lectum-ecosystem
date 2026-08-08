import { getSafeApiErrorMessage } from "@/api/errors";

export const nextStepHref = "/app/profissional/perfil/configurar";

export const supportMessage =
  "Ol\u00e1, preciso de ajuda com a verifica\u00e7\u00e3o profissional na Lectum.";

export const supportHref = `https://wa.me/5537998739534?text=${encodeURIComponent(supportMessage)}`;

export const supportLinkProps = {
  href: supportHref,
  rel: "noopener noreferrer",
  target: "_blank",
} as const;

export const cfpSystemErrorMessage =
  "N\u00e3o foi poss\u00edvel concluir a verifica\u00e7\u00e3o autom\u00e1tica agora.";

export type ApiError = Error & {
  data?: unknown;
  response?: {
    data?: unknown;
    status?: unknown;
  };
};

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

export const getStringValue = (value: unknown) =>
  typeof value === "string" && value.trim().length > 0 ? value : undefined;

export const getStatusValue = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
};

export const resolveApiError = (error: unknown) => {
  const apiError = error as ApiError;
  const data = isRecord(apiError?.data) ? apiError.data : {};
  const responseData = isRecord(apiError?.response?.data) ? apiError.response.data : {};
  const status =
    getStatusValue(data.status) ||
    getStatusValue(responseData.status) ||
    getStatusValue(apiError?.response?.status);
  const rawMessage = getSafeApiErrorMessage(error, cfpSystemErrorMessage);

  return {
    code: getStringValue(data.code) || getStringValue(responseData.code),
    message: rawMessage,
    status,
  };
};

export type ResolvedApiError = ReturnType<typeof resolveApiError>;

export const supportableCfpErrorCodes = new Set([
  "cfp_provider_config_error",
  "cfp_provider_error",
  "cfp_provider_rate_limited",
  "cfp_provider_unavailable",
]);

export const shouldShowCfpSupportGuidance = (error?: ResolvedApiError | null) =>
  Boolean(
    error &&
      ((error.code && supportableCfpErrorCodes.has(error.code)) ||
        (typeof error.status === "number" && error.status >= 500)),
  );

export const formatCfpRegistrationDate = (value?: string | null) => {
  const rawValue = value?.trim();

  if (!rawValue) return "Não informada";

  const alreadyFormattedDate = rawValue.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (alreadyFormattedDate) return rawValue;

  const isoDate = rawValue.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoDate) {
    const [, year, month, day] = isoDate;
    return `${day}/${month}/${year}`;
  }

  const parsedDate = new Date(rawValue);
  if (!Number.isNaN(parsedDate.getTime())) {
    return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(parsedDate);
  }

  return rawValue;
};
