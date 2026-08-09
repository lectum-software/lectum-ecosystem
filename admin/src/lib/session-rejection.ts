const REJECTED_ADMIN_SESSION_CODES = new Set([
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
 * Só encerra o estado local quando a própria API rejeitou a sessão com um
 * código conhecido. Um 401 genérico de proxy não prova que o cookie foi
 * revogado ou que deixou de ser válido no backend.
 */
export const isConfirmedAdminSessionRejection = (error: unknown) => {
  const response = readResponse(error);
  if (!response || Reflect.get(response, "status") !== 401) return false;

  const data = Reflect.get(response, "data");
  if (!data || typeof data !== "object") return false;

  const code = Reflect.get(data, "code");
  return typeof code === "string" && REJECTED_ADMIN_SESSION_CODES.has(code);
};
