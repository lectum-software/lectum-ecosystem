// Manual: node backend/scripts/community-concurrency-integration.mjs --mode=baseline|fixed|both
// Artefato exato: acrescentar --image=lectum-backend:audit-VERSAO (somente fixed/both).
// PostgreSQL real descartável, sem portas, .env, credenciais publicadas ou build compartilhado.
// Baseline sempre usa 0.1.324. Com --image, fixed não monta nem transpila código local.
// Sem --image, fixed mantém o modo focal anterior: JS temporário sobre a imagem 0.1.324.
// O probe entra por stdin; o ID imutável e a versão interna da imagem são conferidos.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";
import { setTimeout } from "node:timers/promises";
import { fileURLToPath } from "node:url";

const args = process.argv.slice(2);
const modeArgs = args.filter((arg) => arg.startsWith("--mode="));
const imageArgs = args.filter((arg) => arg.startsWith("--image="));
assert.ok(
  args.length === modeArgs.length + imageArgs.length &&
    modeArgs.length <= 1 &&
    imageArgs.length <= 1 &&
    (!modeArgs[0] || /^--mode=(baseline|fixed|both)$/.test(modeArgs[0])) &&
    (!imageArgs[0] || /^--image=lectum-backend:audit-\d+\.\d+\.\d+$/.test(imageArgs[0])),
  "Use --mode=baseline|fixed|both e opcionalmente --image=lectum-backend:audit-VERSAO.",
);
const mode = modeArgs[0]?.slice("--mode=".length) || "both";
const fixedImage = imageArgs[0]?.slice("--image=".length);
assert.ok(mode !== "baseline" || !fixedImage, "--image aplica-se somente a fixed/both.");
const baselineImage = "lectum-backend:audit-0.1.324";
const phases = mode === "both" ? ["baseline", "fixed"] : [mode];
const suffix = randomBytes(10).toString("hex");
const network = `lectum-community178-net-${suffix}`;
const database = `lectum-community178-db-${suffix}`;
const migrate = `lectum-community178-migrate-${suffix}`;
const probe = `lectum-community178-probe-${suffix}`;
const label = `lectum.community.audit.run=${suffix}`;
const directory = mkdtempSync(path.join(tmpdir(), "lectum-community-concurrency-"));
const backend = fileURLToPath(new URL("../", import.meta.url));
const files = [
  "modules/api/private/posts/repositories/queries/PostReplyRepository.ts",
  "modules/api/private/posts/repositories/queries/PostReplyStateRepository.ts",
  "modules/api/private/posts/repositories/queries/PostStateRepository.ts",
  "modules/api/private/posts/repositories/support/reply-tree.ts",
  "modules/api/private/posts/repositories/support/post-media-url.ts",
  "modules/api/private/posts/use-cases/services/update.ts",
];
const docker = (parameters, timeout = 120_000) => {
  const result = spawnSync("docker", parameters, { encoding: "utf8", timeout });
  if (result.status !== 0) throw new Error("Etapa Docker falhou; saída privada omitida.");
  return result.stdout.trim();
};

