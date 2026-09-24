import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, it } from "node:test";
import { promisify } from "node:util";
import { VIDEO_SERVICE_VERSION } from "./config/version.js";

const readProjectFile = (path: string) => readFile(join(process.cwd(), path), "utf8");

const readComposeServiceBlock = (compose: string, service: string) => {
  const marker = `  ${service}:\n`;
  const start = compose.indexOf(marker);
  assert.notEqual(start, -1, `servico ${service} ausente no docker-compose`);

  const rest = compose.slice(start + marker.length);
  const end = /\n(?: {2}[a-z0-9_-]+:|volumes:|networks:)\r?\n/u.exec(rest)?.index ?? rest.length;
  return rest.slice(0, end);
};

const readComposeListValues = (block: string, key: string) => {
  const marker = `    ${key}:\n`;
  const start = block.indexOf(marker);
  assert.notEqual(start, -1, `secao ${key} ausente no servico`);

  const rest = block.slice(start + marker.length);
  const end = /\n {4}[a-zA-Z_][a-zA-Z0-9_-]*:/u.exec(rest)?.index ?? rest.length;
  return Array.from(rest.slice(0, end).matchAll(/^\s*-\s+([a-z][a-z0-9_-]*)\s*$/gmu)).map(
    (match) => match[1],
  );
};

describe("Video service default runtime", () => {
  it("registra a versao do artefato no log JSON de inicializacao da API", async () => {
    const source = await readProjectFile("src/api.ts");
    assert.match(source, /import \{ VIDEO_SERVICE_VERSION \} from "\.\/config\/version\.js"/u);
    assert.match(
      source,
      /logInfo\("video_api_started",\s*\{\s*operation: "listen",\s*status: "ready",\s*version: VIDEO_SERVICE_VERSION,/u,
    );
    const { stdout, stderr } = await promisify(execFile)(process.execPath, [
      "--import",
      "tsx",
      "--input-type=module",
      "-e",
      'import { logInfo } from "./src/http/logging.ts"; import { VIDEO_SERVICE_VERSION } from "./src/config/version.ts"; logInfo("video_api_started", { operation: "listen", status: "ready", version: VIDEO_SERVICE_VERSION });',
    ]);
    assert.equal(stderr, "");
    assert.deepEqual(JSON.parse(stdout), {
      event: "video_api_started",
      operation: "listen",
      status: "ready",
      version: VIDEO_SERVICE_VERSION,
    });
  });
  it("sobe API e worker no comando padrao para evitar job social sem consumidor", async () => {
    const [dockerfile, packageJsonContent, runtimeSource] = await Promise.all([
      readProjectFile("Dockerfile"),
      readProjectFile("package.json"),
      readProjectFile("src/all.ts"),
    ]);
    const packageJson = JSON.parse(packageJsonContent) as {
      scripts?: Record<string, string | undefined>;
    };

    assert.equal(packageJson.scripts?.start, "pnpm start:all");
    assert.equal(packageJson.scripts?.["start:all"], "node --enable-source-maps dist/all.js");
    assert.match(dockerfile, /CMD \["node", "--enable-source-maps", "dist\/all\.js"\]/);
    assert.match(runtimeSource, /startVideoApiRuntime/);
    assert.match(runtimeSource, /startVideoWorkerRuntime/);
    assert.doesNotMatch(runtimeSource, /\bspawn\(/);
  });

  it("mantem o worker em rede com egresso sem expor Redis ou portas publicas", async () => {
    const compose = await readProjectFile("docker-compose.yml");
    const redisBlock = readComposeServiceBlock(compose, "redis");
    const workerBlock = readComposeServiceBlock(compose, "worker");
    const redisNetworks = readComposeListValues(redisBlock, "networks");
    const workerNetworks = readComposeListValues(workerBlock, "networks");

    assert.deepEqual(redisNetworks, ["video-private"]);
    assert(workerNetworks.includes("video-edge"));
    assert(workerNetworks.includes("video-private"));
    assert.doesNotMatch(workerBlock, /\n {4}ports:/u);
    assert.match(workerBlock, /\n {6}timeout: 20s/u);
    assert.match(compose, /\n {2}video-private:\r?\n {4}internal: true/u);
  });

  it("mantem readiness com margem para validacao fria de FFmpeg", async () => {
    const readinessSource = await readProjectFile("src/http/readiness.ts");

    assert.match(readinessSource, /const READINESS_TIMEOUT_MS = 15_000/);
  });
});
