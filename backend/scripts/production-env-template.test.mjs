import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { parse } from "dotenv";

const backendRoot = new URL("../", import.meta.url);
const template = await readFile(new URL(".env.production.example", backendRoot), "utf8");
const env = parse(template);
const activeKeys = [...template.matchAll(/^([A-Z][A-Z0-9_]*)=/gm)].map((match) => match[1]);
const canonical = parse(await readFile(new URL(".env.example", backendRoot), "utf8"));

// Somente o modelo versionado e lido. Nunca carregar .env ou .env.production reais.
test("template production e dotenv valido, sem duplicatas, envs inventadas ou segredos", () => {
  assert.equal(new Set(activeKeys).size, activeKeys.length);
  assert.equal(Object.keys(env).length, activeKeys.length);
  for (const key of activeKeys) assert.ok(key in canonical, `Chave nao documentada: ${key}`);
  for (const key of [
    "DATABASE_URL",
    "JWT_SECRET_KEY",
    "ADMIN_JWT_SECRET",
    "GOOGLE_CLIENT_ID_API_USER",
    "GOOGLE_CLIENT_SECRET_API_USER",
    "EMAIL_API_KEY",
    "CLOUDFLARE_R2_ENDPOINT",
    "CLOUDFLARE_R2_ACCESS_KEY_ID",
    "CLOUDFLARE_R2_ACCESS_KEY_SECRET",
    "CLOUDFLARE_R2_PUBLIC_BUCKET_NAME",
    "CLOUDFLARE_STREAM_ACCOUNT_ID",
    "CLOUDFLARE_STREAM_API_TOKEN",
    "CLOUDFLARE_STREAM_CUSTOMER_CODE",
    "CLOUDFLARE_STREAM_SIGNING_KEY_ID",
    "CLOUDFLARE_STREAM_SIGNING_PRIVATE_KEY_BASE64",
    "CLOUDFLARE_STREAM_WEBHOOK_SECRET",
    "VIDEO_PROCESSING_SERVICE_URL",
    "VIDEO_SERVICE_API_KEY",
    "DOCUMENT_TOKEN",
    "VAPID_PUBLIC_KEY",
    "VAPID_PRIVATE_KEY",
    "MERCADO_PAGO_ACCESS_TOKEN",
    "MERCADO_PAGO_WEBHOOK_SECRET",
  ])
    assert.match(env[key], /^YOUR_OWN_PRODUCTION_[A-Z0-9_]+$/, key);
  assert.notEqual(env.JWT_SECRET_KEY, env.ADMIN_JWT_SECRET);
});

test("origens, limites e modos apontam para producao, sem dev/reset/backfill/sandbox", () => {
  assert.equal(env.NODE_ENV, "production");
  assert.equal(env.MERCADO_PAGO_ENV, "production");
  assert.equal(env.BASE, "https://api.lectum.com.br");
  assert.equal(env.WEB_URL, "https://lectum.com.br,https://admin.lectum.com.br");
  assert.equal(env.CLOUDFLARE_STREAM_ALLOWED_ORIGINS, env.WEB_URL);
  assert.equal(
    env.MERCADO_PAGO_BACK_URL,
    "https://lectum.com.br/app/profissional/assinatura/endereco",
  );
  assert.equal(env.CALLBACK_URL_API_USER, "https://lectum.com.br/auth/redirect");
  for (const value of Object.values(env))
    assert.doesNotMatch(value, /homolog|localhost|127\.0\.0\.1|192\.168\.250\.2/);
  for (const key of activeKeys)
    assert.doesNotMatch(
      key,
      /^(DEV_|LECTUM_RESET_|LECTUM_CONFIRM_DB_RESET|R2_TO_STREAM_|POST_SHARE_ARTIFACT_CLEANUP_)|SANDBOX|HIDRATE/,
    );
  for (const key of [
    "UPLOAD_LIMIT_PSYCHOLOGIST_VIDEO_MULTIPART_MB",
    "UPLOAD_LIMIT_COMMUNITY_POST_MEDIA_MULTIPART_MB",
    "UPLOAD_LIMIT_POST_REPLY_MEDIA_MULTIPART_MB",
  ])
    assert.equal(env[key], "1000");
  assert.equal(env.CLOUDFLARE_STREAM_MAX_DURATION_SECONDS, "600");
  assert.equal(env.RUN_DB_MIGRATIONS, "true");
  for (const key of [
    "DOCS_MODE",
    "SWAGGER",
    "SWAGGER_DEBUG",
    "NOTIFICATION_CAMPAIGNS_SCHEDULER_ENABLED",
    "BILLING_DUNNING_SCHEDULER_ENABLED",
  ])
    assert.equal(env[key], "false");
  assert.equal(env.CLOUDFLARE_STREAM_ENABLED, "true");
  assert.equal(env.HTTP_BODY_LIMIT, "1mb");
  assert.equal(env.VIDEO_PROCESSING_SERVICE_REQUEST_TIMEOUT_MS, "30000");
});

