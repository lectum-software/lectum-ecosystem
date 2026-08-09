const REJECTED_USER_SESSION_CODES = new Set([
  "token_device_not_authorized",
  "token_invalid",
  "token_mal_formatted",
  "token_not_authorized",
  "token_not_provided",
]);

const readResponse = (error: unknown) => {
  if (!error || typeof error !== "object") return null;

  const response = Reflect.get(error, "response");
  return response && typeof response === "object" ? response : null;
};

/**
 * Um status genérico de proxy não confirma que a sessão HttpOnly foi
 * encerrada. A limpeza local só é segura quando a API devolve um dos códigos
 * controlados que indicam que o token atual já não pode autenticar.
 */
export const isConfirmedUserSessionRejection = (error: unknown) => {
  const response = readResponse(error);
  if (!response || Reflect.get(response, "status") !== 401) return false;

  const data = Reflect.get(response, "data");
  if (!data || typeof data !== "object") return false;

  const code = Reflect.get(data, "code");
  return typeof code === "string" && REJECTED_USER_SESSION_CODES.has(code);
};
