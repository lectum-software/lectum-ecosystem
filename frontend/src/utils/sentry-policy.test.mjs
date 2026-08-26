import assert from "node:assert/strict";
import test from "node:test";
import {
  createSentryOptions,
  filterSentryErrorIntegrations,
  getSentryIngestOrigin,
  parseSentryEnvironment,
  parseSentryPublicDsn,
  resolveSentryBuildConfiguration,
  resolveSentryRelease,
  resolveSentryRuntimeConfiguration,
  SENTRY_DATA_COLLECTION,
  sanitizeSentryEvent,
} from "./sentry-policy.ts";

const VALID_DSN = "https://0123456789abcdef0123456789abcdef@o123456.ingest.us.sentry.io/987654";

test("aceita DSN publico HTTPS do Sentry sem expor a chave no CSP", () => {
  assert.deepEqual(parseSentryPublicDsn(VALID_DSN), {
    dsn: VALID_DSN,
    origin: "https://o123456.ingest.us.sentry.io",
  });
  assert.equal(getSentryIngestOrigin(VALID_DSN, "homolog"), "https://o123456.ingest.us.sentry.io");

  const europeanDsn = "https://abcdef0123456789abcdef0123456789@o987.ingest.de.sentry.io/123";
  assert.equal(
    getSentryIngestOrigin(europeanDsn, "production"),
    "https://o987.ingest.de.sentry.io",
  );
  assert.deepEqual(resolveSentryRuntimeConfiguration(VALID_DSN, " homolog "), {
    dsn: VALID_DSN,
    environment: "homolog",
    origin: "https://o123456.ingest.us.sentry.io",
  });
});

test("recusa DSN inseguro, ambiguo ou fora do Sentry SaaS", () => {
  for (const value of [
    undefined,
    "",
    "http://0123456789abcdef0123456789abcdef@o123.ingest.sentry.io/987",
    "https://short@o123.ingest.sentry.io/987",
    "https://0123456789abcdef0123456789abcdef:password@o123.ingest.sentry.io/987",
    "https://0123456789abcdef0123456789abcdef@o123.ingest.sentry.io:8443/987",
    "https://0123456789abcdef0123456789abcdef@o123.ingest.sentry.io/project",
    "https://0123456789abcdef0123456789abcdef@o123.ingest.sentry.io/prefix/987",
    "https://0123456789abcdef0123456789abcdef@o123.ingest.sentry.io/987?debug=1",
    "https://0123456789abcdef0123456789abcdef@o123.ingest.sentry.io/987#debug",
    "https://0123456789abcdef0123456789abcdef@o123.ingest.sentry.io.evil.example/987",
    "https:\\o123.ingest.sentry.io\\987",
    "https://*.sentry.io/987",
  ]) {
    assert.equal(parseSentryPublicDsn(value), null, String(value));
  }
});

test("normaliza ambiente sem permitir valores invalidos", () => {
  assert.equal(parseSentryEnvironment(" homolog "), "homolog");
  assert.equal(parseSentryEnvironment("PRODUCTION"), "production");

  for (const value of [
    undefined,
    "",
    "None",
    "NONE",
    "homolog br",
    "team/homolog",
    "staging",
    "line\nbreak",
  ]) {
    assert.equal(parseSentryEnvironment(value), null, String(value));
  }
});

test("aceita configuracao build-time completa e recusa credenciais ambiguas", () => {
  assert.deepEqual(
    resolveSentryBuildConfiguration({
      SENTRY_AUTH_TOKEN: "  sntrys_frontend_build_token  ",
      SENTRY_ORG: " lectum-org ",
      SENTRY_PROJECT: " lectum-frontend ",
    }),
    {
      authToken: "sntrys_frontend_build_token",
      org: "lectum-org",
      project: "lectum-frontend",
    },
  );

  for (const environment of [
    {},
    { SENTRY_AUTH_TOKEN: "short", SENTRY_ORG: "lectum", SENTRY_PROJECT: "frontend" },
    {
      SENTRY_AUTH_TOKEN: "token-with\nnewline",
      SENTRY_ORG: "lectum",
      SENTRY_PROJECT: "frontend",
    },
    {
      SENTRY_AUTH_TOKEN: "sntrys_frontend_build_token",
      SENTRY_ORG: "lectum/org",
      SENTRY_PROJECT: "frontend",
    },
    {
      SENTRY_AUTH_TOKEN: "sntrys_frontend_build_token",
      SENTRY_ORG: "lectum",
      SENTRY_PROJECT: "frontend project",
    },
  ]) {
    assert.equal(resolveSentryBuildConfiguration(environment), null);
  }
});

