import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const baseUrl = process.env.VIDEO_E2E_BASE_URL ?? "http://127.0.0.1:3003";
const apiKey = process.env.VIDEO_SERVICE_API_KEY;
const sourcePath = process.env.VIDEO_E2E_FILE;
const cancelSourcePath = process.env.VIDEO_E2E_CANCEL_FILE;
const ffprobePath = process.env.VIDEO_FFPROBE_PATH ?? "ffprobe";

if (!apiKey || apiKey.length < 32 || !sourcePath) {
  throw new Error("Defina VIDEO_SERVICE_API_KEY e VIDEO_E2E_FILE para executar o E2E.");
}

const authorization = { Authorization: `Bearer ${apiKey}` };
const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

const expectJson = async (response, expectedStatus) => {
  const body = await response.text();
  assert.equal(response.status, expectedStatus, body);
  return JSON.parse(body);
};

const upload = async (filePath, type = "video/mp4") => {
  const bytes = await readFile(filePath);
  const body = new FormData();
  body.append("video", new Blob([bytes], { type }), "source.mp4");
  const response = await fetch(`${baseUrl}/api/private/jobs/compress`, {
    body,
    headers: authorization,
    method: "POST",
  });
  const payload = await expectJson(response, 202);
  assert.match(payload.data.job_id, /^[a-z][a-z0-9]{23,31}$/);
  return payload.data;
};

const getJob = async (jobId) => {
  const response = await fetch(`${baseUrl}/api/private/jobs/${jobId}`, {
    headers: authorization,
  });
  return expectJson(response, 200);
};

const waitFor = async (jobId, accepted, timeoutMs = 120_000) => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const payload = await getJob(jobId);
    if (accepted.has(payload.data.status)) return payload.data;
    await sleep(250);
  }
  throw new Error(`O job ${jobId} não alcançou o estado esperado.`);
};

const health = await expectJson(await fetch(`${baseUrl}/health`), 200);
assert.equal(health.data.status, "healthy");
const ready = await expectJson(await fetch(`${baseUrl}/ready`), 200);
assert.equal(ready.data.status, "ready");
const version = await expectJson(await fetch(`${baseUrl}/version`), 200);
assert.match(version.data.version, /^\d+\.\d+\.\d+$/);

const unauthorized = await fetch(`${baseUrl}/api/private/jobs/a12345678901234567890123`);
assert.equal(unauthorized.status, 401);

const invalidBody = new FormData();
invalidBody.append("video", new Blob(["not-a-video"], { type: "video/mp4" }), "invalid.mp4");
const invalid = await fetch(`${baseUrl}/api/private/jobs/compress`, {
  body: invalidBody,
  headers: authorization,
  method: "POST",
});
assert.equal(invalid.status, 422, await invalid.text());

const forgedBytes = Buffer.alloc(16);
forgedBytes.writeUInt32BE(16, 0);
forgedBytes.write("ftyp", 4, "ascii");
const forgedBody = new FormData();
forgedBody.append("video", new Blob([forgedBytes], { type: "video/mp4" }), "forged.mp4");
const forgedUpload = await expectJson(
  await fetch(`${baseUrl}/api/private/jobs/compress`, {
    body: forgedBody,
    headers: authorization,
    method: "POST",
  }),
  202,
);
const forgedFailure = await waitFor(forgedUpload.data.job_id, new Set(["completed", "failed"]));
assert.equal(forgedFailure.status, "failed", JSON.stringify(forgedFailure));
assert.equal(forgedFailure.failure_code, "invalid_video");

const created = await upload(sourcePath);
const completed = await waitFor(created.job_id, new Set(["completed", "failed"]));
assert.equal(completed.status, "completed", JSON.stringify(completed));
assert.equal(completed.progress, 100);
assert.ok(completed.output_size_bytes > 0);

const rangeResponse = await fetch(`${baseUrl}${completed.download_url}`, {
  headers: { ...authorization, Range: "bytes=0-127" },
});
assert.equal(rangeResponse.status, 206);
assert.equal((await rangeResponse.arrayBuffer()).byteLength, 128);
assert.match(rangeResponse.headers.get("content-range") ?? "", /^bytes 0-127\/\d+$/);
assert.equal(rangeResponse.headers.get("cache-control"), "private, no-store, max-age=0");

const invalidRange = await fetch(`${baseUrl}${completed.download_url}`, {
  headers: { ...authorization, Range: "bytes=0-1,3-4" },
});
assert.equal(invalidRange.status, 416);

const outputResponse = await fetch(`${baseUrl}${completed.download_url}`, {
  headers: authorization,
});
assert.equal(outputResponse.status, 200);
const temporaryDirectory = await mkdtemp(path.join(os.tmpdir(), "lectum-video-e2e-"));
try {
  const outputPath = path.join(temporaryDirectory, "output.mp4");
  await writeFile(outputPath, Buffer.from(await outputResponse.arrayBuffer()));
  const probe = JSON.parse(
    execFileSync(
      ffprobePath,
      [
        "-v",
        "error",
        "-show_entries",
        "format=format_name:stream=codec_type,codec_name",
        "-of",
        "json",
        outputPath,
      ],
      { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
    ),
  );
  assert.match(probe.format.format_name, /(?:mov|mp4)/);
  assert.ok(
    probe.streams.some((stream) => stream.codec_type === "video" && stream.codec_name === "h264"),
  );
  assert.ok(
    probe.streams
      .filter((stream) => stream.codec_type === "audio")
      .every((stream) => stream.codec_name === "aac"),
  );
} finally {
  await rm(temporaryDirectory, { force: true, recursive: true });
}

if (cancelSourcePath) {
  const cancelJob = await upload(cancelSourcePath);
  const active = await waitFor(cancelJob.job_id, new Set(["processing", "completed"]), 30_000);
  assert.equal(active.status, "processing", "O arquivo de cancelamento terminou cedo demais.");
  const canceledResponse = await fetch(`${baseUrl}/api/private/jobs/${cancelJob.job_id}`, {
    headers: authorization,
    method: "DELETE",
  });
  assert.equal(canceledResponse.status, 202);
  const canceled = await waitFor(cancelJob.job_id, new Set(["canceled", "failed"]), 30_000);
  assert.equal(canceled.status, "canceled", JSON.stringify(canceled));
}

const removed = await fetch(`${baseUrl}/api/private/jobs/${created.job_id}`, {
  headers: authorization,
  method: "DELETE",
});
assert.equal(removed.status, 200);
assert.equal(
  (await fetch(`${baseUrl}/api/private/jobs/${created.job_id}`, { headers: authorization })).status,
  404,
);
assert.equal(
  (
    await fetch(`${baseUrl}/api/private/jobs/${forgedUpload.data.job_id}`, {
      headers: authorization,
      method: "DELETE",
    })
  ).status,
  200,
);

console.log(
  "[video-e2e] OK: autenticação, recusas, fila, FFmpeg, Range, cancelamento e remoção validados.",
);
