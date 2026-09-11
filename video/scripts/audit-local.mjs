// Explicitly disposable integration checks. Requires existing local Docker/Redis
// and FFmpeg; never reads .env, contacts providers or accepts a remote Redis URL.
import assert from "node:assert/strict";
import { execFile as execFileCallback } from "node:child_process";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import { access, copyFile, mkdtemp, rm, utimes } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { promisify } from "node:util";
import { Worker } from "bullmq";
import { createVideoApi } from "../dist/app.js";
import { parseVideoServiceConfig } from "../dist/config/env.js";
import { VIDEO_QUEUE_NAME } from "../dist/domain/jobs/contracts.js";
import { requestVideoJobCancellation } from "../dist/infra/queue/cancellation.js";
import { createRedisConnection, createVideoQueue } from "../dist/infra/queue/client.js";
import {
  activeVideoJobIds,
  createVideoJobId,
  enqueueCompressionJob,
} from "../dist/infra/queue/jobs.js";
import { createVideoProgressWriter } from "../dist/infra/queue/progress.js";
import { videoStoragePaths } from "../dist/infra/storage/paths.js";
import {
  acquireVideoStorageReservation,
  releaseVideoStorageReservation,
  reservedVideoJobIds,
} from "../dist/infra/storage/reservations.js";
import {
  cleanupExpiredVideoStorage,
  ensureVideoStorage,
  prepareVideoInput,
  prepareVideoOutput,
} from "../dist/infra/storage/storage.js";
import { createVideoJobProcessor } from "../dist/worker-processor.js";

const execFile = promisify(execFileCallback);
const directory = await mkdtemp(path.join(tmpdir(), "lectum-video-audit-"));
const container = `lectum-video-audit-${randomUUID()}`;
let containerStarted = false;
let connection;
let workerConnection;
let queue;
let worker;
let server;
let checks = 0;

const verify = (label) => {
  checks += 1;
  console.info(`[video-audit] OK ${label}`);
};