try {
  const artifacts = new Map();
  for (const phase of phases) {
    const image = phase === "fixed" && fixedImage ? fixedImage : baselineImage;
    const id = docker(["image", "inspect", "--format", "{{.Id}}", image]);
    assert.match(id, /^sha256:[a-f0-9]{64}$/);
    const version = image.slice("lectum-backend:audit-".length);
    artifacts.set(phase, { id, version });
    console.log(
      "ARTIFACT_SELECTED",
      phase,
      version,
      id,
      phase === "fixed" && !fixedImage ? "source_overlay" : "no_mounts",
    );
  }
  docker(["image", "inspect", "postgres:17-alpine"]);
  const mounts = [];
  if (mode !== "baseline" && !fixedImage) {
    const ts = createRequire(import.meta.url)("typescript");
    for (const file of files) {
      const output = ts.transpileModule(readFileSync(path.join(backend, "src", file), "utf8"), {
        fileName: file,
        reportDiagnostics: true,
        compilerOptions: {
          target: ts.ScriptTarget.ES2023,
          module: ts.ModuleKind.CommonJS,
          esModuleInterop: true,
        },
      });
      assert.equal(output.diagnostics.length, 0, "Transpilação focal falhou.");
      const relative = file.replace(/\.ts$/, ".js");
      const target = path.join(directory, relative);
      mkdirSync(path.dirname(target), { recursive: true, mode: 0o755 });
      writeFileSync(
        target,
        output.outputText.replace(/require\("@\/([^"\n]+)"\)/g, 'require("/app/dist/$1")'),
        { mode: 0o644 },
      );
      mounts.push("-v", `${target}:/app/dist/${relative}:ro`);
    }
  }
  docker(["network", "create", "--internal", "--label", label, network]);
  docker([
    "run",
    "--rm",
    "--pull=never",
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
    // Trust existe somente nesta rede interna aleatória sem portas; não há senha reutilizada.
    "-e",
    "POSTGRES_HOST_AUTH_METHOD=trust",
    "-e",
    "POSTGRES_USER=lectum_audit",
    "-e",
    "POSTGRES_DB=lectum_audit",
    "--tmpfs",
    "/var/lib/postgresql/data:rw,size=512m",
    "postgres:17-alpine",
  ]);
  let ready = false;
  for (let attempt = 0; attempt < 30; attempt += 1) {
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
  assert.ok(ready, "Banco descartável não iniciou.");
  console.log("ISOLATED_POSTGRES_READY");
  const base = [
    "run",
    "--rm",
    "--pull=never",
    "--platform",
    "linux/amd64",
    "--network",
    network,
    "--label",
    label,
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
    "-e",
    "NODE_ENV=test",
    "-e",
    `DATABASE_URL=postgresql://lectum_audit@${database}:5432/lectum_audit`,
    "-e",
    "JWT_SECRET_KEY=isolated-community-probe-not-a-published-key",
  ];
  const probeSource = readFileSync(
    path.join(backend, "scripts/community-concurrency-probe.cjs"),
    "utf8",
  );
  for (const phase of phases) {
    const artifact = artifacts.get(phase);
    // Somente migrations JÁ embarcadas no artefato, aplicadas neste tmpfs.
    // Em both, baseline roda antes de aplicar possíveis expansões da imagem final.
    docker([
      ...base,
      "--name",
      migrate,
      "--entrypoint",
      "node",
      artifact.id,
      "node_modules/prisma/build/index.js",
      "migrate",
      "deploy",
    ]);
    console.log("ISOLATED_MIGRATIONS_APPLIED", phase, artifact.version);
    const result = spawnSync(
      "docker",
      [
        ...base,
        "--name",
        probe,
        "--read-only",
        "-i",
        ...(phase === "fixed" ? mounts : []),
        "--entrypoint",
        "node",
        artifact.id,
        "-",
        phase,
        artifact.version,
      ],
      { encoding: "utf8", input: probeSource, timeout: 120_000 },
    );
    for (const line of `${result.stdout || ""}\n${result.stderr || ""}`.split("\n")) {
      if (
        /^(CHECK_OK|INVARIANT_FAILED|COMMUNITY_PROBE_FAILED|VULNERABLE_REPRODUCED|COMMUNITY_POSTGRES_OK)( |$)/.test(
          line,
        )
      )
        console.log(phase, line);
    }
    assert.equal(result.status, 0, `Probe ${phase} falhou.`);
  }
} catch {
  console.error("COMMUNITY_INTEGRATION_FAILED");
  process.exitCode = 1;
} finally {
  let cleanupFailed = false;
  for (const name of [probe, migrate, database]) {
    const owned = spawnSync(
      "docker",
      ["inspect", "--format", '{{ index .Config.Labels "lectum.community.audit.run" }}', name],
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
    ["network", "inspect", "--format", '{{ index .Labels "lectum.community.audit.run" }}', network],
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
  } else console.log("ISOLATED_RESOURCES_REMOVED");
}
