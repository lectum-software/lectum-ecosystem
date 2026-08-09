import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { registerHooks } from "node:module";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  getLocationCaptureRetryDelay,
  LOCATION_CAPTURE_RETRY_DELAYS_MS,
  shouldRememberAuthenticatedLink,
  shouldRememberLocationCapture,
} from "../components/analytics/location-capture-policy.ts";

const sourceRoot = new URL("../", import.meta.url);

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (!specifier.startsWith("@/")) return nextResolve(specifier, context);

    const path = specifier.slice(2);
    for (const candidate of [
      `${path}.ts`,
      `${path}.tsx`,
      `${path}/index.ts`,
      `${path}/index.tsx`,
    ]) {
      const url = new URL(candidate, sourceRoot);
      if (existsSync(fileURLToPath(url))) return { shortCircuit: true, url: url.href };
    }

    return nextResolve(specifier, context);
  },
});

const {
  ADMIN_VIEW_AS_READ_ONLY_ERROR_CODE,
  getAdminViewAsExpirationDelay,
  isAdminViewAsReadOnlyError,
  normalizeAdminReturnUrl,
} = await import("./admin-view-as.ts");
const {
  ANALYTICS_ATTRIBUTION_KEY,
  ANALYTICS_AUTH_LINKED_KEY,
  ANALYTICS_LOCATION_CAPTURED_KEY,
  ANALYTICS_LOCATION_RETRY_AT_KEY,
  ANALYTICS_LOCATION_RETRY_COUNT_KEY,
  ANALYTICS_LOCATION_RETRY_SCOPE_KEY,
  ANALYTICS_REFERRER_SENT_KEY,
  ANALYTICS_SESSION_ID_KEY,
  resetAnalyticsSession,
} = await import("./analytics-session.ts");
const { getOrCreateAnalyticsIdentity, safeGetItem, safeSetItem, VISITOR_ID_KEY } = await import(
  "../components/analytics/storage.ts"
);
const { releaseActivePrompt, reserveActivePrompt } = await import("./prompt-coordinator.ts");
const { isConfirmedUserSessionRejection } = await import("./session-rejection.ts");
const { applyStoredBearerFallback } = await import("../api/auth-cookie.ts");

class MemoryStorage {
  #items = new Map();

  get length() {
    return this.#items.size;
  }

  clear() {
    this.#items.clear();
  }

  getItem(key) {
    return this.#items.get(String(key)) ?? null;
  }

  key(index) {
    return [...this.#items.keys()][index] ?? null;
  }

  removeItem(key) {
    this.#items.delete(String(key));
  }

  setItem(key, value) {
    this.#items.set(String(key), String(value));
  }
}

class MemoryHeaders {
  #items = new Map();

  constructor(entries = []) {
    for (const [name, value] of entries) this.set(name, value);
  }

  get(name) {
    return this.#items.get(String(name).toLowerCase()) ?? null;
  }

  has(name) {
    return this.#items.has(String(name).toLowerCase());
  }