try {
  await execFile("docker", [
    "run",
    "--pull=never",
    "--rm",
    "-d",
    "--name",
    container,
    "--label",
    "lectum.audit=disposable-task178",
    "-p",
    "127.0.0.1::6379",
    "redis:8.2-alpine",
    "redis-server",
    "--save",
    "",
    "--appendonly",
    "no",
  ]);
  containerStarted = true;
  let redisReady = false;
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const result = await execFile("docker", ["exec", container, "redis-cli", "ping"]).catch(
      () => null,
    );
    if (result?.stdout.trim() === "PONG") {
      redisReady = true;
      break;
    }
    await sleep(100);
  }
  assert.ok(redisReady, "isolated_redis_not_ready");
  const { stdout } = await execFile("docker", ["port", container, "6379/tcp"]);
  const endpoint = stdout.trim();
  assert.match(endpoint, /^127\.0\.0\.1:\d+$/u);
  const config = parseVideoServiceConfig({
    NODE_ENV: "test",
    REDIS_URL: `redis://${endpoint}/0`,
    VIDEO_SERVICE_API_KEY: randomUUID(),
    VIDEO_STORAGE_ROOT: path.join(directory, "storage"),
    VIDEO_MAX_INPUT_MB: "1",
    VIDEO_MAX_OUTPUT_MB: "8",
    VIDEO_MIN_FREE_SPACE_MB: "128",
    VIDEO_MAX_QUEUED_JOBS: "2",
    VIDEO_STALE_INPUT_TTL_SECONDS: "300",
    VIDEO_CANCELLATION_POLL_MS: "250",
  });
  connection = createRedisConnection(config, "api");
  await connection.connect();
  queue = createVideoQueue(config, connection);
  await queue.waitUntilReady();
  await ensureVideoStorage(config);

  const reservedId = createVideoJobId();
  await acquireVideoStorageReservation({
    config,
    connection,
    expectedInputBytes: 1,
    jobId: reservedId,
  });
  const incoming = await prepareVideoInput(config, reservedId);
  const past = new Date(Date.now() - 600_000);
  await utimes(incoming.incomingDirectory, past, past);
  await cleanupExpiredVideoStorage({ activeJobIds: await reservedVideoJobIds(connection), config });
  await access(incoming.incomingDirectory);
  await releaseVideoStorageReservation(connection, reservedId);
  await cleanupExpiredVideoStorage({ activeJobIds: new Set(), config });
  await assert.rejects(access(incoming.incomingDirectory));
  verify("reserva protege upload antigo ainda não enfileirado; liberação permite cleanup");

  const contenders = Array.from({ length: 4 }, () => createVideoJobId());
  const reservations = await Promise.allSettled(
    contenders.map((jobId) =>
      acquireVideoStorageReservation({ config, connection, expectedInputBytes: 1, jobId }),
    ),
  );
  assert.equal(reservations.filter(({ status }) => status === "fulfilled").length, 2);
  await Promise.all(contenders.map((jobId) => releaseVideoStorageReservation(connection, jobId)));
  verify("limite atômico de reservas sob concorrência Redis real");

  await queue.pause();
  const pausedId = createVideoJobId();
  await enqueueCompressionJob(queue, pausedId);
  assert.ok((await activeVideoJobIds(queue)).has(pausedId));
  await (await queue.getJob(pausedId)).remove();
  await queue.resume();
  verify("fila pausada preserva IDs usados pelo cleanup");

  const disconnected = createRedisConnection(config, "api");
  await disconnected.connect();
  const disconnectedQueue = createVideoQueue(config, disconnected);
  const progressJob = await enqueueCompressionJob(disconnectedQueue, createVideoJobId());
  disconnected.disconnect();
  try {
    const progress = createVideoProgressWriter(progressJob);
    progress.write(10);
    await sleep(30);
    await assert.rejects(
      progress.flush(),
      (error) => error.code === "processing_failed" && error.retryable,
    );
    await (await queue.getJob(progressJob.id)).remove();
  } finally {
    await disconnectedQueue.close();
  }
  verify("queda real da conexão de progresso não vira rejection sem tratamento");

  workerConnection = createRedisConnection(config, "worker");
  await workerConnection.connect();
  worker = new Worker(
    VIDEO_QUEUE_NAME,
    createVideoJobProcessor({ config, controlConnection: connection }),
    {
      connection: workerConnection,
      concurrency: 1,
    },
  );
  worker.on("error", () => {});
  await worker.waitUntilReady();
  server = createServer(createVideoApi({ config, connection, queue }));
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const base = `http://127.0.0.1:${server.address().port}`;
  const headers = { Authorization: `Bearer ${config.apiKey}` };
  const waitJob = async (id) => {
    const deadline = Date.now() + 60_000;
    while (Date.now() < deadline) {
      const job = await queue.getJob(id);
      const state = await job.getState();
      if (state === "completed" || state === "failed") return job;
      await sleep(50);
    }
    throw new Error("isolated_job_timeout");
  };

  assert.equal((await fetch(`${base}/api/private/jobs/unknown`)).status, 401);
  const health = await fetch(`${base}/health`);
  assert.equal(health.status, 200);
  const version = await fetch(`${base}/version`);
  assert.equal(version.status, 200);
  assert.match(version.headers.get("cache-control"), /no-store/u);
  assert.match(version.headers.get("x-robots-tag"), /noindex/u);
  verify("HTTP real: autenticação, health e versão sem cache/indexação");

  const upload = async (bytes) => {
    const body = new FormData();
    body.append("video", new Blob([bytes], { type: "video/mp4" }), "../../outside.mp4");
    return fetch(`${base}/api/private/jobs/compress`, { method: "POST", headers, body });
  };
  assert.equal((await upload(Buffer.from("invalid-video"))).status, 422);
  assert.equal((await upload(Buffer.alloc(config.maxInputBytes + 1))).status, 413);
  assert.equal((await reservedVideoJobIds(connection)).size, 0);
  verify("multipart real: assinatura inválida, primeiro byte excedente e liberação de reservas");

  const source = path.join(directory, "source.mp4");
  await execFile("ffmpeg", [
    "-v",
    "error",
    "-f",
    "lavfi",
    "-i",
    "testsrc2=s=320x240:r=24:d=1",
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    source,
  ]);
  const { readFile } = await import("node:fs/promises");
  const created = await upload(await readFile(source));
  assert.equal(created.status, 202);
  const id = (await created.json()).data.job_id;
  const completed = await waitJob(id);
  assert.equal(await completed.getState(), "completed");
  const outputResponse = await fetch(`${base}/api/private/jobs/${id}/output`, {
    headers: { ...headers, Range: "bytes=0-127" },
  });
  assert.equal(outputResponse.status, 206);
  assert.equal((await outputResponse.arrayBuffer()).byteLength, 128);
  assert.equal(
    (
      await fetch(`${base}/api/private/jobs/${id}/output`, {
        headers: { ...headers, Range: "bytes=0-1,3-4" },
      })
    ).status,
    416,
  );
  verify("HTTP → BullMQ → FFprobe/FFmpeg reais → publicação atômica e Range");

  const recoveryId = createVideoJobId();
  const recoveredPaths = await prepareVideoOutput(config, recoveryId);
  await copyFile(videoStoragePaths(config.storageRoot, id).outputPath, recoveredPaths.outputPath);
  await enqueueCompressionJob(queue, recoveryId);
  assert.equal(await (await waitJob(recoveryId)).getState(), "completed");
  verify("recuperação real reutiliza saída válida publicada sem input");

  await queue.pause();
  const failingConnection = createRedisConnection(config, "api");
  await failingConnection.connect();
  const failingQueue = createVideoQueue(config, failingConnection);
  const retainedId = createVideoJobId();
  const retainedInput = await prepareVideoInput(config, retainedId);
  const retainedOutput = await prepareVideoOutput(config, retainedId);
  await copyFile(source, retainedInput.inputPath);
  await copyFile(videoStoragePaths(config.storageRoot, id).outputPath, retainedOutput.outputPath);
  const retainedJob = await enqueueCompressionJob(failingQueue, retainedId);
  failingConnection.disconnect();
  try {
    await assert.rejects(
      createVideoJobProcessor({ config, controlConnection: connection })(retainedJob),
      (error) => error.message === "processing_failed",
    );
    await access(retainedInput.inputPath);
    await access(retainedOutput.outputPath);
  } finally {
    await failingQueue.close();
    await queue.resume();
  }
  assert.equal(await (await waitJob(retainedId)).getState(), "completed");
  verify("falha Redis na conclusão preserva input/output válidos para recuperação");

  const canceledId = createVideoJobId();
  const canceledPaths = await prepareVideoInput(config, canceledId);
  await copyFile(source, canceledPaths.inputPath);
  await requestVideoJobCancellation(connection, canceledId, 300);
  await enqueueCompressionJob(queue, canceledId);
  const canceled = await waitJob(canceledId);
  assert.equal(canceled.failedReason, "canceled");
  assert.equal(canceled.attemptsMade, 1);
  await assert.rejects(access(canceledPaths.inputPath));
  verify("cancelamento antes do processamento falha sem retry e limpa input");

  const longSource = path.join(directory, "long-source.mp4");
  await execFile("ffmpeg", [
    "-v",
    "error",
    "-f",
    "lavfi",
    "-i",
    "color=s=1280x720:r=30:d=60",
    "-c:v",
    "libx264",
    "-preset",
    "ultrafast",
    "-pix_fmt",
    "yuv420p",
    longSource,
  ]);
  const longUpload = await upload(await readFile(longSource));
  assert.equal(longUpload.status, 202);
  const activeId = (await longUpload.json()).data.job_id;
  let processing = false;
  for (let attempt = 0; attempt < 200; attempt += 1) {
    const current = await queue.getJob(activeId);
    if ((await current.getState()) === "active" && current.progress >= 3) {
      processing = true;
      break;
    }
    await sleep(10);
  }
  assert.ok(processing, "isolated_job_not_processing");
  const cancelResponse = await fetch(`${base}/api/private/jobs/${activeId}`, {
    headers,
    method: "DELETE",
  });
  assert.equal(cancelResponse.status, 202);
  const activeCanceled = await waitJob(activeId);
  assert.equal(activeCanceled.failedReason, "canceled");
  assert.equal(activeCanceled.attemptsMade, 1);
  verify("DELETE HTTP interrompe FFmpeg ativo sem retry");

  await worker.close();
  worker = new Worker(
    VIDEO_QUEUE_NAME,
    createVideoJobProcessor({
      config: { ...config, jobTimeoutMs: 1 },
      controlConnection: connection,
    }),
    { connection: workerConnection, concurrency: 1 },
  );
  worker.on("error", () => {});
  await worker.waitUntilReady();
  const timeoutId = createVideoJobId();
  const timeoutPaths = await prepareVideoInput(config, timeoutId);
  await copyFile(source, timeoutPaths.inputPath);
  await queue.add(
    "compress",
    { operation: "compress", cancelRequested: false, createdAt: new Date().toISOString() },
    {
      jobId: timeoutId,
      attempts: 2,
      backoff: { type: "fixed", delay: 10 },
    },
  );
  const timedOut = await waitJob(timeoutId);
  assert.equal(timedOut.failedReason, "processing_failed");
  assert.equal(timedOut.attemptsMade, 2);
  await assert.rejects(access(timeoutPaths.inputPath));
  verify("prazo global da tentativa limita probe/processamento e mantém retry finito");

  assert.equal(
    (await fetch(`${base}/api/private/jobs/${id}`, { headers, method: "DELETE" })).status,
    200,
  );
  assert.equal((await fetch(`${base}/api/private/jobs/${id}`, { headers })).status, 404);
  verify("exclusão autenticada remove somente job e artefato isolados");
  console.info(`[video-audit] ${checks} verificações passaram; nenhum fluxo externo validado.`);
} finally {
  if (server) {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
  await worker?.close();
  await queue?.close();
  await Promise.allSettled([connection?.quit(), workerConnection?.quit()]);
  if (containerStarted) await execFile("docker", ["rm", "-f", container]);
  await rm(directory, { force: true, recursive: true });
}
