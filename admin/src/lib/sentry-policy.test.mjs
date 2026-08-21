import assert from "node:assert/strict";
import test from "node:test";
import {
  filterSentryErrorIntegrations,
  parseSentryDsn,
  parseSentryEnvironment,
  resolveSentryBuildConfiguration,
  SENTRY_PRIVATE_DATA_COLLECTION,
  sanitizeSentryErrorEvent,
} from "./sentry-policy.ts";

const VALID_DSN =
  "https://0123456789abcdef0123456789abcdef@o4500000000000000.ingest.us.sentry.io/4500000000000001";

test("aceita somente DSN público HTTPS hospedado pelo Sentry", () => {
  assert.deepEqual(parseSentryDsn(VALID_DSN), {
    dsn: VALID_DSN,
    origin: "https://o4500000000000000.ingest.us.sentry.io",
  });

  for (const value of [
    undefined,
    "",
    VALID_DSN.replace("https://", "http://"),
    VALID_DSN.replace(
      "@o4500000000000000.ingest.us.sentry.io",
      ":secret@o4500000000000000.ingest.us.sentry.io",
    ),
    VALID_DSN.replace("sentry.io", "example.com"),
    VALID_DSN.replace("/4500000000000001", "/project"),
    `${VALID_DSN}?token=secret`,
    "https://0123456789abcdef@localhost/1",
  ]) {
    assert.equal(parseSentryDsn(value), null, value);
  }
});

test("habilita source maps somente com as três credenciais de build", () => {
  assert.deepEqual(
    resolveSentryBuildConfiguration({
      SENTRY_AUTH_TOKEN: " sntrys_example-token_123 ",
      SENTRY_ORG: " lectum ",
      SENTRY_PROJECT: " admin ",
    }),
    { authToken: "sntrys_example-token_123", org: "lectum", project: "admin" },
  );

  assert.equal(
    resolveSentryBuildConfiguration({ SENTRY_ORG: "lectum", SENTRY_PROJECT: "admin" }),
    null,
  );
  assert.equal(
    resolveSentryBuildConfiguration({
      SENTRY_AUTH_TOKEN: "sntrys_example-token_123",
      SENTRY_PROJECT: "admin",
    }),
    null,
  );
  assert.equal(
    resolveSentryBuildConfiguration({
      SENTRY_AUTH_TOKEN: "sntrys_example-token_123",
      SENTRY_ORG: "lectum",
    }),
    null,
  );
});

test("rejeita slugs e tokens de build fora dos limites seguros", () => {
  const valid = {
    SENTRY_AUTH_TOKEN: "sntrys_example-token_123",
    SENTRY_ORG: "lectum",
    SENTRY_PROJECT: "admin",
  };

  for (const environment of [
    { ...valid, SENTRY_ORG: "lectum/production" },
    { ...valid, SENTRY_ORG: `lectum${"a".repeat(64)}` },
    { ...valid, SENTRY_PROJECT: "admin\nproduction" },
    { ...valid, SENTRY_PROJECT: "-admin" },
    { ...valid, SENTRY_AUTH_TOKEN: "short" },
    { ...valid, SENTRY_AUTH_TOKEN: "sntrys_token\nsecret" },
    { ...valid, SENTRY_AUTH_TOKEN: `sntrys_${"a".repeat(506)}` },
  ]) {
    assert.equal(resolveSentryBuildConfiguration(environment), null);
  }
});

test("normaliza o ambiente sem aceitar valor inválido", () => {
  assert.equal(parseSentryEnvironment(" homolog "), "homolog");
  assert.equal(parseSentryEnvironment(undefined), null);
  assert.equal(parseSentryEnvironment("None"), null);
  assert.equal(parseSentryEnvironment("invalid value"), null);
  assert.equal(parseSentryEnvironment("PRODUCTION"), "production");
  assert.equal(parseSentryEnvironment("staging"), null);
});

