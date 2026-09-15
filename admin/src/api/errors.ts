type UnknownRecord = Record<string, unknown>;

const asRecord = (value: unknown): UnknownRecord | null =>
  typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as UnknownRecord)
    : null;

const statusMessage = (status: number | undefined, fallback: string) => {
  if (status === 400 || status === 422) {
    return "Revise os dados informados e tente novamente.";
  }
  if (status === 401) return "Sua sessão expirou. Entre novamente.";
  if (status === 403) return "Você não tem permissão para realizar esta ação.";
  if (status === 404) return "O registro solicitado não foi encontrado.";
  if (status === 408) return "A operação demorou mais que o esperado. Tente novamente.";
  if (status === 409) {
    return "A operação não pôde ser concluída porque os dados foram alterados ou já existem.";
  }
  if (status === 413) return "O arquivo enviado é maior que o limite permitido.";
  if (status === 429) return "Muitas tentativas. Aguarde e tente novamente.";
  if (status && status >= 500) return "Serviço temporariamente indisponível. Tente novamente.";

  return fallback;
};

const readStatus = (error: unknown) => {
  const errorRecord = asRecord(error);
  const response = asRecord(errorRecord?.response);
  const payload = asRecord(response?.data) ?? asRecord(errorRecord?.data) ?? errorRecord;
  const status = Number(response?.status ?? payload?.status);

  return Number.isInteger(status) ? status : undefined;
};

export const isRetryableAdminApiError = (error: unknown) => {
  const status = readStatus(error);

  return status === undefined || status === 408 || status === 429 || status >= 500;
};

export const getSafeAdminApiError = (
  error: unknown,
  fallback = "Não foi possível concluir a operação.",
) => statusMessage(readStatus(error), fallback);
