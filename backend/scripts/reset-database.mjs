#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import net from "node:net";
import { dirname, resolve } from "node:path";
import { stdin as input, stdout as output } from "node:process";
import readline from "node:readline/promises";
import { fileURLToPath } from "node:url";
import { DeleteObjectsCommand, ListObjectsV2Command, S3Client } from "@aws-sdk/client-s3";
import { config as loadEnv } from "dotenv";
import { MercadoPagoConfig, PreApproval } from "mercadopago";
import pg from "pg";

const { Client: PgClient } = pg;

const currentFilePath = fileURLToPath(import.meta.url);
const backendRoot = resolve(dirname(currentFilePath), "..");
const envPath = resolve(backendRoot, ".env");

if (existsSync(envPath)) {
  loadEnv({ path: envPath, quiet: true });
}

const scriptArgs = process.argv.slice(2);
const isDryRun = scriptArgs.includes("--dry-run");
const shouldShowHelp = scriptArgs.includes("--help") || scriptArgs.includes("-h");
const shouldSkipPrompt =
  process.env.LECTUM_CONFIRM_DB_RESET === "1" ||
  scriptArgs.includes("--force") ||
  scriptArgs.includes("-f") ||
  scriptArgs.includes("--yes") ||
  scriptArgs.includes("-y");

if (shouldShowHelp) {
  printHelp();
  process.exit(0);
}

const prismaArgs = scriptArgs.filter(
  (arg) => !["--", "--force", "-f", "--yes", "-y", "--dry-run"].includes(arg),
);

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  fail("DATABASE_URL não encontrada. Configure backend/.env ou exporte a variável antes do reset.");
}

const parsedDatabaseUrl = parseDatabaseUrl(databaseUrl);
const databaseTarget = formatDatabaseTarget(parsedDatabaseUrl);

assertSafeDatabaseTarget(parsedDatabaseUrl);

const r2Config = buildR2Config();
const mercadoPagoConfig = await buildMercadoPagoConfig();
const localMercadoPagoReferences = await readLocalMercadoPagoReferences(databaseUrl);
const mercadoPagoSubscriptions = await collectMercadoPagoSubscriptions({
  ...mercadoPagoConfig,
  localPlanIds: localMercadoPagoReferences.planIds,
  localSubscriptionIds: localMercadoPagoReferences.subscriptionIds,
});
const r2ObjectCount = await countR2Objects(r2Config);

console.log("⚠️  Reset total do ambiente de desenvolvimento Lectum.");
console.log(`Banco alvo: ${databaseTarget}`);
console.log(`R2 alvo: ${formatR2Target(r2Config)}`);
console.log(
  `Mercado Pago alvo: sandbox (${mercadoPagoSubscriptions.size} assinatura(s) encontrada(s) para cancelar)`,
);
console.log(
  "A operação irá cancelar assinaturas sandbox, limpar arquivos públicos do R2 e resetar o banco.",
);
console.log("As migrations Prisma serão reaplicadas pelo prisma migrate reset.");

if (isDryRun) {
  printDryRunSummary({
    databaseTarget,
    localMercadoPagoReferences,
    mercadoPagoSubscriptions,
    r2Config,
    r2ObjectCount,
  });
  process.exit(0);
}

if (!shouldSkipPrompt) {
  await confirmReset(databaseTarget, r2Config.bucketName, mercadoPagoSubscriptions.size);
}

await cancelMercadoPagoSandboxSubscriptions(
  mercadoPagoConfig.preApproval,
  mercadoPagoSubscriptions,
);
await cleanR2Objects(r2Config);
runPrismaReset(prismaArgs);