  set(name, value) {
    this.#items.set(String(name).toLowerCase(), String(value));
  }
}

const withBrowserStorage = async (callback) => {
  const previousWindow = globalThis.window;
  const localStorage = new MemoryStorage();
  const sessionStorage = new MemoryStorage();
  globalThis.window = {
    dispatchEvent() {},
    localStorage,
    sessionStorage,
  };

  try {
    await callback({ localStorage, sessionStorage });
  } finally {
    if (previousWindow === undefined) {
      delete globalThis.window;
    } else {
      globalThis.window = previousWindow;
    }
  }
};

const withEnvironment = async (values, callback) => {
  const previous = new Map();
  for (const [key, value] of Object.entries(values)) {
    previous.set(key, process.env[key]);
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }

  try {
    await callback();
  } finally {
    for (const [key, value] of previous) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
};

test("aplica tentativas limitadas e progressivas à captura de localização", () => {
  assert.deepEqual([...LOCATION_CAPTURE_RETRY_DELAYS_MS], [5_000, 30_000, 120_000]);
  assert.equal(getLocationCaptureRetryDelay(0), 5_000);
  assert.equal(getLocationCaptureRetryDelay(1), 30_000);
  assert.equal(getLocationCaptureRetryDelay(2), 120_000);
  assert.equal(getLocationCaptureRetryDelay(3), null);
  assert.equal(getLocationCaptureRetryDelay(-1), null);
  assert.equal(getLocationCaptureRetryDelay(1.5), null);
});

test("só grava localização quando o backend concluiu a captura", () => {
  assert.equal(
    shouldRememberLocationCapture({ authenticated: false, captured: true, linked: false }),
    true,
  );
  assert.equal(
    shouldRememberLocationCapture({
      authenticated: false,
      captured: false,
      linked: false,
      reason: "frequency",
    }),
    true,
  );
  assert.equal(
    shouldRememberLocationCapture({
      authenticated: false,
      captured: false,
      linked: false,
      reason: "unavailable",
    }),
    false,
  );
  assert.equal(
    shouldRememberLocationCapture({
      authenticated: false,
      captured: false,
      linked: false,
      reason: "invalid_ip",
    }),
    false,
  );
});

test("só grava vínculo autenticado depois de uma conclusão válida", () => {
  assert.equal(
    shouldRememberAuthenticatedLink({ authenticated: true, captured: false, linked: true }),
    true,
  );
  assert.equal(
    shouldRememberAuthenticatedLink({ authenticated: true, captured: true, linked: false }),
    true,
  );
  assert.equal(
    shouldRememberAuthenticatedLink({
      authenticated: true,
      captured: false,
      linked: false,
      reason: "frequency",
    }),
    true,
  );
  assert.equal(
    shouldRememberAuthenticatedLink({
      authenticated: true,
      captured: false,
      linked: false,
      reason: "unavailable",
    }),
    false,
  );
  assert.equal(
    shouldRememberAuthenticatedLink({ authenticated: false, captured: true, linked: true }),
    false,
  );
});

test("aceita retorno administrativo interno ou da origem configurada", async () => {
  await withEnvironment(
    {
      NEXT_PUBLIC_ADMIN_URL: "https://admin.example.com",
      NODE_ENV: "production",
    },
    () => {
      assert.equal(normalizeAdminReturnUrl("/auth/login?reason=end"), "/auth/login?reason=end");
      assert.equal(
        normalizeAdminReturnUrl("https://admin.example.com/usuarios/123?tab=perfil"),
        "https://admin.example.com/usuarios/123?tab=perfil",
      );

      for (const value of [
        "//admin.example.com/usuarios",
        "https:\\admin.example.com/usuarios",
        "https://evil.example/usuarios",
        "http://admin.example.com/usuarios",
        "https://user@admin.example.com/usuarios",
        "https://admin.example.com.evil.example/usuarios",
        "https://admin.example.com\u0000.evil.example/usuarios",
      ]) {
        assert.equal(normalizeAdminReturnUrl(value), null, value);
      }
    },
  );
});

test("fecha retorno administrativo quando a origem publicada é inválida", async () => {
  for (const configuredUrl of [
    undefined,
    "http://admin.example.com",
    "https://localhost:3002",
    "https://127.0.0.1:3002",
    "https://*.example.com",
  ]) {
    await withEnvironment(
      {
        NEXT_PUBLIC_ADMIN_URL: configuredUrl,
        NODE_ENV: "production",
      },
      () => {
        assert.equal(normalizeAdminReturnUrl("https://admin.example.com/usuarios"), null);
      },
    );
  }
});

test("reconhece bloqueio de edição administrativa sem depender do formato do cliente HTTP", () => {
  assert.equal(isAdminViewAsReadOnlyError({ code: ADMIN_VIEW_AS_READ_ONLY_ERROR_CODE }), true);
  assert.equal(
    isAdminViewAsReadOnlyError({ data: { code: ADMIN_VIEW_AS_READ_ONLY_ERROR_CODE } }),
    true,
  );
  assert.equal(
    isAdminViewAsReadOnlyError({
      response: { data: { code: ADMIN_VIEW_AS_READ_ONLY_ERROR_CODE } },
    }),
    true,
  );
  assert.equal(isAdminViewAsReadOnlyError(new Error("technical provider detail")), false);
});

test("encerra a visualização administrativa no vencimento informado", () => {
  const now = Date.parse("2026-08-08T12:00:00.000Z");
  assert.equal(getAdminViewAsExpirationDelay("2026-08-08T12:30:00.000Z", now), 30 * 60 * 1_000);
  assert.equal(getAdminViewAsExpirationDelay("2026-08-08T11:59:59.000Z", now), 0);
  assert.equal(getAdminViewAsExpirationDelay("invalid", now), 0);
  assert.equal(getAdminViewAsExpirationDelay(null, now), null);
});

test("remove dono de prompt deixado por documento anterior", async () => {
  await withBrowserStorage(({ sessionStorage }) => {
    sessionStorage.setItem("lectum.activePrompt", "pwa-install");

    assert.equal(reserveActivePrompt("notification-permission"), true);
    assert.equal(sessionStorage.getItem("lectum.activePrompt"), "notification-permission");
    assert.equal(reserveActivePrompt("pwa-install"), false);

    releaseActivePrompt("pwa-install");
    assert.equal(sessionStorage.getItem("lectum.activePrompt"), "notification-permission");
    releaseActivePrompt("notification-permission");
    assert.equal(sessionStorage.getItem("lectum.activePrompt"), null);
  });
});

test("mantém visitante e troca sessão analítica após reset", async () => {
  await withBrowserStorage(({ localStorage, sessionStorage }) => {
    const first = getOrCreateAnalyticsIdentity();
    assert.ok(first?.visitorId);
    assert.ok(first?.sessionId);
    assert.equal(localStorage.getItem(VISITOR_ID_KEY), first.visitorId);
    assert.equal(sessionStorage.getItem(ANALYTICS_SESSION_ID_KEY), first.sessionId);

    for (const key of [
      ANALYTICS_LOCATION_CAPTURED_KEY,
      ANALYTICS_AUTH_LINKED_KEY,
      ANALYTICS_LOCATION_RETRY_SCOPE_KEY,
      ANALYTICS_LOCATION_RETRY_COUNT_KEY,
      ANALYTICS_LOCATION_RETRY_AT_KEY,
      ANALYTICS_ATTRIBUTION_KEY,
      ANALYTICS_REFERRER_SENT_KEY,
    ]) {
      sessionStorage.setItem(key, "private-session-value");
    }
    sessionStorage.setItem("unrelated", "preserve");

    resetAnalyticsSession();
    const second = getOrCreateAnalyticsIdentity();
    assert.equal(second?.visitorId, first.visitorId);
    assert.notEqual(second?.sessionId, first.sessionId);
    assert.equal(sessionStorage.getItem("unrelated"), "preserve");
    assert.equal(sessionStorage.getItem(ANALYTICS_LOCATION_CAPTURED_KEY), null);
    assert.equal(sessionStorage.getItem(ANALYTICS_AUTH_LINKED_KEY), null);
    assert.equal(sessionStorage.getItem(ANALYTICS_ATTRIBUTION_KEY), null);
  });
});

test("opera de forma segura quando o armazenamento do navegador falha", () => {
  const throwingStorage = {
    getItem() {
      throw new Error("storage unavailable");
    },
    setItem() {
      throw new Error("storage unavailable");
    },
  };

  assert.equal(safeGetItem(throwingStorage, "key"), null);
  assert.equal(safeSetItem(throwingStorage, "key", "value"), false);
  assert.equal(safeGetItem(null, "key"), null);
  assert.equal(safeSetItem(null, "key", "value"), false);
});

test("token explícito de view-as prevalece sobre bearer legado armazenado", () => {
  const explicitHeaders = new MemoryHeaders([["Authorization", "Bearer view-as-signed-token"]]);
  applyStoredBearerFallback(explicitHeaders, "legacy-user-token");
  assert.equal(explicitHeaders.get("Authorization"), "Bearer view-as-signed-token");

  const fallbackHeaders = new MemoryHeaders();
  applyStoredBearerFallback(fallbackHeaders, "legacy-user-token");
  assert.equal(fallbackHeaders.get("Authorization"), "Bearer legacy-user-token");
});

test("só limpa a sessão local quando a própria API rejeita a credencial", () => {
  for (const code of [
    "token_device_not_authorized",
    "token_invalid",
    "token_mal_formatted",
    "token_not_authorized",
    "token_not_provided",
  ]) {
    assert.equal(
      isConfirmedUserSessionRejection({ response: { data: { code }, status: 401 } }),
      true,
    );
  }

  for (const error of [
    new Error("offline"),
    { response: { status: 401 } },
    { response: { data: { code: "proxy_auth_required" }, status: 401 } },
    { response: { data: { code: "token_not_authorized" }, status: 403 } },
    { response: { data: { code: "token_not_authorized" }, status: 500 } },
    { response: { data: { code: "token_not_authorized" }, status: 502 } },
  ]) {
    assert.equal(isConfirmedUserSessionRejection(error), false);
  }
});
