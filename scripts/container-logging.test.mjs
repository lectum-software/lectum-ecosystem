import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const policy = JSON.parse(readFileSync(resolve(root, "backend/docker-log-driver.json"), "utf8"));
const compose = readFileSync(resolve(root, "video/docker-compose.yml"), "utf8");
const options = { "max-size": "20m", "max-file": "5", compress: "true" };
const integration = process.env.LECTUM_DOCKER_LOG_TESTS === "true";

describe("prepared per-container Docker logging policy", () => {
  it("uses the Docker Swarm LogDriver contract without extra settings", () => {
    assert.deepEqual(policy, { Name: "json-file", Options: options });
    assert.ok(Object.values(policy.Options).every((value) => typeof value === "string"));
  });

  it("prepares the same explicit policy for every video service", () => {
    const anchor = compose.match(/^x-container-logging: &container-logging\n([\s\S]*?)\n\S/m)?.[1];
    assert.ok(anchor, "one explicit logging anchor is required");
    assert.match(anchor, /^ {2}driver: json-file$/m);
    for (const [key, value] of Object.entries(options)) {
      assert.ok(anchor.includes(`    ${key}: "${value}"`));
    }
    assert.equal((compose.match(/^ {4}logging: \*container-logging$/gm) ?? []).length, 3);
    for (const name of ["redis", "api", "worker"]) {
      const service = compose.match(
        new RegExp(`^  ${name}:\\n([\\s\\S]*?)(?=^  \\w+:|^\\S|(?![\\s\\S]))`, "m"),
      )?.[1];
      assert.ok(service?.includes("    logging: *container-logging"), `${name} requires logging`);
    }
  });

  it("does not introduce a daemon-wide default, a drop mode or secret log enrichment", () => {
    assert.deepEqual(Object.keys(policy.Options).sort(), ["compress", "max-file", "max-size"]);
    assert.doesNotMatch(compose, /^\s+(?:env-regex|labels-regex|mode|max-buffer-size):/m);
    assert.doesNotMatch(compose, /daemon\.json|docker\.sock/);
  });

  it("does not contact Docker without the explicit local runtime probe flag", () => {
    for (const args of [[], ["--unknown"]]) {
      const result = spawnSync(
        process.execPath,
        [resolve(root, "scripts/container-log-rotation.local.mjs"), ...args],
        {
          env: { PATH: "" },
          encoding: "utf8",
          timeout: 5_000,
        },
      );
      assert.equal(result.status, args.length ? 1 : 0);
      assert.match(result.stdout, /Local OrbStack only/);
      assert.equal(result.stderr, "");
    }
  });
});

describe("real Docker Compose rendering (explicit local opt-in)", { skip: !integration }, () => {
  it("renders all services with the policy and preserves volumes, commands and isolation", () => {
    // Parsing only: no daemon call, service creation, credentials or remote env.
    const env = {
      PATH: process.env.PATH,
      HOME: process.env.HOME,
      REDIS_URL: "redis://127.0.0.1:6379",
      REDIS_PASSWORD: "local-config-render-only",
      VIDEO_SERVICE_API_KEY: "local-config-render-only",
      VIDEO_STORAGE_ROOT: "/var/lib/lectum-video",
    };
    const result = spawnSync(
      "docker",
      [
        "compose",
        "--env-file",
        "/dev/null",
        "--project-name",
        "lectum-log-policy-qa",
        "-f",
        "video/docker-compose.yml",
        "config",
        "--format",
        "json",
      ],
      { cwd: root, env, encoding: "utf8", timeout: 30_000, maxBuffer: 1_000_000 },
    );
    assert.equal(result.status, 0, "Docker Compose must render the real configuration");
    const config = JSON.parse(result.stdout);
    assert.deepEqual(Object.keys(config.services).sort(), ["api", "redis", "worker"]);
    for (const service of Object.values(config.services)) {
      assert.deepEqual(service.logging, { driver: "json-file", options });
    }
    assert.deepEqual(Object.keys(config.volumes).sort(), ["video-redis", "video-storage"]);
    assert.equal(config.networks["video-private"].internal, true);
    assert.equal(config.services.api.read_only, true);
    assert.equal(config.services.worker.read_only, true);
    assert.deepEqual(config.services.api.command, ["node", "--enable-source-maps", "dist/api.js"]);
    assert.deepEqual(config.services.worker.command, [
      "node",
      "--enable-source-maps",
      "dist/worker.js",
    ]);
    assert.equal(config.services.api.volumes[0].source, "video-storage");
    assert.equal(config.services.worker.volumes[0].source, "video-storage");
    assert.equal(config.services.redis.volumes[0].source, "video-redis");
  });
});