function printHelp() {
  console.log(`Reset total do ambiente de desenvolvimento Lectum.

Uso:
  pnpm --dir backend reset
  pnpm --dir backend reset -- --force
  pnpm --dir backend reset -- --dry-run

O script executa, nesta ordem:
  1. cancela assinaturas sandbox do Mercado Pago relacionadas ao ambiente Lectum;
  2. remove objetos publicados no bucket R2 configurado;
  3. executa prisma migrate reset --force, reaplicando as migrations.

Flags:
  --dry-run   lista os alvos e contagens sem apagar/cancelar/resetar
  --force     pula a confirmação interativa, mantendo os bloqueios de segurança
  --help      mostra esta ajuda

Config obrigatória em backend/.env:
  DATABASE_URL
  CLOUDFLARE_R2_ENDPOINT
  CLOUDFLARE_R2_ACCESS_KEY_ID
  CLOUDFLARE_R2_ACCESS_KEY_SECRET
  CLOUDFLARE_R2_PUBLIC_BUCKET_NAME
  MERCADO_PAGO_ENV=sandbox
  MERCADO_PAGO_ACCESS_TOKEN=APP_USR-... de conta Mercado Pago vendedora de teste
`);
}

async function readLocalMercadoPagoReferences(connectionString) {
  const client = new PgClient({ connectionString });
  const subscriptionIds = new Set();
  const planIds = new Set();

  try {
    await client.connect();

    const tables = await client.query(`
      SELECT
        to_regclass('public.professional_subscriptions') AS subscriptions_table,
        to_regclass('public.subscription_plans') AS plans_table
    `);
    const tableStatus = tables.rows[0] || {};

    if (tableStatus.subscriptions_table) {
      const subscriptions = await client.query(`
        SELECT DISTINCT gateway_subscription_id AS id
        FROM professional_subscriptions
        WHERE gateway = 'mercadopago'
          AND gateway_subscription_id IS NOT NULL
          AND gateway_subscription_id <> ''
      `);

      for (const row of subscriptions.rows) {
        addNonEmpty(subscriptionIds, row.id);
      }
    }

    if (tableStatus.plans_table) {
      const plans = await client.query(`
        SELECT DISTINCT gateway_plan_id AS id
        FROM subscription_plans
        WHERE gateway_plan_id IS NOT NULL
          AND gateway_plan_id <> ''
      `);

      for (const row of plans.rows) {
        addNonEmpty(planIds, row.id);
      }
    }
  } finally {
    await client.end().catch(() => undefined);
  }

  addNonEmpty(planIds, process.env.MERCADO_PAGO_PREAPPROVAL_PLAN_ID);

  return { planIds, subscriptionIds };
}

function buildR2Config() {
  const endpoint = requireEnv("CLOUDFLARE_R2_ENDPOINT");
  const accessKeyId = requireEnv("CLOUDFLARE_R2_ACCESS_KEY_ID");
  const secretAccessKey = requireEnv("CLOUDFLARE_R2_ACCESS_KEY_SECRET");
  const bucketName = requireEnv("CLOUDFLARE_R2_PUBLIC_BUCKET_NAME");
  const prefix = process.env.LECTUM_RESET_R2_PREFIX?.trim() || "";

  assertSafeR2Target({ bucketName, endpoint });

  return {
    bucketName,
    client: new S3Client({
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
      endpoint,
      region: "auto",
    }),
    prefix,
  };
}

async function buildMercadoPagoConfig() {
  const gatewayEnv = requireEnv("MERCADO_PAGO_ENV").toLowerCase();

  if (gatewayEnv !== "sandbox") {
    fail("Reset bloqueado: limpeza Mercado Pago só é permitida com MERCADO_PAGO_ENV=sandbox.");
  }

  const accessToken = requireEnv("MERCADO_PAGO_ACCESS_TOKEN");

  await assertMercadoPagoSandboxAccessToken(accessToken);

  const client = new MercadoPagoConfig({
    accessToken,
    options: {
      timeout: 10_000,
    },
  });

  return {
    preApproval: new PreApproval(client),
    searchQuery: process.env.LECTUM_RESET_MERCADO_PAGO_SEARCH_QUERY?.trim() || "",
    statuses: parseList(
      process.env.LECTUM_RESET_MERCADO_PAGO_STATUSES || "authorized,pending,paused",
    ),
  };
}

