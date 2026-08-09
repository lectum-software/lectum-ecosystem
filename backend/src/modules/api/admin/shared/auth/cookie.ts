import type { CookieOptions, Request, Response } from "express";
import type { Resolve } from "@/helpers/return";
import { getJwtCookieMaxAge } from "@/utils/jwt-cookie-ttl";
import { getAdminJwtTtlSeconds, isPublishedRuntime } from "@/utils/runtime-config";

export const ADMIN_AUTH_COOKIE_NAME = "lectum_admin_session";
export const ADMIN_COOKIE_AUTH_HEADER = "x-requested-with";
export const ADMIN_COOKIE_AUTH_CAPABILITY = "Lectum-Admin-Cookie-Auth";

const MAX_ADMIN_TOKEN_LENGTH = 4_096;

const adminCookieOptions = (maxAge = getAdminJwtTtlSeconds() * 1_000): CookieOptions => ({
  httpOnly: true,
  maxAge,
  path: "/api/admin",
  sameSite: "strict",
  secure: isPublishedRuntime(),
});

const normalizeToken = (value: unknown) => {
  if (typeof value !== "string") return null;

  const normalized = value.trim();
  if (!normalized || normalized.length > MAX_ADMIN_TOKEN_LENGTH) return null;

  return normalized;
};

export const getAdminBearerToken = (request: Request) => {
  const authorization = request.headers.authorization;
  if (!authorization?.startsWith("Bearer ")) return null;

  return normalizeToken(authorization.slice("Bearer ".length));
};

const isAdminCookieAuthCapable = (request: Request) =>
  request.get(ADMIN_COOKIE_AUTH_HEADER) === ADMIN_COOKIE_AUTH_CAPABILITY;

export const getAdminRequestToken = (request: Request) => {
  const bearer = getAdminBearerToken(request);
  if (bearer) return bearer;
  if (!isAdminCookieAuthCapable(request)) return null;

  return normalizeToken(request.cookies?.[ADMIN_AUTH_COOKIE_NAME]);
};

export const setAdminAuthCookie = (response: Response, token: string) => {
  const normalized = normalizeToken(token);
  if (!normalized) return;
  const maxAge = getJwtCookieMaxAge({
    defaultMaxAge: getAdminJwtTtlSeconds() * 1_000,
    token: normalized,
  });
  if (maxAge <= 0) return;

  response.cookie(ADMIN_AUTH_COOKIE_NAME, normalized, adminCookieOptions(maxAge));
};

export const clearAdminAuthCookie = (response: Response) => {
  const { maxAge: _maxAge, ...options } = adminCookieOptions();
  response.clearCookie(ADMIN_AUTH_COOKIE_NAME, options);
};

const readTokenFromResolve = (resolve: Resolve) => {
  if (!resolve.success || typeof resolve.data !== "object" || !resolve.data) return null;

  const adminTokens = Reflect.get(resolve.data, "admin_tokens");
  if (!Array.isArray(adminTokens)) return null;

  for (const item of adminTokens) {
    if (typeof item !== "object" || !item) continue;

    const token = normalizeToken(Reflect.get(item, "token"));
    if (token) return token;
  }

  return null;
};

const omitAdminTokens = (data: unknown) => {
  if (typeof data !== "object" || !data || Array.isArray(data)) return data;

  const { admin_tokens: _adminTokens, ...safeData } = data as Record<string, unknown>;
  return safeData;
};

/**
 * Mantém compatibilidade com versões antigas do painel, que ainda recebem o
 * bearer no JSON, enquanto clientes novos optam pelo cookie HttpOnly.
 */
export const applyAdminAuthCookie = (request: Request, response: Response, resolve: Resolve) => {
  const token = readTokenFromResolve(resolve);
  if (token) setAdminAuthCookie(response, token);

  if (!isAdminCookieAuthCapable(request)) return resolve;

  return {
    ...resolve,
    allowAuthTokens: false,
    data: omitAdminTokens(resolve.data),
  } satisfies Resolve;
};
