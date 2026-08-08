import assert from "node:assert/strict";
import test from "node:test";
import type { Request, Response } from "express";
import {
  applyUserAuthCookie,
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

test("lê sessão pelo bearer ou pelo cookie HttpOnly", () => {
  assert.equal(getUserRequestToken(requestStub({ cookie: "cookie-token" })), "cookie-token");
  assert.equal(
    getUserRequestToken(requestStub({ bearer: "legacy-token", cookie: "cookie-token" })),
    "legacy-token",
  );
  assert.equal(
    readUserTokenFromCookieHeader(`theme=light; ${USER_AUTH_COOKIE_NAME}=socket-token`),
    "socket-token",
  );
});

test("entrega token somente no cookie para o frontend compatível", () => {
  const writtenCookies: unknown[][] = [];
  const response = {
    cookie: (...args: unknown[]) => {
      writtenCookies.push(args);
      return response;
    },
  } as unknown as Response;
  const result = applyUserAuthCookie(requestStub({ cookieClient: true }), response, {
    allowAuthTokens: true,
    data: {
      id: "user-id",
      user_tokens: [{ token: "new-token" }],
    },
    success: true,
  });

  assert.equal(writtenCookies[0]?.[0], USER_AUTH_COOKIE_NAME);
  assert.equal(writtenCookies[0]?.[1], "new-token");
  assert.deepEqual(result.data, { id: "user-id" });
  assert.equal(result.allowAuthTokens, false);
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
