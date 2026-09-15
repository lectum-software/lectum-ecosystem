import type { CookieOptions, Request, Response } from "express";
import { getJwtCookieMaxAge } from "./jwt-cookie-ttl";
import { getUserJwtTtlSeconds, isPublishedRuntime } from "./runtime-config";

export const USER_AUTH_COOKIE_NAME = "lectum_user_session";
export const USER_COOKIE_AUTH_HEADER = "x-requested-with";
export const USER_COOKIE_AUTH_CAPABILITY = "Lectum-User-Cookie-Auth";

const MAX_USER_TOKEN_LENGTH = 4_096;

type AuthResolve = {
  allowAuthTokens?: boolean;
  data?: unknown;
  success: boolean;
  [key: string]: unknown;
};

const userCookieOptions = (maxAge = getUserJwtTtlSeconds() * 1_000): CookieOptions => ({
  httpOnly: true,
  maxAge,
  path: "/",
  sameSite: "lax",
  secure: isPublishedRuntime(),
});

export const getUserTokenCookieMaxAge = (token: string, now = Date.now()) => {
  const defaultMaxAge = getUserJwtTtlSeconds() * 1_000;
  return getJwtCookieMaxAge({ defaultMaxAge, now, token });
};

const normalizeToken = (value: unknown) => {
  if (typeof value !== "string") return null;

  const normalized = value.trim();
  if (!normalized || normalized.length > MAX_USER_TOKEN_LENGTH) return null;

  return normalized;
};

export const getUserBearerToken = (request: Request) => {
  const authorization = request.headers.authorization;
  if (!authorization?.startsWith("Bearer ")) return null;

  return normalizeToken(authorization.slice("Bearer ".length));
};

export const readUserTokenFromCookieHeader = (cookieHeader: unknown) => {
  if (typeof cookieHeader !== "string") return null;

  for (const part of cookieHeader.split(";")) {
    const separator = part.indexOf("=");
    if (separator < 0) continue;

    const name = part.slice(0, separator).trim();
    if (name !== USER_AUTH_COOKIE_NAME) continue;

    const rawValue = part.slice(separator + 1).trim();
    try {
      return normalizeToken(decodeURIComponent(rawValue));
    } catch {
      return normalizeToken(rawValue);
    }
  }

  return null;
};

const isUserCookieAuthCapable = (request: Request) =>
  request.get(USER_COOKIE_AUTH_HEADER) === USER_COOKIE_AUTH_CAPABILITY;

export const getUserRequestToken = (request: Request) => {
  const bearer = getUserBearerToken(request);
  if (bearer) return bearer;
  if (!isUserCookieAuthCapable(request)) return null;

  return (
    normalizeToken(request.cookies?.[USER_AUTH_COOKIE_NAME]) ??
    readUserTokenFromCookieHeader(request.headers.cookie)
  );
};

export const clearUserAuthCookie = (response: Response) => {
  const { maxAge: _maxAge, ...options } = userCookieOptions();
  response.clearCookie(USER_AUTH_COOKIE_NAME, options);
};

const setUserAuthCookie = (response: Response, token: string) => {
  const normalized = normalizeToken(token);
  if (!normalized) return;
  const maxAge = getUserTokenCookieMaxAge(normalized);
  if (maxAge <= 0) return;

  response.cookie(USER_AUTH_COOKIE_NAME, normalized, userCookieOptions(maxAge));
};

const readTokenFromResolve = (resolve: AuthResolve) => {
  if (!resolve.success || typeof resolve.data !== "object" || !resolve.data) return null;

  const userTokens = Reflect.get(resolve.data, "user_tokens");
  if (!Array.isArray(userTokens)) return null;

  for (const item of userTokens) {
    if (typeof item !== "object" || !item) continue;

    const token = normalizeToken(Reflect.get(item, "token"));
    if (token) return token;
  }

  return null;
};

const omitUserTokens = (data: unknown) => {
  if (typeof data !== "object" || !data || Array.isArray(data)) return data;

  const { user_tokens: _userTokens, ...safeData } = data as Record<string, unknown>;
  return safeData;
};

const hasUserTokensPayload = (data: unknown) =>
  typeof data === "object" &&
  data !== null &&
  !Array.isArray(data) &&
  Object.hasOwn(data, "user_tokens");

/**
 * O header de capacidade permite publicar backend e frontend em qualquer ordem:
 * clientes antigos seguem com bearer; clientes novos usam cookie HttpOnly.
 */
export const applyUserAuthCookie = <T extends AuthResolve>(
  request: Request,
  response: Response,
  resolve: T,
): T => {
  const cookieCapable = isUserCookieAuthCapable(request);
  if (!cookieCapable) return resolve;
  if (!hasUserTokensPayload(resolve.data)) return resolve;

  const token = readTokenFromResolve(resolve);
  if (token) setUserAuthCookie(response, token);

  return {
    ...resolve,
    allowAuthTokens: false,
    data: omitUserTokens(resolve.data),
  };
};