async function assertMercadoPagoSandboxAccessToken(accessToken) {
  if (!accessToken.startsWith("APP_USR-")) {
    fail(
      "Reset bloqueado: MERCADO_PAGO_ACCESS_TOKEN precisa ser APP_USR-* de uma conta Mercado Pago vendedora de teste.",
    );
  }

  let response;
  let user;

  try {
    response = await fetch("https://api.mercadopago.com/users/me", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      signal: AbortSignal.timeout(10_000),
    });
    user = await response.json();
  } catch (err) {
    fail(
      `Reset bloqueado: não foi possível validar a conta Mercado Pago de teste (${formatError(err)}).`,
    );
  }

  const tags = Array.isArray(user?.tags) ? user.tags : [];

  if (!response.ok || !tags.includes("test_user")) {
    fail(
      [
        "Reset bloqueado: APP_USR-* só é permitido quando pertence a uma conta Mercado Pago de teste.",
        "Use as credenciais da aplicação criada dentro da conta vendedora de teste.",
      ].join("\n"),
    );
  }
}

async function collectMercadoPagoSubscriptions({
  localPlanIds,
  localSubscriptionIds,
  preApproval,
  searchQuery,
  statuses,
}) {
  const subscriptionIds = new Set(localSubscriptionIds);

  for (const planId of localPlanIds) {
    for (const status of statuses) {
      await searchMercadoPagoSubscriptions(preApproval, {
        onSubscription: (subscription) => addNonEmpty(subscriptionIds, subscription.id),
        options: {
          preapproval_plan_id: planId,
          status,
        },
      });
    }
  }

  if (searchQuery) {
    const normalizedQuery = searchQuery.toLowerCase();

    for (const status of statuses) {
      await searchMercadoPagoSubscriptions(preApproval, {
        onSubscription: (subscription) => {
          const reason = String(subscription.reason || "").toLowerCase();
          const externalReference = String(subscription.external_reference || "").toLowerCase();
          const matchesLectumQuery =
            reason.includes(normalizedQuery) || externalReference.includes(normalizedQuery);

          if (matchesLectumQuery) addNonEmpty(subscriptionIds, subscription.id);
        },
        options: {
          q: searchQuery,
          status,
        },
      });
    }
  }

  return subscriptionIds;
}

async function searchMercadoPagoSubscriptions(preApproval, { onSubscription, options }) {
  const limit = 50;
  let offset = 0;

  while (true) {
    const response = await preApproval.search({
      options: {
        ...options,
        limit,
        offset,
      },
    });

    const results = response.results || [];
    for (const subscription of results) {
      if (subscription.status !== "cancelled") onSubscription(subscription);
    }

    const total = response.paging?.total ?? results.length;
    offset += results.length;

    if (results.length === 0 || offset >= total) break;
  }
}

async function cancelMercadoPagoSandboxSubscriptions(preApproval, subscriptionIds) {
  if (subscriptionIds.size === 0) {
    console.log("[Mercado Pago] Nenhuma assinatura sandbox encontrada para cancelamento.");
    return;
  }

  console.log(`[Mercado Pago] Cancelando ${subscriptionIds.size} assinatura(s) sandbox...`);

  for (const subscriptionId of subscriptionIds) {
    try {
      await preApproval.update({
        body: { status: "cancelled" },
        id: subscriptionId,
        requestOptions: {
          idempotencyKey: `lectum-reset-cancel-${subscriptionId}`,
        },
      });
      console.log(`[Mercado Pago] Assinatura cancelada: ${subscriptionId}`);
    } catch (err) {
      const status = getErrorStatus(err);

      if (status === 404) {
        console.warn(`[Mercado Pago] Assinatura já ausente no sandbox: ${subscriptionId}`);
        continue;
      }

      throw new Error(
        `Falha ao cancelar assinatura Mercado Pago ${subscriptionId}: ${formatError(err)}`,
      );
    }
  }
}

async function countR2Objects({ bucketName, client, prefix }) {
  let count = 0;
  let continuationToken;

  do {
    const response = await client.send(
      new ListObjectsV2Command({
        Bucket: bucketName,
        ContinuationToken: continuationToken,
        Prefix: prefix || undefined,
      }),
    );

    count += response.Contents?.length || 0;
    continuationToken = response.NextContinuationToken;
  } while (continuationToken);

  return count;
}