test("remove contexto privado e conserva somente a pilha necessária do erro", () => {
  const input = {
    breadcrumbs: [{ message: "user@example.com" }],
    contexts: { response: { body: "private" } },
    debug_meta: {
      images: [
        {
          code_file:
            "https://private-user:private-password@admin.example.com/_next/app.js?token=secret",
          debug_id: "12345678-1234-1234-1234-123456789abc",
          type: "sourcemap",
        },
        {
          code_file: "user@example.com",
          debug_id: "private-debug-id",
          type: "wasm",
        },
      ],
    },
    environment: "homolog",
    event_id: "0123456789abcdef0123456789abcdef",
    exception: {
      values: [
        {
          mechanism: {
            data: { target: "user@example.com" },
            handled: true,
            type: "generic",
          },
          stacktrace: {
            frames: [
              {
                abs_path:
                  "https://private-user:private-password@admin.example.com/_next/app.js?user=user@example.com#private",
                colno: 4,
                context_line: "const email = 'user@example.com'",
                debug_id: "12345678-1234-1234-1234-123456789abc",
                filename: "app.js?token=secret",
                function: "submitForm",
                in_app: true,
                lineno: 12,
                module: "app/forms/profile",
                platform: "javascript",
                vars: { email: "user@example.com" },
              },
            ],
          },
          type: "TypeError",
          value: "Falha para user@example.com com token secret",
        },
      ],
    },
    extra: { email: "user@example.com" },
    fingerprint: ["user@example.com"],
    level: "error",
    message: "user@example.com",
    release: "lectum-admin@1.0.0",
    request: {
      cookies: { session: "secret" },
      data: { email: "user@example.com" },
      headers: { authorization: "Bearer secret" },
      query_string: "email=user@example.com",
      url: "https://admin.example.com/private?email=user@example.com",
    },
    tags: { user: "user@example.com" },
    transaction: "/users/user@example.com",
    user: { email: "user@example.com" },
  };

  const hint = {
    attachments: [{ data: "private", filename: "private.txt" }],
    captureContext: { extra: { token: "private" } },
    data: { provider: "private" },
  };
  const sanitized = sanitizeSentryErrorEvent(input, hint);
  assert.ok(sanitized);
  assert.equal(sanitized.event_id, "0123456789abcdef0123456789abcdef");
  assert.equal(sanitized.environment, "homolog");
  assert.deepEqual(sanitized.debug_meta, {
    images: [
      {
        code_file: "sourcemap/12345678-1234-1234-1234-123456789abc.js",
        debug_id: "12345678-1234-1234-1234-123456789abc",
        type: "sourcemap",
      },
    ],
  });
  assert.equal(sanitized.release, "lectum-admin@1.0.0");
  assert.equal(sanitized.request, undefined);
  assert.equal(sanitized.breadcrumbs, undefined);
  assert.equal(sanitized.contexts, undefined);
  assert.equal(sanitized.extra, undefined);
  assert.equal(sanitized.user, undefined);
  assert.equal(sanitized.tags, undefined);
  assert.equal(sanitized.transaction, undefined);
  assert.equal(sanitized.fingerprint, undefined);
  assert.equal(sanitized.message, undefined);
  assert.equal(
    sanitized.exception?.values?.[0]?.value,
    "Detalhes omitidos pela política de privacidade.",
  );
  assert.deepEqual(sanitized.exception?.values?.[0]?.mechanism, {
    handled: true,
    synthetic: undefined,
    type: "generic",
  });
  assert.deepEqual(sanitized.exception?.values?.[0]?.stacktrace?.frames?.[0], {
    abs_path: "sourcemap/12345678-1234-1234-1234-123456789abc.js",
    colno: 4,
    debug_id: "12345678-1234-1234-1234-123456789abc",
    filename: "sourcemap/12345678-1234-1234-1234-123456789abc.js",
    in_app: true,
    lineno: 12,
    platform: "javascript",
  });
  assert.equal(input.request.url.includes("user@example.com"), true);
  assert.equal(hint.attachments, undefined);
  assert.equal(hint.captureContext, undefined);
  assert.equal(hint.data, undefined);
});

