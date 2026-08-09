import assert from "node:assert/strict";
import test from "node:test";
import type { Request, Response } from "express";
import jwt from "jsonwebtoken";
import type { Resolve } from "@/helpers/return";
import {
  ADMIN_AUTH_COOKIE_NAME,
  ADMIN_COOKIE_AUTH_CAPABILITY,
  applyAdminAuthCookie,
  getAdminRequestToken,
} from "./cookie";

const requestStub = ({
  bearer,
  cookie,
  cookieClient = false,
}: {
  bearer?: string;
  cookie?: string;
  cookieClient?: boolean;
}) =>
  ({
    cookies: cookie ? { [ADMIN_AUTH_COOKIE_NAME]: cookie } : {},
    get: (name: string) =>
      cookieClient && name.toLowerCase() === "x-requested-with"
        ? ADMIN_COOKIE_AUTH_CAPABILITY
        : undefined,
    headers: bearer ? { authorization: `Bearer ${bearer}` } : {},
  }) as unknown as Request;

test("aceita cookie somente com capacidade CSRF e mantém bearer legado prioritário", () => {
  assert.equal(getAdminRequestToken(requestStub({ cookie: "cookie-token" })), null);
  assert.equal(
    getAdminRequestToken(requestStub({ cookie: "cookie-token", cookieClient: true })),
    "cookie-token",
  );
  assert.equal(
    getAdminRequestToken(requestStub({ bearer: "legacy-token", cookie: "cookie-token" })),
    "legacy-token",
  );
});

test("grava cookie seguro e omite o token para o painel compatível com cookie", () => {
  const previousNodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = "staging";
  const writtenCookies: unknown[][] = [];
  const response = {
    cookie: (...args: unknown[]) => {
      writtenCookies.push(args);
      return response;
    },
  } as unknown as Response;
  const shortLivedToken = jwt.sign({ id: "admin-id" }, "x".repeat(32), {
    algorithm: "HS256",
    expiresIn: 30 * 60,
  });
  const resolve: Resolve = {
    data: {
      admin_tokens: [{ token: shortLivedToken }],
      id: "admin-id",
    },
    success: true,
  };

  try {
    const result = applyAdminAuthCookie(requestStub({ cookieClient: true }), response, resolve);

    assert.equal(writtenCookies.length, 1);
    assert.equal(writtenCookies[0]?.[0], ADMIN_AUTH_COOKIE_NAME);
    assert.equal(writtenCookies[0]?.[1], shortLivedToken);
    assert.equal(Reflect.get(writtenCookies[0]?.[2] ?? {}, "secure"), true);
    const maxAge = Reflect.get(writtenCookies[0]?.[2] ?? {}, "maxAge");
    assert.equal(typeof maxAge, "number");
    assert.ok(maxAge > 29 * 60 * 1_000 && maxAge <= 30 * 60 * 1_000);
    assert.deepEqual(result.data, { id: "admin-id" });
    assert.equal(result.allowAuthTokens, false);
  } finally {
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousNodeEnv;
  }
});

test("preserva o token no JSON somente para versões antigas do painel", () => {
  const response = {
    cookie: () => response,
  } as unknown as Response;
  const resolve: Resolve = {
    data: { admin_tokens: [{ token: "legacy-token" }] },
    success: true,
  };

  const result = applyAdminAuthCookie(requestStub({}), response, resolve);

  assert.equal(result, resolve);
});
