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

export const cfpErrorTitle = "Sistema do CFP indisponível";

export const cfpAttemptLimitMessage =
  "Você excedeu o número de tentativas de busca de CPF. Entre em contato com o suporte para continuar a verificação do seu registro.";

export const cfpProviderUnavailableMessage =
  "O sistema do Conselho Federal de Psicologia está indisponível no momento. Fale com o suporte para continuarmos a verificação manual do seu registro.";

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

const cfpAttemptLimitCodes = new Set(["cfp_search_attempts_exceeded"]);
const cfpProviderIssueCodes = new Set([
  "cfp_provider_config_error",
  "cfp_provider_error",
  "cfp_provider_rate_limited",
  "cfp_provider_unavailable",
  "cfp_provider_validation_error",
]);

const isGenericConnectionMessage = (message: string) =>
  /conectar ao servi\u00e7o|servi\u00e7o temporariamente indispon\u00edvel|temporariamente indispon\u00edvel/i.test(
    message,
  );

export const resolveApiError = (error: unknown) => {
  const apiError = error as ApiError;
  const data = isRecord(apiError?.data) ? apiError.data : {};
  const responseData = isRecord(apiError?.response?.data) ? apiError.response.data : {};
  const status =
    getStatusValue(data.status) ||
    getStatusValue(responseData.status) ||
    getStatusValue(apiError?.response?.status);
  const code = getStringValue(data.code) || getStringValue(responseData.code);
  const rawMessage = getSafeApiErrorMessage(error, cfpProviderUnavailableMessage);
  const isAttemptLimit = Boolean(code && cfpAttemptLimitCodes.has(code));
  const isProviderIssue = Boolean(code && cfpProviderIssueCodes.has(code));
  const shouldUseProviderUnavailableMessage =
    isProviderIssue ||
    (typeof status === "number" && status >= 500) ||
    (!status && isGenericConnectionMessage(rawMessage));

  return {
    code,
    message: isAttemptLimit
      ? cfpAttemptLimitMessage
      : shouldUseProviderUnavailableMessage
        ? cfpProviderUnavailableMessage
        : rawMessage,
    showSupportGuidance: true,
    status,
  };
};

export type ResolvedApiError = ReturnType<typeof resolveApiError>;

export const supportableCfpErrorCodes = new Set([
  "cfp_provider_config_error",
  "cfp_provider_error",
  "cfp_provider_rate_limited",
  "cfp_provider_unavailable",
  "cfp_provider_validation_error",
  "cfp_search_attempts_exceeded",
]);

export const shouldShowCfpSupportGuidance = (error?: ResolvedApiError | null) =>
  Boolean(
    error &&
      (error.showSupportGuidance ||
        (error.code && supportableCfpErrorCodes.has(error.code)) ||
        (typeof error.status === "number" && error.status >= 400)),
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