test("remove símbolos de pilha com caracteres privados ou acima do limite", () => {
  const sanitized = sanitizeSentryErrorEvent({
    exception: {
      values: [
        {
          stacktrace: {
            frames: [
              {
                abs_path: `https://private:password@example.com/${"a".repeat(600)}?token=secret`,
                colno: Number.POSITIVE_INFINITY,
                debug_id: "private-debug-id",
                filename: "app\u0000.js?token=secret#private",
                function: "submit_user@example.com",
                in_app: "true",
                lineno: -1,
                module: `application/${"a".repeat(201)}`,
                platform: "browser-private",
              },
              {
                function: "Object.submit [as handler]",
                module: "app/forms/profile",
              },
              {
                abs_path: "blob:https://private:password@example.com/private-script",
              },
              { filename: "patient@example.com" },
            ],
          },
          type: "TypeError",
        },
      ],
    },
  });

  assert.equal(sanitized?.exception?.values?.[0]?.stacktrace?.frames?.[0]?.function, undefined);
  assert.equal(sanitized?.exception?.values?.[0]?.stacktrace?.frames?.[0]?.module, undefined);
  assert.equal(sanitized?.exception?.values?.[0]?.stacktrace?.frames?.[0]?.colno, undefined);
  assert.equal(sanitized?.exception?.values?.[0]?.stacktrace?.frames?.[0]?.debug_id, undefined);
  assert.equal(
    sanitized?.exception?.values?.[0]?.stacktrace?.frames?.[0]?.filename,
    "runtime/frame-002.js",
  );
  assert.equal(sanitized?.exception?.values?.[0]?.stacktrace?.frames?.[0]?.in_app, undefined);
  assert.equal(sanitized?.exception?.values?.[0]?.stacktrace?.frames?.[0]?.lineno, undefined);
  assert.equal(sanitized?.exception?.values?.[0]?.stacktrace?.frames?.[0]?.platform, undefined);
  assert.ok(
    (sanitized?.exception?.values?.[0]?.stacktrace?.frames?.[0]?.abs_path?.length ?? 0) <= 512,
  );
  assert.equal(
    sanitized?.exception?.values?.[0]?.stacktrace?.frames?.[0]?.abs_path?.includes("private"),
    false,
  );
  assert.equal(
    sanitized?.exception?.values?.[0]?.stacktrace?.frames?.[0]?.abs_path?.includes("token"),
    false,
  );
  assert.equal(sanitized?.exception?.values?.[0]?.stacktrace?.frames?.[1]?.function, undefined);
  assert.equal(sanitized?.exception?.values?.[0]?.stacktrace?.frames?.[1]?.module, undefined);
  assert.equal(
    sanitized?.exception?.values?.[0]?.stacktrace?.frames?.[2]?.abs_path,
    "runtime/frame-003",
  );
  assert.equal(
    sanitized?.exception?.values?.[0]?.stacktrace?.frames?.[3]?.filename,
    "runtime/frame-004",
  );
});

test("não transporta CPF ou token presentes em nomes dinâmicos de stack", () => {
  const sanitized = sanitizeSentryErrorEvent({
    exception: {
      values: [
        {
          module: "patient_12345678900",
          stacktrace: {
            frames: [
              {
                filename: "src/12345678900.ts",
                function: "obj.<computed> [as sk_live_SUPERSECRET123]",
                module: "patient_12345678900",
              },
            ],
          },
          type: "sk_live_SUPERSECRET123",
        },
      ],
    },
  });

  assert.equal(sanitized?.exception?.values?.[0]?.type, "Error");
  assert.equal(sanitized?.exception?.values?.[0]?.module, undefined);
  assert.deepEqual(sanitized?.exception?.values?.[0]?.stacktrace?.frames?.[0], {
    abs_path: undefined,
    colno: undefined,
    debug_id: undefined,
    filename: "runtime/frame-001.ts",
    in_app: undefined,
    lineno: undefined,
    platform: undefined,
  });
  assert.doesNotMatch(JSON.stringify(sanitized), /12345678900|sk_live_SUPERSECRET123/);
});

test("reconstrói somente metadata técnica validada", () => {
  const sanitized = sanitizeSentryErrorEvent({
    dist: "123.456.789-00",
    environment: "sk_live_SUPERSECRET123",
    event_id: "patient@example.com",
    exception: { values: [{ type: "TypeError" }] },
    level: "error",
    platform: "+5511999999999",
    release: "lectum-admin@12345678900",
    sdk: { name: "patient@example.com", version: "sk_live_SUPERSECRET123" },
    timestamp: 12_345_678_900,
  });

  assert.deepEqual(sanitized, {
    debug_meta: undefined,
    environment: undefined,
    event_id: undefined,
    exception: {
      values: [
        {
          mechanism: undefined,
          stacktrace: undefined,
          type: "TypeError",
          value: "Detalhes omitidos pela política de privacidade.",
        },
      ],
    },
    level: "error",
    platform: undefined,
    release: undefined,
    timestamp: undefined,
    type: undefined,
  });
  assert.doesNotMatch(
    JSON.stringify(sanitized),
    /123\.456\.789-00|sk_live_SUPERSECRET123|patient@example\.com|5511999999999|12345678900/,
  );
});

