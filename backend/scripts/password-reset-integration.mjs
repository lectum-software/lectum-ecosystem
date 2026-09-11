// Execução manual: node backend/scripts/password-reset-integration.mjs --image=lectum-backend:audit-0.1.319
// Requer Docker local, a imagem backend já construída e postgres:17-alpine disponível.
// Não lê .env; o único banco recebe nome aleatório em rede interna descartável, sem portas no host.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { chmodSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { setTimeout } from "node:timers/promises";
import { fileURLToPath } from "node:url";

const imageArgument = process.argv.slice(2);
if (
  imageArgument.length !== 1 ||
  !/^--image=lectum-backend:audit-\d+\.\d+\.\d+$/.test(imageArgument[0])
) {
  console.error("Informe somente --image=lectum-backend:audit-VERSAO.");
  process.exit(2);
}
const image = imageArgument[0].slice("--image=".length);
const suffix = randomBytes(10).toString("hex");
const network = `lectum-audit178-net-${suffix}`;
const database = `lectum-audit178-db-${suffix}`;
const migrate = `lectum-audit178-migrate-${suffix}`;
const probe = `lectum-audit178-probe-${suffix}`;
const directory = mkdtempSync(path.join(tmpdir(), "lectum-reset-audit-"));
chmodSync(directory, 0o700);
const label = `lectum.audit.run=${suffix}`;

const docker = (args, timeout = 120_000) => {
  const result = spawnSync("docker", args, { encoding: "utf8", timeout });
  if (result.status !== 0) throw new Error("Falha na etapa Docker; saída privada não exibida.");
  return result.stdout.trim();
};
const envFile = (name, content) => {
  const filename = path.join(directory, name);
  writeFileSync(filename, content, { mode: 0o600 });
  return filename;
};

try {
  docker(["image", "inspect", image]);
  docker(["image", "inspect", "postgres:17-alpine"]);
  const password = randomBytes(24).toString("hex");
  const dbEnv = envFile(
    "database.env",
    `POSTGRES_USER=lectum_audit\nPOSTGRES_DB=lectum_audit\nPOSTGRES_PASSWORD=${password}\n`,
  );
  const appEnv = envFile(
    "app.env",
    [
      "NODE_ENV=test",
      `DATABASE_URL=postgresql://lectum_audit:${password}@${database}:5432/lectum_audit`,
      `JWT_SECRET_KEY=${randomBytes(32).toString("hex")}`,
      `ADMIN_JWT_SECRET=${randomBytes(32).toString("hex")}`,
      "CRYPTO_ALGORITHM=bcrypt",
      "CODE_API_USER_VALID_MINUTES=1",
      "GOOGLE_CLIENT_ID_API_USER=unused-in-jwt-audit",
      "GOOGLE_CLIENT_SECRET_API_USER=unused-in-jwt-audit",
      "",
    ].join("\n"),
  );
  docker(["network", "create", "--internal", "--label", label, network]);
  docker([
    "run",
    "--rm",
    "-d",
    "--name",
    database,
    "--network",
    network,
    "--label",
    label,
    "--memory",
    "768m",
    "--cpus",
    "2",
    "--pids-limit",
    "128",
    "--env-file",
    dbEnv,
    "--tmpfs",
    "/var/lib/postgresql/data:rw,size=512m",
    "postgres:17-alpine",
  ]);
  let ready = false;
  for (let attempt = 0; attempt < 30; attempt++) {
    const result = spawnSync(
      "docker",
      ["exec", database, "pg_isready", "-U", "lectum_audit", "-d", "lectum_audit"],
      { timeout: 5000 },
    );
    if (result.status === 0) {
      ready = true;
      break;
    }
    await setTimeout(1000);
  }
  assert.equal(ready, true, "Banco descartável não iniciou.");
  console.log("ISOLATED_POSTGRES_READY");
  const base = [
    "run",
    "--rm",
    "--platform",
    "linux/amd64",
    "--network",
    network,
    "--label",
    label,
    "--env-file",
    appEnv,
    "--cap-drop",
    "ALL",
    "--security-opt",
    "no-new-privileges",
    "--memory",
    "768m",
    "--cpus",
    "2",
    "--pids-limit",
    "128",
  ];
  docker([
    ...base,
    "--name",
    migrate,
    "--entrypoint",
    "node",
    image,
    "node_modules/prisma/build/index.js",
    "migrate",
    "deploy",
  ]);
  console.log("ISOLATED_MIGRATIONS_APPLIED");
  const probePath = fileURLToPath(new URL("./password-reset-probe.cjs", import.meta.url));
  const result = spawnSync(
    "docker",
    [
      ...base,
      "--name",
      probe,
      "--read-only",
      "-v",
      `${probePath}:/tmp/probe.cjs:ro`,
      "--entrypoint",
      "node",
      image,
      "/tmp/probe.cjs",
    ],
    { encoding: "utf8", timeout: 120_000 },
  );
  for (const line of `${result.stdout || ""}\n${result.stderr || ""}`.split("\n")) {
    if (/^(CHECK_OK|INTEGRATION_FAILED|RESET_POSTGRES_HTTP_OK)( |$)/.test(line)) console.log(line);
  }
  assert.equal(result.status, 0, "Recuperação de senha não passou na integração isolada.");
} catch {
  console.error("PASSWORD_RESET_INTEGRATION_FAILED");
  process.exitCode = 1;
} finally {
  // Somente recursos com o identificador aleatório desta execução podem ser removidos.
  let cleanupFailed = false;
  for (const name of [probe, migrate, database]) {
    const owned = spawnSync(
      "docker",
      ["inspect", "--format", '{{ index .Config.Labels "lectum.audit.run" }}', name],
      { encoding: "utf8", timeout: 5000 },
    );
    if (owned.status === 0 && owned.stdout.trim() === suffix) {
      try {
        docker(["rm", "-f", name]);
      } catch {
        cleanupFailed = true;
      }
    }
  }
  const owned = spawnSync(
    "docker",
    ["network", "inspect", "--format", '{{ index .Labels "lectum.audit.run" }}', network],
    { encoding: "utf8", timeout: 5000 },
  );
  if (owned.status === 0 && owned.stdout.trim() === suffix) {
    try {
      docker(["network", "rm", network]);
    } catch {
      cleanupFailed = true;
    }
  }
  rmSync(directory, { recursive: true, force: true });
  if (cleanupFailed) {
    console.error("ISOLATED_RESOURCES_CLEANUP_FAILED");
    process.exitCode = 1;
  } else {
    console.log("ISOLATED_RESOURCES_REMOVED");
  }
}
