export const USER_COOKIE_AUTH_HEADERS = {
  "X-Requested-With": "Lectum-User-Cookie-Auth",
} as const;

type MutableRequestHeaders = {
  has: (name: string) => boolean;
  set: (name: string, value: string) => unknown;
};

/**
 * O bearer armazenado existe somente para rollout legado. Um token explícito
 * da própria requisição, como a troca Admin view-as, sempre tem precedência.
 */
export const applyStoredBearerFallback = (
  headers: MutableRequestHeaders,
  storedToken?: string | null,
) => {
  if (!storedToken || headers.has("Authorization")) return;

  headers.set("Authorization", `Bearer ${storedToken}`);
};