test("normaliza caminhos locais em identificadores relativos correlacionados aos source maps", () => {
  const locations = [
    {
      debugId: "11111111-1111-1111-1111-111111111111",
      expected: "sourcemap/11111111-1111-1111-1111-111111111111.js",
      value: "/Users/private-user/Projects/lectum/admin/.next/server/chunks/mac.js",
    },
    {
      debugId: "22222222-2222-2222-2222-222222222222",
      expected: "sourcemap/22222222-2222-2222-2222-222222222222.js",
      value: "/home/private-user/apps/lectum/admin/.next/server/chunks/linux.js",
    },
    {
      debugId: "33333333-3333-3333-3333-333333333333",
      expected: "sourcemap/33333333-3333-3333-3333-333333333333.js",
      value: "C:\\Users\\private-user\\lectum\\admin\\.next\\server\\chunks\\windows.js",
    },
    {
      debugId: "44444444-4444-4444-4444-444444444444",
      expected: "sourcemap/44444444-4444-4444-4444-444444444444.js",
      value:
        "file:///Users/private-user/lectum/admin/.next/server/chunks/file.js?email=patient@example.com",
    },
    {
      debugId: "55555555-5555-5555-5555-555555555555",
      expected: "sourcemap/55555555-5555-5555-5555-555555555555.js",
      value:
        "/Users/private-user/lectum/admin/.next/server/chunks/patient@example.com.js?token=private",
    },
    {
      debugId: "66666666-6666-6666-6666-666666666666",
      expected: "sourcemap/66666666-6666-6666-6666-666666666666.js",
      value: "/Users/private-user/internal/private-application.js",
    },
  ];
  const sanitized = sanitizeSentryErrorEvent({
    debug_meta: {
      images: locations.map(({ debugId, value }) => ({
        code_file: value,
        debug_id: debugId,
        type: "sourcemap",
      })),
    },
    exception: {
      values: [
        {
          stacktrace: {
            frames: locations.map(({ value }) => ({ abs_path: value, filename: value })),
          },
          type: "Error",
        },
      ],
    },
  });

  const expectedIdentifiers = locations.map(({ expected }) => expected);
  assert.deepEqual(
    sanitized?.debug_meta?.images?.map((image) => image.code_file),
    expectedIdentifiers,
  );
  assert.deepEqual(
    sanitized?.exception?.values?.[0]?.stacktrace?.frames?.map((frame) => frame.abs_path),
    expectedIdentifiers,
  );
  assert.deepEqual(
    sanitized?.exception?.values?.[0]?.stacktrace?.frames?.map((frame) => frame.filename),
    expectedIdentifiers,
  );

  const serialized = JSON.stringify(sanitized);
  for (const privateValue of [
    "/Users/",
    "/home/",
    "C:",
    "file:",
    "private-user",
    "patient@example.com",
    "token=",
    ".next",
    "server/chunks",
    "Projects/lectum",
    "internal/private-application",
  ]) {
    assert.equal(serialized.includes(privateValue), false, privateValue);
  }
});

test("descarta eventos que não são erros e integrações fora do escopo error-only", () => {
  assert.equal(sanitizeSentryErrorEvent({ type: "transaction" }), null);
  assert.equal(sanitizeSentryErrorEvent({ message: "erro sem exceção" }), null);
  assert.equal(
    sanitizeSentryErrorEvent({
      exception: { values: [{ type: "Error" }] },
      level: "warning",
    }),
    null,
  );
  const integrationsComContexto = [
    "Breadcrumbs",
    "BrowserTracing",
    "ChildProcess",
    "Console",
    "Context",
    "LocalVariablesAsync",
    "Modules",
    "NodeFetch",
    "NodeSystemError",
    "OnUncaughtException",
    "OnUnhandledRejection",
    "ProcessSession",
    "Profiling",
    "WinterCGFetch",
  ];
  assert.deepEqual(
    filterSentryErrorIntegrations([
      { name: "GlobalHandlers" },
      ...integrationsComContexto.map((name) => ({ name })),
    ]).map((integration) => integration.name),
    ["GlobalHandlers"],
  );
});

test("falha fechada sem lançar para eventos malformados", () => {
  const malformedEvents = [
    null,
    { exception: { values: null } },
    { exception: { values: [null] } },
    {
      exception: {
        values: [{ stacktrace: { frames: [null] }, type: "Error" }],
      },
    },
    {
      debug_meta: { images: [null] },
      exception: { values: [{ type: "Error" }] },
    },
  ];

  for (const malformedEvent of malformedEvents) {
    assert.doesNotThrow(() => sanitizeSentryErrorEvent(malformedEvent));
    assert.equal(sanitizeSentryErrorEvent(malformedEvent), null);
  }

  const hint = {
    attachments: [{ data: "private", filename: "private.txt" }],
    captureContext: { extra: { token: "private" } },
    data: { patient: "patient@example.com" },
  };
  assert.equal(sanitizeSentryErrorEvent({ exception: { values: [null] } }, hint), null);
  assert.equal(hint.attachments, undefined);
  assert.equal(hint.captureContext, undefined);
  assert.equal(hint.data, undefined);
});

test("desliga explicitamente todas as categorias privadas da coleta automática", () => {
  assert.deepEqual(SENTRY_PRIVATE_DATA_COLLECTION, {
    cookies: false,
    databaseQueryData: false,
    frameContextLines: 0,
    genAI: { inputs: false, outputs: false },
    graphQL: { document: false, variables: false },
    httpBodies: [],
    httpHeaders: { request: false, response: false },
    stackFrameVariables: false,
    urlQueryParams: false,
    userInfo: false,
  });
});
