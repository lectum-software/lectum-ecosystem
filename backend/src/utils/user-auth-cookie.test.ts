import assert from "node:assert/strict";
import test from "node:test";
import type { Request, Response } from "express";
import jwt from "jsonwebtoken";
import {
  applyUserAuthCookie,
  clearUserAuthCookie,
  getUserRequestToken,
  readUserTokenFromCookieHeader,
  USER_AUTH_COOKIE_NAME,
  USER_COOKIE_AUTH_CAPABILITY,
} from "./user-auth-cookie";

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
    cookies: cookie ? { [USER_AUTH_COOKIE_NAME]: cookie } : {},
    get: (name: string) =>
      cookieClient && name.toLowerCase() === "x-requested-with"
        ? USER_COOKIE_AUTH_CAPABILITY
        : undefined,
    headers: bearer ? { authorization: `Bearer ${bearer}` } : {},
  }) as unknown as Request;

test("aceita cookie somente com capacidade CSRF e mantém bearer legado prioritário", () => {
  assert.equal(getUserRequestToken(requestStub({ cookie: "cookie-token" })), null);
  assert.equal(
    getUserRequestToken(requestStub({ cookie: "cookie-token", cookieClient: true })),
    "cookie-token",
  );
  assert.equal(
    getUserRequestToken(requestStub({ bearer: "legacy-token", cookie: "cookie-token" })),
    "legacy-token",
  );
});

test("mantém leitura direta do header de cookie restrita ao transporte Socket validado", () => {
  assert.equal(
    readUserTokenFromCookieHeader(`theme=light; ${USER_AUTH_COOKIE_NAME}=socket-token`),
    "socket-token",
  );
});

test("entrega token somente no cookie para o frontend compatível", () => {
  const previousNodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = "homolog";
  const writtenCookies: unknown[][] = [];
  const response = {
    cookie: (...args: unknown[]) => {
      writtenCookies.push(args);
      return response;
    },
  } as unknown as Response;
  const shortLivedToken = jwt.sign({ id: "view-as-user" }, "x".repeat(32), {
    algorithm: "HS256",
    expiresIn: 30 * 60,
  });
  try {
    const result = applyUserAuthCookie(requestStub({ cookieClient: true }), response, {
      allowAuthTokens: true,
      data: {
        id: "user-id",
        user_tokens: [{ token: shortLivedToken }],
      },
      success: true,
    });

    assert.equal(writtenCookies[0]?.[0], USER_AUTH_COOKIE_NAME);
    assert.equal(writtenCookies[0]?.[1], shortLivedToken);
    assert.equal(Reflect.get(writtenCookies[0]?.[2] ?? {}, "secure"), true);
    const maxAge = Reflect.get(writtenCookies[0]?.[2] ?? {}, "maxAge");
    assert.equal(typeof maxAge, "number");
    assert.ok(maxAge > 29 * 60 * 1_000 && maxAge <= 30 * 60 * 1_000);
    assert.deepEqual(result.data, { id: "user-id" });
    assert.equal(result.allowAuthTokens, false);
  } finally {
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousNodeEnv;
  }
});

test("preserva payload transitório autorizado quando não há token de sessão", () => {
  const writtenCookies: unknown[][] = [];
  const response = {
    cookie: (...args: unknown[]) => {
      writtenCookies.push(args);
      return response;
    },
  } as unknown as Response;
  const resolve = {
    allowAuthTokens: true,
    data: {
      device_id: "device_identifier_123",
      url: "https://api.example.com/api/public/google/login/device_identifier_123?intent=delete_account&delete_token=eyJhbGciOiJIUzI1NiJ9.payload.signature",
    },
    success: true,
  };

  assert.equal(
    applyUserAuthCookie(requestStub({ cookieClient: true }), response, resolve),
    resolve,
  );
  assert.deepEqual(writtenCookies, []);
});

test("remove contrato de sessão vazio ou malformado e mantém sanitização fechada", () => {
  const writtenCookies: unknown[][] = [];
  const response = {
    cookie: (...args: unknown[]) => {
      writtenCookies.push(args);
      return response;
    },
  } as unknown as Response;

  for (const userTokens of [[], null, "invalid"]) {
    const result = applyUserAuthCookie(requestStub({ cookieClient: true }), response, {
      allowAuthTokens: true,
      data: { id: "user-id", user_tokens: userTokens },
      success: true,
    });

    assert.deepEqual(result.data, { id: "user-id" });
    assert.equal(result.allowAuthTokens, false);
  }
  assert.deepEqual(writtenCookies, []);
});

test("mantém resposta legada intacta quando o cliente não declara suporte", () => {
  const response = {
    cookie: () => response,
  } as unknown as Response;
  const resolve = {
    data: { user_tokens: [{ token: "legacy-token" }] },
    success: true,
  };

  assert.equal(applyUserAuthCookie(requestStub({}), response, resolve), resolve);
});

test("limpa o cookie HttpOnly com a mesma política segura da autenticação", () => {
  const previousNodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = "homolog";
  const clearedCookies: unknown[][] = [];
  const response = {
    clearCookie: (...args: unknown[]) => {
      clearedCookies.push(args);
      return response;
    },
  } as unknown as Response;

  try {
    clearUserAuthCookie(response);

    assert.equal(clearedCookies[0]?.[0], USER_AUTH_COOKIE_NAME);
    assert.deepEqual(clearedCookies[0]?.[1], {
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      secure: true,
    });
  } finally {
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousNodeEnv;
  }
});
