// Shared manual harness: real immutable image + disposable PostgreSQL; no source overlays.
// Importing this module does not run Docker or read the host application configuration.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { chmodSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { setTimeout } from "node:timers/promises";
import { fileURLToPath } from "node:url";

export const parseAuditImageArgument = (args) => {
  if (
    args.length !== 1 ||
    !/^--image=lectum-backend:audit-\d+\.\d+\.\d+$/.test(args[0]) ||
    /\s/.test(args[0])
  ) {
    throw new Error("Informe --image=lectum-backend:audit-VERSAO (imagem local já construída).");
  }
  return args[0].slice("--image=".length);
};

export async function runIsolatedPostgresProbe({
  args = process.argv.slice(2),
  name,
  probeUrl,
  expectedChecks,
  successMarker,
}) {
  const image = parseAuditImageArgument(args);
  assert.match(name, /^[a-z][a-z0-9-]{0,24}$/);
  assert.ok(Number.isSafeInteger(expectedChecks) && expectedChecks > 0);
  assert.match(successMarker, /^[A-Z_]+$/);
  assert.equal(new URL(probeUrl).protocol, "file:");
  const expectedVersion = image.slice("lectum-backend:audit-".length);
  const suffix = randomBytes(10).toString("hex");
  const network = `lectum-${name}178-net-${suffix}`;
  const database = `lectum-${name}178-db-${suffix}`;
  const migrate = `lectum-${name}178-migrate-${suffix}`;
  const probe = `lectum-${name}178-probe-${suffix}`;
  const directory = mkdtempSync(path.join(tmpdir(), `lectum-${name}-audit-`));
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
    const imageId = docker(["image", "inspect", "--format", "{{.Id}}", image]);
    const postgresId = docker(["image", "inspect", "--format", "{{.Id}}", "postgres:17-alpine"]);
    assert.match(imageId, /^sha256:[a-f0-9]{64}$/u);
    assert.match(postgresId, /^sha256:[a-f0-9]{64}$/u);
    const actualVersion = docker([
      "run",
      "--rm",
      "--pull=never",
      "--platform",
      "linux/amd64",
      "--network",
      "none",
      "--read-only",
      "--entrypoint",
      "/usr/bin/env",
      imageId,
      "-i",
      "PATH=/usr/local/bin:/usr/bin:/bin",
      "node",
      "-e",
      'process.stdout.write(require("/app/package.json").version)',
    ]);
    assert.equal(actualVersion, expectedVersion, "A versão da imagem difere da tag solicitada.");
    console.log("ISOLATED_IMAGE", image, imageId, "version", actualVersion);
    const password = randomBytes(24).toString("hex");
    const dbEnv = envFile(
      "database.config",
      `POSTGRES_USER=lectum_audit\nPOSTGRES_DB=lectum_audit\nPOSTGRES_PASSWORD=${password}\n`,
    );
    const appConfig = envFile(
      "application.json",
      JSON.stringify({
        NODE_ENV: "test",
        PATH: "/usr/local/bin:/usr/bin:/bin",
        DATABASE_URL: `postgresql://lectum_audit:${password}@${database}:5432/lectum_audit`,
        JWT_SECRET_KEY: randomBytes(32).toString("hex"),
        ADMIN_JWT_SECRET: randomBytes(32).toString("hex"),
        CRYPTO_ALGORITHM: "bcrypt",
      }),
    );
    const bootstrap = envFile(
      "bootstrap.cjs",
      `
      const fs = require("node:fs");
      if (fs.existsSync("/app/.env")) process.exit(2);
      process.env = JSON.parse(fs.readFileSync("/tmp/application.json", "utf8"));
      if (process.argv[2] === "migrate") {
        process.argv = [process.argv[0], "/app/node_modules/prisma/build/index.js", "migrate", "deploy"];
        require("/app/node_modules/prisma/build/index.js");
      } else { require("/tmp/probe.cjs"); }
    `,
    );
    docker(["network", "create", "--internal", "--label", label, network]);
    docker([
      "run",
      "--pull",
      "never",
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
      postgresId,
      "postgres",
      "-c",
      "shared_preload_libraries=pg_stat_statements",
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
      "--pull",
      "never",
      "--rm",
      "--platform",
      "linux/amd64",
      "--network",
      network,
      "--label",
      label,
      "-v",
      `${appConfig}:/tmp/application.json:ro`,
      "-v",
      `${bootstrap}:/tmp/bootstrap.cjs:ro`,
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
      "/usr/bin/env",
      imageId,
      "-i",
      "PATH=/usr/local/bin:/usr/bin:/bin",
      "node",
      "/tmp/bootstrap.cjs",
      "migrate",
    ]);
    console.log("ISOLATED_MIGRATIONS_APPLIED");
    const probePath = fileURLToPath(probeUrl);
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
        "/usr/bin/env",
        imageId,
        "-i",
        "PATH=/usr/local/bin:/usr/bin:/bin",
        "node",
        "/tmp/bootstrap.cjs",
        "probe",
      ],
      { encoding: "utf8", timeout: 120_000 },
    );
    for (const line of `${result.stdout || ""}\n${result.stderr || ""}`.split("\n")) {
      if (
        line === successMarker ||
        /^(CHECK_OK|CHECK_FAIL|PROBE_SUMMARY|INTEGRATION_FAILED)( |$)/.test(line)
      )
        console.log(line);
    }
    assert.equal(result.status, 0, "A integração PostgreSQL não passou.");
    const lines = (result.stdout || "").split("\n");
    const summaries = lines.filter((line) => line.startsWith("PROBE_SUMMARY "));
    assert.equal(summaries.length, 1, "Probe terminou sem resumo único.");
    assert.deepEqual(JSON.parse(summaries[0].slice("PROBE_SUMMARY ".length)), {
      passed: expectedChecks,
      failed: 0,
      total: expectedChecks,
    });
    assert.ok(lines.includes(successMarker), "Probe terminou sem marcador de sucesso.");
  } catch {
    console.error("ISOLATED_POSTGRES_INTEGRATION_FAILED");
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
}
