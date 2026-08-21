import assert from "node:assert/strict";
import test from "node:test";
import jwt, { type JwtPayload } from "jsonwebtoken";
import type { user } from "@/interfaces/objects";

const ENV_KEYS = [
  "CALLBACK_URL_API_USER",
  "DATABASE_URL",
  "GOOGLE_CLIENT_ID_API_USER",
  "GOOGLE_CLIENT_SECRET_API_USER",
  "GOOGLE_OAUTH_BASE_URL",
  "JWT_SECRET_KEY",
  "NODE_ENV",
] as const;

test("autoriza somente a URL curta e escopada da intenção de vínculo Google", async () => {
  const previousEnvironment = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));
  const jwtSecret = "test-secret-with-at-least-thirty-two-characters";

  Object.assign(process.env, {
    CALLBACK_URL_API_USER: "https://app.example.com/auth/redirect",
    DATABASE_URL: "postgresql://localhost:5432/lectum_test",
    GOOGLE_CLIENT_ID_API_USER: "test-client-id",
    GOOGLE_CLIENT_SECRET_API_USER: "test-client-secret",
    GOOGLE_OAUTH_BASE_URL: "https://api.example.com",
    JWT_SECRET_KEY: jwtSecret,
    NODE_ENV: "production",
  });

  try {
    const { createIntent } = await import("./services");
    const result = await createIntent({
      auth: {
        email: "person@example.com",
        id: "user-id",
        provider: "manual",
      } as user,
      headers: { "x-device": "device_identifier_123" },
    });

    assert.equal(result.success, true);
    assert.equal(result.status, 200);
    assert.equal(Reflect.get(result, "allowAuthTokens"), true);

    const data = result.data as { url: string };
    const url = new URL(data.url);
    assert.equal(url.origin, "https://api.example.com");
    assert.equal(url.pathname, "/api/public/google/login/device_identifier_123");
    assert.equal(url.searchParams.get("intent"), "link");
    assert.equal(url.searchParams.get("callbackUrl"), "/app/configuracoes/conta?google=connected");

    const linkToken = url.searchParams.get("link_token");
    assert.ok(linkToken);
    const payload = jwt.verify(linkToken, jwtSecret, { algorithms: ["HS256"] }) as JwtPayload;
    assert.equal(payload.intent, "link_google");
    assert.equal(payload.user_id, "user-id");
    assert.equal(payload.email, "person@example.com");
    assert.equal(payload.device_id, "device_identifier_123");
    assert.equal(typeof payload.iat, "number");
    assert.equal(typeof payload.exp, "number");
    assert.equal((payload.exp as number) - (payload.iat as number), 10 * 60);
  } finally {
    for (const key of ENV_KEYS) {
      const previous = previousEnvironment[key];
      if (previous === undefined) delete process.env[key];
      else process.env[key] = previous;
    }
  }
});
