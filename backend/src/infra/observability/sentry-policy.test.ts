import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { ErrorEvent, EventHint } from "@sentry/node";
import {
  createSafeOperationalError,
  normalizeSentryBoundary,
  normalizeSentryOperation,
  parseSentryDsn,
  resolveSentryRuntimeConfig,
  sanitizeSentryErrorEvent,
  shouldCaptureExpressError,
} from "./sentry-policy";

describe("Sentry backend policy", () => {
  it("permanece desabilitado sem DSN ou com configuração inválida", () => {
    const publicKey = "0123456789abcdef0123456789abcdef";

    assert.deepEqual(resolveSentryRuntimeConfig({ NODE_ENV: "homolog" }), {
      dsn: undefined,
      enabled: false,
      environment: "unknown",
    });
    assert.equal(parseSentryDsn("not-a-dsn"), undefined);
    assert.equal(parseSentryDsn(`http://${publicKey}@o123.ingest.sentry.io/123`), undefined);
    assert.equal(parseSentryDsn(`https://${publicKey}@example.com/123`), undefined);
    assert.equal(parseSentryDsn(`https://${publicKey}@localhost/123`), undefined);
    assert.equal(parseSentryDsn(`https://${publicKey}@127.0.0.1/123`), undefined);
    assert.equal(
      parseSentryDsn(`https://${publicKey}:secret@o123.ingest.sentry.io/123`),
      undefined,
    );
    assert.equal(parseSentryDsn("https://public@o123.ingest.sentry.io/123"), undefined);
    assert.equal(
      parseSentryDsn(`https://${publicKey}@o123.ingest.sentry.io/prefix/123`),
      undefined,
    );
    assert.equal(parseSentryDsn(`https://${publicKey}@o123.ingest.sentry.io/project`), undefined);
    assert.equal(parseSentryDsn(`https://${publicKey}@o123.ingest.sentry.io/123/`), undefined);
    const validDsn = `https://${publicKey}@o123.ingest.us.sentry.io/4501234567890123`;
    assert.deepEqual(resolveSentryRuntimeConfig({ NODE_ENV: "homolog", SENTRY_DSN: validDsn }), {
      dsn: undefined,
      enabled: false,
      environment: "unknown",
    });
    assert.deepEqual(
      resolveSentryRuntimeConfig({
        NODE_ENV: "homolog",
        SENTRY_DSN: validDsn,
        SENTRY_ENVIRONMENT: "invalid/environment",
      }),
      {
        dsn: undefined,
        enabled: false,
        environment: "unknown",
      },
    );
    assert.deepEqual(
      resolveSentryRuntimeConfig({
        SENTRY_DSN: validDsn,
        SENTRY_ENVIRONMENT: "patient_12345678900",
      }),
      {
        dsn: undefined,
        enabled: false,
        environment: "unknown",
      },
    );
    assert.deepEqual(
      resolveSentryRuntimeConfig({
        NODE_ENV: "production",
        SENTRY_DSN: validDsn,
        SENTRY_ENVIRONMENT: "homolog",
      }),
      {
        dsn: validDsn,
        enabled: true,
        environment: "homolog",
      },
    );
  });

  it("sintetiza todos os paths sem transportar seus segmentos", () => {
    const event: ErrorEvent = {
      type: undefined,
      exception: {
        values: [
          {
            stacktrace: {
              frames: [
                { filename: "file:///workspace/backend/src/main/server/app.ts" },
                { filename: "/workspace/backend/dist/main/server/app.js" },
                { filename: "/workspace/backend/node_modules/@sentry/node/index.js" },
                { filename: "node:internal/process/task_queues" },
                { filename: "/workspace/src/patient@example.com/token-secret.ts" },
                { filename: "/workspace/dist/private/credentials.js" },
                { filename: "node:internal/patient@example.com/token-secret" },
                { filename: "file://user:password@host/src/main.ts" },
                { filename: "/workspace/src/main.ts?token=secret" },
                { filename: "/workspace/src/main%00secret.ts" },
              ],
            },
            type: "Error",
          },
        ],
      },
      level: "error",
    };

    const sanitized = sanitizeSentryErrorEvent(event);
    const frames = sanitized?.exception?.values?.[0]?.stacktrace?.frames;

    assert.deepEqual(
      frames?.map((frame) => frame.filename),
      [
        "runtime/frame-001.ts",
        "runtime/frame-002.js",
        "runtime/frame-003.js",
        "runtime/node.js",
        "runtime/frame-005.ts",
        "runtime/frame-006.js",
        "runtime/node.js",
        "runtime/frame-008.ts",
        "runtime/frame-009.ts",
        "runtime/frame-010.ts",
      ],
    );
    assert.doesNotMatch(
      JSON.stringify(sanitized),
      /patient@example\.com|token-secret|credentials|user:password|main%00secret/i,
    );
  });

  it("reduz eventos a erro, frames sintéticos e tags controladas", () => {
    const event: ErrorEvent = {
      type: undefined,
      breadcrumbs: [
        {
          category: "http",
          data: { authorization: "Bearer secret" },
          message: "provider response",
        },
      ],
      contexts: { provider: { raw: "provider detail" } },
      environment: "homolog",
      exception: {
        values: [
          {
            mechanism: {
              data: { handler: "private-handler" },
              handled: true,
              type: "express",
            },
            stacktrace: {
              frames: [
                {
                  abs_path: "file:///internal/app/src/private.ts",
                  colno: 7,
                  context_line: "const password = request.body.password",
                  filename: "file:///workspace/backend/src/main/server/error.ts",
                  function: "obj.<computed> [as sk_live_SUPERSECRET123]",
                  in_app: true,
                  lineno: 42,
                  post_context: ["secret"],
                  pre_context: ["secret"],
                  vars: { email: "patient@example.com", password: "secret" },
                },
                {
                  abs_path: "file:///home/maria.silva/private/custom.ts",
                  filename: "src/12345678900.ts",
                  module: "patient_12345678900",
                },
              ],
            },
            type: "PrismaClientKnownRequestError",
            value: "SELECT * FROM users WHERE email = patient@example.com",
          },
        ],
      },
      extra: { databaseUrl: "postgresql://user:password@internal/database" },
      level: "error",
      logentry: { message: "provider error" },
      message: "provider error with SQL",
      platform: "node",
      release: "lectum-backend@0.1.0",
      request: {
        cookies: { session: "secret" },
        data: { email: "patient@example.com", password: "secret" },
        headers: { authorization: "Bearer secret" },
        method: "POST",
        query_string: "code=secret",
        url: "https://api.example.com/callback?code=secret",
      },
      server_name: "internal-host",
      tags: {
        "lectum.boundary": "http_controller",
        "lectum.operation": "account_delete",
        email: "patient@example.com",
      },
      transaction: "POST /api/private/account/user-id",
      user: { email: "patient@example.com", id: "user-id", ip_address: "127.0.0.1" },
    };

    assert.deepEqual(sanitizeSentryErrorEvent(event), {
      type: undefined,
      environment: "homolog",
      exception: {
        values: [
          {
            mechanism: { handled: true, type: "generic" },
            stacktrace: {
              frames: [
                {
                  colno: 7,
                  filename: "runtime/frame-001.ts",
                  in_app: true,
                  lineno: 42,
                },
                {
                  filename: "runtime/frame-002.ts",
                },
              ],
            },
            type: "UnhandledServerError",
          },
        ],
      },
      level: "error",
      platform: "node",
      release: "lectum-backend@0.1.0",
      tags: {
        "lectum.boundary": "http_controller",
        "lectum.operation": "account_delete",
      },
    });

    const serialized = JSON.stringify(sanitizeSentryErrorEvent(event));
    assert.doesNotMatch(serialized, /12345678900|sk_live|SUPERSECRET|patient_/i);
  });

  it("preserva somente classificação controlada e frames de erro operacional", () => {
    const original = new Error("segredo do provider patient@example.com");
    const safeError = createSafeOperationalError(original, "DigestSchedulerError");

    assert.equal(safeError.name, "LectumOperationalError");
    assert.equal(safeError.message, "DigestSchedulerError");
    assert.doesNotMatch(safeError.stack ?? "", /segredo|provider|patient@example\.com/);
    assert.match(safeError.stack ?? "", /DigestSchedulerError/);
    assert.equal(normalizeSentryBoundary("scheduler"), "scheduler");
    assert.equal(normalizeSentryBoundary("patient_12345678900"), "runtime");
    assert.equal(normalizeSentryOperation("notification_digest"), "notification_digest");
    assert.equal(normalizeSentryOperation("patient@example.com"), undefined);
    assert.equal(normalizeSentryOperation("sk_live_SUPERSECRET123"), undefined);
  });

  it("captura somente falhas HTTP operacionais", () => {
    assert.equal(shouldCaptureExpressError({ status: 400 }), false);
    assert.equal(shouldCaptureExpressError({ name: "ZodError" }), false);
    assert.equal(shouldCaptureExpressError({ statusCode: 404 }), false);
    assert.equal(shouldCaptureExpressError({ output: { statusCode: 503 } }), true);
    assert.equal(shouldCaptureExpressError(new Error("unknown")), true);
  });

  it("descarta mensagens sem exceção e níveis não operacionais", () => {
    assert.equal(
      sanitizeSentryErrorEvent({ type: undefined, level: "info", message: "startup" }),
      null,
    );
    assert.equal(
      sanitizeSentryErrorEvent({
        type: undefined,
        exception: { values: [{ type: "Error" }] },
        level: "warning",
      }),
      null,
    );
  });

  it("não transporta PII em metadados técnicos adulterados", () => {
    const sanitized = sanitizeSentryErrorEvent({
      environment: "patient_12345678900",
      event_id: "patient@example.com",
      exception: { values: [{ type: "Error" }] },
      level: "error",
      platform: "token-secret",
      release: "sk_live_SUPERSECRET123",
      tags: {
        "lectum.boundary": "patient_12345678900",
        "lectum.operation": "sk_live_SUPERSECRET123",
      },
      timestamp: 12_345_678_900,
      type: undefined,
    });

    assert.deepEqual(sanitized, {
      exception: { values: [{ type: "UnhandledServerError" }] },
      level: "error",
      tags: { "lectum.boundary": "runtime" },
      type: undefined,
    });
  });

  it("falha fechado sem gerar uma nova exceção para evento malformado", () => {
    const hint: EventHint = {
      attachments: [{ data: "patient@example.com", filename: "private.txt" }],
      captureContext: { extra: { token: "sk_live_SUPERSECRET123" } },
      data: { cpf: "12345678900" },
    };
    const malformed = {
      exception: { values: [null] },
      level: "error",
      type: undefined,
    } as unknown as ErrorEvent;

    assert.doesNotThrow(() => sanitizeSentryErrorEvent(malformed, hint));
    assert.equal(sanitizeSentryErrorEvent(malformed, hint), null);
    assert.equal(hint.attachments, undefined);
    assert.equal(hint.captureContext, undefined);
    assert.equal(hint.data, undefined);
  });
});