async function cleanR2Objects({ bucketName, client, prefix }) {
  let deleted = 0;
  let continuationToken;

  console.log(`[R2] Limpando objetos de ${formatR2Target({ bucketName, prefix })}...`);

  do {
    const response = await client.send(
      new ListObjectsV2Command({
        Bucket: bucketName,
        ContinuationToken: continuationToken,
        Prefix: prefix || undefined,
      }),
    );
    const objects = (response.Contents || [])
      .map((item) => item.Key)
      .filter((key) => typeof key === "string" && key.length > 0)
      .map((Key) => ({ Key }));

    for (const batch of chunk(objects, 1000)) {
      if (batch.length === 0) continue;

      const deleteResponse = await client.send(
        new DeleteObjectsCommand({
          Bucket: bucketName,
          Delete: {
            Objects: batch,
            Quiet: true,
          },
        }),
      );

      if (deleteResponse.Errors?.length) {
        const firstError = deleteResponse.Errors[0];
        throw new Error(
          `Falha ao limpar R2 em ${firstError.Key}: ${firstError.Code || firstError.Message}`,
        );
      }

      deleted += batch.length;
    }

    continuationToken = response.NextContinuationToken;
  } while (continuationToken);

  console.log(`[R2] ${deleted} objeto(s) removido(s).`);
}

function runPrismaReset(extraPrismaArgs) {
  const pnpmCommand = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
  const resetResult = spawnSync(
    pnpmCommand,
    ["exec", "prisma", "migrate", "reset", "--force", ...extraPrismaArgs],
    {
      cwd: backendRoot,
      env: process.env,
      stdio: "inherit",
    },
  );

  if (resetResult.error) {
    fail(`Falha ao executar pnpm exec prisma migrate reset: ${resetResult.error.message}`);
  }

  process.exit(resetResult.status ?? 1);
}

function parseDatabaseUrl(value) {
  try {
    return new URL(value);
  } catch {
    fail("DATABASE_URL inválida. O reset só é permitido com uma URL PostgreSQL válida.");
  }
}

function assertSafeDatabaseTarget(url) {
  const nodeEnv = process.env.NODE_ENV?.toLowerCase();

  if (nodeEnv === "production" || nodeEnv === "prod") {
    fail("Reset bloqueado: NODE_ENV=production/prod.");
  }

  if (!isPostgresUrl(url)) {
    fail("Reset bloqueado: DATABASE_URL precisa usar protocolo postgresql:// ou postgres://.");
  }

  const targetLabel = `${url.hostname} ${url.pathname}`.toLowerCase();
  const isProbablyProduction = /(^|[^a-z])(prod|production|prd)([^a-z]|$)/i.test(targetLabel);

  if (isProbablyProduction) {
    fail("Reset bloqueado: o host ou nome do banco parece ser de produção.");
  }

  const allowNonLocal = process.env.LECTUM_ALLOW_NON_LOCAL_DB_RESET === "1";

  if (!allowNonLocal && !isLocalOrPrivateHost(url.hostname)) {
    fail(
      [
        "Reset bloqueado: o banco não parece local/privado.",
        "Use apenas bancos de desenvolvimento.",
        "Se for um ambiente dev descartável remoto, exporte LECTUM_ALLOW_NON_LOCAL_DB_RESET=1.",
      ].join("\n"),
    );
  }
}

function assertSafeR2Target({ bucketName, endpoint }) {
  const allowProductionLikeR2 = process.env.LECTUM_ALLOW_PRODUCTION_LIKE_R2_RESET === "1";
  const targetLabel = `${bucketName} ${endpoint}`.toLowerCase();
  const isProbablyProduction = /(^|[^a-z])(prod|production|prd)([^a-z]|$)/i.test(targetLabel);

  if (isProbablyProduction && !allowProductionLikeR2) {
    fail(
      [
        "Reset bloqueado: bucket/endpoint R2 parece ser de produção.",
        "Use um bucket de desenvolvimento ou configure LECTUM_ALLOW_PRODUCTION_LIKE_R2_RESET=1 somente para um alvo descartável.",
      ].join("\n"),
    );
  }
}

