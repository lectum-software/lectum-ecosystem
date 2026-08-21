import assert from "node:assert/strict";
import test from "node:test";
import express from "express";
import jwt from "jsonwebtoken";
import { USER_COOKIE_AUTH_CAPABILITY } from "@/utils/user-auth-cookie";
import { type Resolve, send } from ".";

const requestResolve = async (resolve: Resolve) => {
  const app = express();
  app.get("/", (_request, response) => send(response, resolve));

  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolveListening, rejectListening) => {
    server.once("listening", resolveListening);
    server.once("error", rejectListening);
  });

  try {
    const address = server.address();
    assert.ok(address && typeof address === "object");

    const response = await fetch(`http://127.0.0.1:${address.port}`, {
      headers: { "x-requested-with": USER_COOKIE_AUTH_CAPABILITY },
    });

    return {
      body: (await response.json()) as Record<string, unknown>,
      headers: response.headers,
      status: response.status,
    };
  } finally {
    await new Promise<void>((resolveClosed, rejectClosed) => {
      server.close((error) => (error ? rejectClosed(error) : resolveClosed()));
    });
  }
};

const createGoogleIntentUrl = () => {
  const token = jwt.sign(
    { device_id: "device_identifier_123", intent: "delete_account_google_reauth" },
    "test-secret-with-at-least-thirty-two-characters",
    { algorithm: "HS256", expiresIn: "10m" },
  );
  const url = new URL("https://api.example.com/api/public/google/login/device_identifier_123");
  url.searchParams.set("intent", "delete_account");
  url.searchParams.set("delete_token", token);
  return url.toString();
};

test("preserva URL Google explicitamente autorizada no pipeline HTTP cookie-aware", async () => {
  const url = createGoogleIntentUrl();
  const result = await requestResolve({
    allowAuthTokens: true,
    data: { device_id: "device_identifier_123", url },
    status: 200,
    success: true,
  });

  assert.equal(result.status, 200);
  assert.deepEqual(result.body, {
    data: { device_id: "device_identifier_123", url },
    status: 200,
    success: true,
  });
  assert.equal(result.headers.get("set-cookie"), null);
  assert.equal("allowAuthTokens" in result.body, false);
});

test("mantém redação de token quando a resposta não possui autorização explícita", async () => {
  const result = await requestResolve({
    data: { url: createGoogleIntentUrl() },
    status: 200,
    success: true,
  });

  assert.equal(result.status, 200);
  assert.deepEqual(result.body, {
    data: { url: "[REDACTED]" },
    status: 200,
    success: true,
  });
});