test("opcionais e lacunas de infraestrutura ficam explicitos sem configurar um provider falso", () => {
  for (const key of [
    "SENTRY_DSN",
    "SENTRY_ENVIRONMENT",
    "TWILIO_API_ACCOUNT_SID",
    "TWILIO_API_AUTH_TOKEN",
    "TWILIO_API_PHONE_NUMBER",
    "TWILIO_API_MESSAGING_SERVICE_SID",
    "IP_GEOLOCATION_TOKEN",
  ]) {
    assert.equal(env[key], undefined);
    assert.match(template, new RegExp(`^# ${key}=`, "m"));
  }
  assert.equal(env.MERCADO_PAGO_PREAPPROVAL_PLAN_ID, "");
  assert.match(template, /apenas UM webhook por conta/);
  assert.match(template, /REJEITA glit\.lectum\.com\.br/);
  assert.match(template, /\.env\.production NAO e carregado automaticamente/);
  assert.match(template, /fila e armazenamento isolados/);
});

test("Git libera somente o exemplo, Docker continua excluindo env production", async () => {
  const gitIgnore = await readFile(new URL(".gitignore", backendRoot), "utf8");
  const dockerIgnore = await readFile(new URL(".dockerignore", backendRoot), "utf8");
  assert.match(gitIgnore, /^\.env\*$/m);
  assert.match(gitIgnore, /^!\.env\.production\.example$/m);
  assert.doesNotMatch(gitIgnore, /^!\.env\.production$/m);
  assert.match(dockerIgnore, /^\.env\.\*$/m);
  assert.doesNotMatch(dockerIgnore, /^!\.env\.production(?:\.example)?$/m);
});

test("todas as envs canonicas estao cobertas ou excluidas com justificativa explicita", () => {
  const documented = new Set(
    [...template.matchAll(/^(?:# )?([A-Z][A-Z0-9_]*)=/gm)].map((m) => m[1]),
  );
  const excluded = new Set([
    // Orquestrador exclusivamente local.
    "FRONTEND_PORT",
    "DEV_ADMIN_ENABLED",
    "ADMIN_PORT",
    "DEV_BACKEND_READY_TIMEOUT_MS",
    "DEV_TUNNEL_ENABLED",
    "DEV_TUNNEL_PROVIDER",
    "DEV_TUNNEL_PROXY_PORT",
    "DEV_TUNNEL_NAME",
    "DEV_TUNNEL_URL",
    // Transporte de video de perfil R2 removido: nao ha consumidor de rota destes limites.
    "UPLOAD_LIMIT_PSYCHOLOGIST_VIDEO_SIMPLE_MB",
    "UPLOAD_LIMIT_PSYCHOLOGIST_VIDEO_MULTIPART_CHUNK_MB",
    // Comprador sandbox nunca pertence a configuracao de producao.
    "MERCADO_PAGO_SANDBOX_PAYER_EMAIL",
    // Reset exclusivamente local, proibido em ambiente publicado.
    "LECTUM_CONFIRM_DB_RESET",
    "LECTUM_RESET_R2_PREFIX",
    "LECTUM_RESET_MERCADO_PAGO_SEARCH_QUERY",
    "LECTUM_RESET_MERCADO_PAGO_STATUSES",
  ]);
  for (const key of Object.keys(canonical))
    assert.ok(
      documented.has(key) || excluded.has(key),
      `Classificar nova env no template production: ${key}`,
    );
  for (const key of excluded)
    assert.ok(!documented.has(key), `Env excluida nao deve reaparecer: ${key}`);
});