function isPostgresUrl(url) {
  return url.protocol === "postgresql:" || url.protocol === "postgres:";
}

function isLocalOrPrivateHost(hostname) {
  const normalizedHost = hostname.toLowerCase();
  const localHosts = new Set([
    "localhost",
    "host.docker.internal",
    "db",
    "database",
    "postgres",
    "postgresql",
  ]);

  if (localHosts.has(normalizedHost) || normalizedHost.endsWith(".local")) {
    return true;
  }

  if (normalizedHost === "::1" || normalizedHost === "0.0.0.0") {
    return true;
  }

  if (net.isIP(normalizedHost) === 4) {
    return isPrivateIPv4(normalizedHost) || normalizedHost.startsWith("127.");
  }

  return false;
}

function isPrivateIPv4(hostname) {
  const [first = 0, second = 0] = hostname.split(".").map(Number);

  if (first === 10 || first === 192) {
    return first === 10 || second === 168;
  }

  return first === 172 && second >= 16 && second <= 31;
}

function formatDatabaseTarget(url) {
  const databaseName = decodeURIComponent(url.pathname.replace(/^\//, ""));

  return `${url.protocol}//${url.hostname}:${url.port || "5432"}/${databaseName}`;
}

function formatR2Target({ bucketName, prefix }) {
  return prefix ? `${bucketName}/${prefix}` : `${bucketName}/*`;
}

function printDryRunSummary({
  databaseTarget,
  localMercadoPagoReferences,
  mercadoPagoSubscriptions,
  r2Config,
  r2ObjectCount,
}) {
  console.log("\n[dry-run] Nenhuma alteração executada.");
  console.log(`[dry-run] Banco que seria resetado: ${databaseTarget}`);
  console.log(
    `[dry-run] R2: ${r2ObjectCount} objeto(s) seriam removidos de ${formatR2Target(r2Config)}.`,
  );
  console.log(
    `[dry-run] Mercado Pago: ${mercadoPagoSubscriptions.size} assinatura(s) sandbox seriam canceladas.`,
  );
  console.log(
    `[dry-run] Referências locais: ${localMercadoPagoReferences.subscriptionIds.size} assinatura(s), ${localMercadoPagoReferences.planIds.size} plano(s).`,
  );
}

async function confirmReset(databaseTarget, bucketName, mercadoPagoSubscriptionCount) {
  if (!input.isTTY || !output.isTTY) {
    fail(
      [
        "Reset cancelado: ambiente não interativo.",
        "Execute manualmente ou use pnpm --dir backend reset -- --force em ambiente dev seguro.",
      ].join("\n"),
    );
  }

  const rl = readline.createInterface({ input, output });
  const answer = await rl.question(
    [
      "Digite RESET para confirmar:",
      `- reset do banco ${databaseTarget}`,
      `- limpeza do bucket R2 ${bucketName}`,
      `- cancelamento de ${mercadoPagoSubscriptionCount} assinatura(s) sandbox no Mercado Pago`,
      "> ",
    ].join("\n"),
  );
  rl.close();

  if (answer !== "RESET") {
    fail("Reset cancelado pelo usuário.");
  }
}

function requireEnv(key) {
  const value = process.env[key]?.trim();

  if (!value) {
    fail(`${key} não encontrada. Configure backend/.env antes do reset total.`);
  }

  return value;
}

function parseList(value) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function addNonEmpty(set, value) {
  const normalized = String(value || "").trim();
  if (normalized) set.add(normalized);
}

function chunk(items, size) {
  const chunks = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
}

function getErrorStatus(err) {
  if (!err || typeof err !== "object") return undefined;

  const record = err;
  const cause = typeof record.cause === "object" && record.cause ? record.cause : null;

  return record.status || record.statusCode || cause?.status || cause?.statusCode;
}

function formatError(err) {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;

  return "erro desconhecido";
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