test("define release frontend deterministica somente para versao segura", () => {
  assert.equal(resolveSentryRelease(" 0.1.159 "), "lectum-frontend@0.1.159");

  for (const value of [undefined, "", "version with spaces", "version/branch", "v1\nprivate"]) {
    assert.equal(resolveSentryRelease(value), undefined);
  }
});

test("exige DSN e ambiente explicitos antes de inicializar o SDK ou liberar CSP", () => {
  for (const [dsn, environment] of [
    [undefined, undefined],
    [undefined, "homolog"],
    [VALID_DSN, undefined],
    [VALID_DSN, "None"],
    [VALID_DSN, "team/homolog"],
  ]) {
    assert.equal(createSentryOptions(dsn, environment), null);
    assert.equal(getSentryIngestOrigin(dsn, environment), null);
    assert.equal(resolveSentryRuntimeConfiguration(dsn, environment), null);
  }
});

test("desabilita toda coleta fora de erros quando runtime esta completo", () => {
  const options = createSentryOptions(VALID_DSN, "homolog");
  assert.ok(options);

  assert.equal(options.dsn, VALID_DSN);
  assert.equal(options.enabled, true);
  assert.equal(options.environment, "homolog");
  assert.equal(options.maxBreadcrumbs, 0);
  assert.equal(options.enableMetrics, false);
  assert.equal(options.enableLogs, false);
  assert.equal(options.profilesSampleRate, 0);
  assert.equal(options.profileSessionSampleRate, 0);
  assert.equal(options.propagateTraceparent, false);
  assert.equal(options.replaysOnErrorSampleRate, 0);
  assert.equal(options.replaysSessionSampleRate, 0);
  assert.equal(options.sendClientReports, false);
  assert.deepEqual(options.tracePropagationTargets, []);
  assert.equal(options.tracesSampleRate, 0);
  assert.deepEqual(SENTRY_DATA_COLLECTION, {
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

test("mantem somente integracoes compativeis com captura de erro privada", () => {
  const disabledNames = [
    "Breadcrumbs",
    "BrowserProfiling",
    "BrowserSession",
    "BrowserTracing",
    "ChildProcess",
    "Console",
    "Context",
    "ContextLines",
    "ConversationId",
    "CultureContext",
    "ExtraErrorData",
    "Feedback",
    "Http",
    "HttpContext",
    "LocalVariables",
    "LocalVariablesAsync",
    "Modules",
    "NodeFetch",
    "NodeProfiling",
    "NodeSystemError",
    "OnUncaughtException",
    "OnUnhandledRejection",
    "ProcessSession",
    "Profiling",
    "Replay",
    "ReplayCanvas",
    "RequestData",
    "Spotlight",
    "Undici",
    "WinterCGFetch",
  ];
  const preservedIntegrations = [
    { name: "GlobalHandlers", runtime: "browser" },
    { name: "InboundFilters", runtime: "all" },
    { name: "LinkedErrors", runtime: "all" },
    { name: "NextjsClientStackFrameNormalization", runtime: "browser" },
  ];
  const integrations = [
    ...disabledNames.map((name) => ({ name, runtime: "private-or-non-error" })),
    ...preservedIntegrations,
  ];

  assert.deepEqual(filterSentryErrorIntegrations(integrations), preservedIntegrations);
  const options = createSentryOptions(VALID_DSN, "production");
  assert.ok(options);
  assert.deepEqual(
    options.integrations(integrations).map(({ name }) => name),
    preservedIntegrations.map(({ name }) => name),
  );
});

test("remove PII e contexto operacional mantendo stack simbolizavel", () => {
  const event = {
    breadcrumbs: [{ message: "e-mail paciente@example.com" }],
    contexts: { custom: { patient: "paciente@example.com" } },
    debug_meta: {
      images: [
        {
          code_file:
            "https://private:secret@lectum.example/_next/static/chunk.js?token=secret#private",
          code_id: "patient@example.com",
          debug_file: "/Users/patient/private.map",
          debug_id: "12345678-1234-1234-1234-123456789abc",
          image_addr: "patient@example.com",
          internal_future_field: "patient@example.com",
          type: "sourcemap",
        },
        {
          code_file: "patient@example.com",
          debug_file: "patient@example.com",
          debug_id: "private-debug-id",
          type: "wasm",
        },
      ],
    },
    event_id: "0123456789abcdef0123456789abcdef",
    exception: {
      values: [
        {
          mechanism: {
            data: { target: "paciente@example.com" },
            handled: false,
            source: "provider.secret",
            type: "onerror",
          },
          stacktrace: {
            frames: [
              {
                abs_path:
                  "https://private:secret@lectum.example/_next/static/chunk.js?token=secret#private",
                addr_mode: "relative",
                arbitrary_future_field: "paciente@example.com",
                colno: 7,
                context_line: "const token = secret",
                debug_id: "12345678-1234-1234-1234-123456789abc",
                filename: "webpack://frontend/src/app/page.tsx?patient=secret#private\u0000",
                function: "renderProfile",
                in_app: true,
                instruction_addr: "patient@example.com",
                lineno: 42,
                module: "frontend.profile",
                module_metadata: { secret: true },
                package: "patient@example.com",
                platform: "javascript",
                post_context: ["patient@example.com"],
                pre_context: ["authorization"],
                raw_function: "renderProfile(patient@example.com)",
                status: "patient@example.com",
                vars: { token: "secret" },
              },
              { filename: "patient@example.com" },
            ],
          },
          type: "TypeError",
          value: "Falha para paciente@example.com com bearer secret",
        },
        {
          type: "Patient-paciente@example.com",
          value: "sensitive",
        },
      ],
    },
    extra: { response: { password: "secret" } },
    fingerprint: ["patient@example.com"],
    logger: "provider",
    logentry: { message: "token secret" },
    message: "CPF 123.456.789-00",
    request: {
      cookies: { session: "secret" },
      data: { health: "sensitive" },
      headers: { authorization: "secret" },
      query_string: "patient=example",
      url: "https://lectum.example/app/perfil?id=secret",
    },
    server_name: "internal-host",
    tags: { user_id: "patient-id" },
    transaction: "/app/perfil/patient-id",
    user: { email: "paciente@example.com", id: "patient-id" },
  };

  const sanitized = sanitizeSentryEvent(event);
  assert.ok(sanitized);
  const exception = sanitized.exception?.values?.[0];
  const frame = exception?.stacktrace?.frames?.[0];

  assert.equal(sanitized.event_id, "0123456789abcdef0123456789abcdef");
  assert.deepEqual(sanitized.debug_meta, {
    images: [
      {
        code_file: "sourcemap/12345678-1234-1234-1234-123456789abc.js",
        debug_id: "12345678-1234-1234-1234-123456789abc",
        type: "sourcemap",
      },
    ],
  });
  assert.equal(sanitized.message, undefined);
  assert.equal(sanitized.request, undefined);
  assert.equal(sanitized.user, undefined);
  assert.equal(sanitized.breadcrumbs, undefined);
  assert.equal(sanitized.contexts, undefined);
  assert.equal(sanitized.extra, undefined);
  assert.equal(sanitized.tags, undefined);
  assert.equal(sanitized.transaction, undefined);
  assert.equal(exception?.type, "TypeError");
  assert.equal(exception?.value, "Falha capturada pela aplicação.");
  assert.equal(sanitized.exception?.values?.[1]?.type, "Error");
  assert.deepEqual(exception?.mechanism, {
    handled: false,
    synthetic: undefined,
    type: "onerror",
  });
  assert.equal(frame?.filename, "sourcemap/12345678-1234-1234-1234-123456789abc.js");
  assert.equal(frame?.abs_path, "sourcemap/12345678-1234-1234-1234-123456789abc.js");
  assert.equal(frame?.lineno, 42);
  assert.equal(frame?.colno, 7);
  assert.equal(frame?.debug_id, "12345678-1234-1234-1234-123456789abc");
  assert.equal(frame?.function, undefined);
  assert.equal(frame?.module, undefined);
  assert.equal(frame?.platform, "javascript");
  assert.equal(frame?.in_app, true);
  assert.equal(frame?.vars, undefined);
  assert.equal(frame?.context_line, undefined);
  assert.equal(frame?.pre_context, undefined);
  assert.equal(frame?.post_context, undefined);
  assert.equal(frame?.module_metadata, undefined);
  assert.equal(frame?.raw_function, undefined);
  assert.equal(frame?.package, undefined);
  assert.equal(frame?.instruction_addr, undefined);
  assert.equal(frame?.addr_mode, undefined);
  assert.equal(frame?.status, undefined);
  assert.equal(frame?.arbitrary_future_field, undefined);
  assert.equal(exception?.stacktrace?.frames?.[1]?.filename, "runtime/frame-001");
});

test("normaliza paths locais para identificadores sintéticos sem estrutura interna", () => {
  const sanitized = sanitizeSentryEvent({
    debug_meta: {
      internal_path: "/Users/maria/Projects/lectum/private",
      images: [
        {
          code_file:
            "file:///Users/maria/Projects/lectum/frontend/.next/static/chunks/app-profile.js?token=secret",
          code_id: "/home/deploy/private",
          debug_file: "C:\\Users\\maria\\private\\app-profile.js.map",
          debug_id: "abcdefab-cdef-abcd-efab-cdefabcdefab",
          type: "sourcemap",
        },
        {
          code_file: "file:///home/deploy/private/module.wasm",
          debug_file: "/home/deploy/private/module.debug.wasm",
          debug_id: "abcdefab-cdef-abcd-efab-cdefabcdefab",
          type: "wasm",
        },
      ],
    },
    exception: {
      values: [
        {
          stacktrace: {
            frames: [
              {
                abs_path:
                  "/Users/maria/Projects/lectum/frontend/.next/server/app/perfil/page.js?patient=secret",
              },
              {
                filename: "/home/deploy/lectum/frontend/src/app/perfil/page.tsx#private",
              },
              {
                abs_path:
                  "C:\\Users\\joana\\Projects\\lectum\\frontend\\.next\\static\\chunks\\profile.js?secret=1",
              },
              {
                filename:
                  "file:///home/runner/work/lectum/frontend/.next/server/chunks/worker.js?email=private",
              },
              {
                abs_path: "\\\\internal-host\\private-share\\tenant-secret\\runtime.js",
              },
              {
                filename: "src/patient@example.com/private-profile.tsx",
              },
            ],
          },
          type: "TypeError",
        },
      ],
    },
  });

  assert.ok(sanitized);
  assert.deepEqual(
    sanitized.exception?.values?.[0]?.stacktrace?.frames?.map(
      ({ abs_path, filename }) => abs_path ?? filename,
    ),
    [
      "runtime/frame-001.js",
      "runtime/frame-002.tsx",
      "runtime/frame-003.js",
      "runtime/frame-004.js",
      "runtime/frame-005.js",
      "runtime/frame-006.tsx",
    ],
  );
  assert.deepEqual(sanitized.debug_meta, {
    images: [
      {
        code_file: "sourcemap/abcdefab-cdef-abcd-efab-cdefabcdefab.js",
        debug_id: "abcdefab-cdef-abcd-efab-cdefabcdefab",
        type: "sourcemap",
      },
    ],
  });

  const serialized = JSON.stringify(sanitized);
  for (const sensitiveValue of [
    "file:",
    "/Users/",
    "/home/",
    "C:\\\\Users",
    "maria",
    "joana",
    "internal-host",
    "private-share",
    "patient@example.com",
    "tenant-secret",
  ]) {
    assert.equal(serialized.includes(sensitiveValue), false, sensitiveValue);
  }
});

test("não transporta CPF ou token presentes em nomes dinâmicos de stack", () => {
  const sanitized = sanitizeSentryEvent({
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
  const sanitized = sanitizeSentryEvent({
    dist: "123.456.789-00",
    environment: "sk_live_SUPERSECRET123",
    event_id: "patient@example.com",
    exception: { values: [{ type: "TypeError" }] },
    level: "error",
    platform: "+5511999999999",
    release: "lectum-frontend@12345678900",
    sdk: { name: "patient@example.com", version: "sk_live_SUPERSECRET123" },
    tags: {
      "lectum.browser": "Chrome",
      "lectum.destination": "download?token=secret",
      "lectum.feature": "share-video-artifact",
      "lectum.profile": "720x1280",
      "lectum.stage": "mediabunny-can-encode",
      user_id: "patient-id",
    },
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
          value: "Falha capturada pela aplicação.",
        },
      ],
    },
    level: "error",
    platform: undefined,
    release: undefined,
    tags: {
      "lectum.browser": "chrome",
      "lectum.feature": "share-video-artifact",
      "lectum.profile": "720x1280",
      "lectum.stage": "mediabunny-can-encode",
    },
    timestamp: undefined,
    type: undefined,
  });
  assert.doesNotMatch(
    JSON.stringify(sanitized),
    /123\.456\.789-00|sk_live_SUPERSECRET123|patient@example\.com|5511999999999|12345678900|patient-id|download\?token/,
  );
});

test("descarta envelopes que nao representam erros", () => {
  const options = createSentryOptions(VALID_DSN, "production");
  assert.ok(options);
  const hint = {
    attachments: [{ data: "private", filename: "private.txt" }],
    data: { patient: "patient@example.com" },
  };

  assert.equal(
    options.beforeSend(
      {
        contexts: { patient: { email: "patient@example.com" } },
        type: "transaction",
      },
      hint,
    ),
    null,
  );
  assert.equal(hint.attachments, undefined);
  assert.equal(hint.data, undefined);
  assert.equal(
    options.beforeSend({ exception: { values: [{ type: "Error" }] }, level: "warning" }, {}),
    null,
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
    assert.doesNotThrow(() => sanitizeSentryEvent(malformedEvent));
    assert.equal(sanitizeSentryEvent(malformedEvent), null);
  }

  const options = createSentryOptions(VALID_DSN, "production");
  assert.ok(options);
  const hint = {
    attachments: [{ data: "private", filename: "private.txt" }],
    captureContext: { extra: { token: "private" } },
    data: { patient: "patient@example.com" },
  };
  assert.equal(options.beforeSend({ exception: { values: [null] } }, hint), null);
  assert.equal(hint.attachments, undefined);
  assert.equal(hint.captureContext, undefined);
  assert.equal(hint.data, undefined);
});

test("remove anexos e contexto do hint e descarta evento sem exceção", () => {
  const options = createSentryOptions(VALID_DSN, "production");
  assert.ok(options);
  const hint = {
    attachments: [{ data: "secret", filename: "private.txt" }],
    captureContext: { extra: { secret: true } },
    data: { response: "secret" },
  };

  const event = options.beforeSend({ message: "secret" }, hint);

  assert.equal(options.enabled, true);
  assert.equal(hint.attachments, undefined);
  assert.equal(hint.captureContext, undefined);
  assert.equal(hint.data, undefined);
  assert.equal(event, null);
});
