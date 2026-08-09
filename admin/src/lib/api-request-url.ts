const UNCONFIGURED_ADMIN_API_URL = "https://api.invalid";

export const resolveAdminApiRequestUrl = (apiUrl?: string | null) =>
  apiUrl?.trim() || UNCONFIGURED_ADMIN_API_URL;
