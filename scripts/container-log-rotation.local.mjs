import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import http from "node:http";
import { homedir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Explicit local-only driver test. No provider, application bootstrap or database.
// Created containers have no volumes/mounts/network and finish on their own.
// Retain the stopped test containers; this tool never deletes Docker resources.
if (process.argv.length !== 3 || process.argv[2] !== "--execute") {
  console.log("Local OrbStack only: node scripts/container-log-rotation.local.mjs --execute");
  process.exitCode = process.argv.length === 2 ? 0 : 1;
} else {
  await main().catch(() => {
    console.error(
      "Local log-rotation validation failed. No existing resource was changed or deleted.",
    );
    process.exitCode = 1;
  });
}

function dockerRead(args) {
  const result = spawnSync("docker", args, {
    encoding: "utf8",
    timeout: 20_000,
    maxBuffer: 1_000_000,
    env: { PATH: process.env.PATH, HOME: homedir() },
  });
  assert.equal(result.status, 0, "local Docker metadata must be available");
  return result.stdout.trim();
}

function dockerApi(socketPath, method, path, body) {
  return new Promise((resolveResponse, reject) => {
    const encoded = body === undefined ? undefined : JSON.stringify(body);
    const request = http.request(
      {
        socketPath,
        method,
        path,
        headers: encoded
          ? { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(encoded) }
          : {},
      },
      (response) => {
        const chunks = [];
        let bytes = 0;
        response.on("data", (chunk) => {
          bytes += chunk.length;
          if (bytes > 1_000_000) return request.destroy(new Error("response limit"));
          chunks.push(chunk);
        });
        response.on("error", reject);
        response.on("end", () => {
          if (response.statusCode < 200 || response.statusCode >= 300) {
            reject(new Error("local Docker request rejected"));
          } else {
            resolveResponse(Buffer.concat(chunks));
          }
        });
      },
    );
    request.setTimeout(30_000, () => request.destroy(new Error("local Docker timeout")));
    request.on("error", reject);
    request.end(encoded);
  });
}

function stdoutFrames(buffer) {
  let offset = 0;
  const chunks = [];
  while (offset < buffer.length) {
    assert.ok(offset + 8 <= buffer.length, "Docker log frame must be complete");
    const stream = buffer[offset];
    const size = buffer.readUInt32BE(offset + 4);
    assert.ok(offset + 8 + size <= buffer.length, "Docker log payload must be complete");
    assert.equal(stream, 1, "the finite probe must only emit stdout");
    chunks.push(buffer.subarray(offset + 8, offset + 8 + size));
    offset += 8 + size;
  }
  return Buffer.concat(chunks).toString("utf8");
}

async function main() {
  assert.equal(process.platform, "darwin", "never run this probe on a Linux VPS");
  assert.equal(
    dockerRead(["context", "show"]),
    "orbstack",
    "only the known local context is permitted",
  );
  const endpoint = JSON.parse(
    dockerRead(["context", "inspect", "orbstack", "--format", "{{json .Endpoints.docker.Host}}"]),
  );
  const expectedSocket = resolve(homedir(), ".orbstack/run/docker.sock");
  assert.equal(endpoint, `unix://${expectedSocket}`, "no remote Docker endpoint is permitted");
  const info = JSON.parse((await dockerApi(expectedSocket, "GET", "/info")).toString());
  assert.match(info.OperatingSystem, /orbstack/i, "the daemon must identify as local OrbStack");

  const image =
    "node:24.22.1-bookworm-slim@sha256:be8204d4bd327363357f532187b752ff62759c31bedf98e9e18fc08c9cbd605c";
  // Inspect only; do not pull images or execute unrecognized software.
  dockerRead(["--host", endpoint, "image", "inspect", image, "--format", "{{.Id}}"]);
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const policy = JSON.parse(readFileSync(resolve(root, "backend/docker-log-driver.json"), "utf8"));
  assert.deepEqual(policy, {
    Name: "json-file",
    Options: { "max-size": "20m", "max-file": "5", compress: "true" },
  });
  const reports = [];
  for (const scenario of [
    { kind: "prepared_policy", driver: policy, lines: 2, size: 32 },
    {
      kind: "reduced_limit_rotation",
      driver: {
        Name: policy.Name,
        Options: { ...policy.Options, "max-size": "4k", "max-file": "3" },
      },
      lines: 240,
      size: 192,
    },
  ]) {
    const name = `lectum-task327-log-${scenario.kind.replaceAll("_", "-")}-${randomUUID().slice(0, 8)}`;
    const marker = "LECTUM_LOG_PROBE";
    const code = `for(let i=1;i<=${scenario.lines};i++)console.log('${marker} '+String(i).padStart(6,'0')+' '+'x'.repeat(${scenario.size}));console.log('${marker}_FINAL');`;
    const created = JSON.parse(
      (
        await dockerApi(expectedSocket, "POST", `/containers/create?name=${name}`, {
          Image: image,
          Entrypoint: ["node"],
          Cmd: ["-e", code],
          User: "1000:1000",
          Labels: { "com.lectum.local-qa": "task327-log-rotation" },
          Healthcheck: { Test: ["NONE"] },
          HostConfig: {
            NetworkMode: "none",
            ReadonlyRootfs: true,
            AutoRemove: false,
            CapDrop: ["ALL"],
            SecurityOpt: ["no-new-privileges:true"],
            Memory: 134_217_728,
            PidsLimit: 32,
            LogConfig: { Type: scenario.driver.Name, Config: scenario.driver.Options },
          },
        })
      ).toString(),
    );
    const id = created.Id;
    assert.match(id, /^[a-f0-9]{64}$/);
    await dockerApi(expectedSocket, "POST", `/containers/${id}/start`);
    const waited = JSON.parse(
      (
        await dockerApi(expectedSocket, "POST", `/containers/${id}/wait?condition=not-running`)
      ).toString(),
    );
    assert.equal(waited.StatusCode, 0, "the finite local process must exit successfully");
    const inspected = JSON.parse(
      (await dockerApi(expectedSocket, "GET", `/containers/${id}/json`)).toString(),
    );
    assert.equal(inspected.State.Running, false);
    assert.equal(inspected.State.ExitCode, 0);
    assert.equal(inspected.Config.User, "1000:1000");
    assert.equal(inspected.HostConfig.NetworkMode, "none");
    assert.equal(inspected.HostConfig.ReadonlyRootfs, true);
    assert.deepEqual(inspected.Mounts, []);
    assert.deepEqual(inspected.HostConfig.LogConfig, {
      Type: scenario.driver.Name,
      Config: scenario.driver.Options,
    });
    const logs = stdoutFrames(
      await dockerApi(expectedSocket, "GET", `/containers/${id}/logs?stdout=true&stderr=true`),
    );
    const sequences = [...logs.matchAll(/LECTUM_LOG_PROBE (\d{6}) /g)].map((match) =>
      Number(match[1]),
    );
    assert.ok(
      logs.includes(`${marker}_FINAL\n`),
      "the last diagnostic must remain readable through Docker API",
    );
    assert.equal(sequences.at(-1), scenario.lines);
    if (scenario.kind === "reduced_limit_rotation") {
      assert.ok(sequences[0] > 1, "the oldest probe records must have rotated out");
      assert.ok(
        Buffer.byteLength(logs) > 4096,
        "the API must read retained rotated records, not only the active 4 KiB file",
      );
      assert.ok(sequences.length < scenario.lines);
    } else {
      assert.deepEqual(sequences, [1, 2]);
    }
    reports.push({
      scenario: scenario.kind,
      container_name: name,
      container_ref: createHash("sha256").update(id).digest("hex").slice(0, 12),
      configured_options: scenario.driver.Options,
      exit_code: 0,
      stopped_and_retained: true,
      retained_records: sequences.length,
      first_sequence: sequences[0],
      last_sequence: sequences.at(-1),
      readable_log_bytes: Buffer.byteLength(logs),
      final_marker_available: true,
      mounts: 0,
      network: "none",
    });
  }
  console.log(
    JSON.stringify(
      {
        operation: "local_log_rotation_validation",
        observed_at: new Date().toISOString(),
        existing_resources_changed: false,
        resources_deleted: false,
        reports,
      },
      null,
      2,
    ),
  );
}
