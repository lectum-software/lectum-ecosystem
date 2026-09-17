import "../../scripts/register-source-modules.mjs";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { openAsBlob } from "node:fs";
import { mkdtemp, open, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

const { copyVideoSource, VIDEO_COPY_CHUNK_BYTES } = await import("./video-source-copy.ts");
const { prepareVideoSource } = await import("./video-source-preparation.ts");
const { isExpiredVideoStagingFile, VIDEO_STAGING_RETENTION_MS, VideoPreparationFailure } =
  await import("./video-source-preparation-types.ts");

const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
test("cópia por stream em disco real mantém bytes, limite por escrita e tamanho", async () => {
  const dir = await mkdtemp(join(tmpdir(), "lectum-video-copy-"));
  try {
    const bytes = Buffer.alloc(VIDEO_COPY_CHUNK_BYTES * 3 + 17);
    for (let i = 0; i < bytes.length; i++) bytes[i] = i % 251;
    const path = join(dir, "source");
    await writeFile(path, bytes);
    const original = await openAsBlob(path);
    const sink = await open(join(dir, "copy"), "w");
    let maxWrite = 0;
    const progress = [];
    try {
      assert.equal(
        await copyVideoSource(
          original,
          Promise.resolve({
            async write(part) {
              maxWrite = Math.max(maxWrite, part.length);
              await sink.write(part);
            },
          }),
          new AbortController().signal,
          (p) => progress.push(p),
        ),
        bytes.length,
      );
    } finally {
      await sink.close();
    }
    await writeFile(path, "origem posteriormente substituída");
    assert.equal(hash(await readFile(join(dir, "copy"))), hash(bytes));
    assert.ok(maxWrite <= VIDEO_COPY_CHUNK_BYTES);
    assert.equal(progress.at(-1), 100);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
test("cancelamento real não continua a gravar partes após abort", async () => {
  const dir = await mkdtemp(join(tmpdir(), "lectum-video-cancel-"));
  try {
    const out = await open(join(dir, "copy"), "w");
    const controller = new AbortController();
    let writes = 0;
    try {
      await assert.rejects(
        copyVideoSource(
          new Blob([new Uint8Array(VIDEO_COPY_CHUNK_BYTES * 3)]),
          Promise.resolve({
            async write(bytes) {
              await out.write(bytes);
              writes++;
              controller.abort();
            },
          }),
          controller.signal,
        ),
        { name: "AbortError" },
      );
      assert.equal(writes, 1);
    } finally {
      await out.close();
    }
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
test("fonte real alterada é recusada em vez de produzir cópia truncada", async () => {
  const dir = await mkdtemp(join(tmpdir(), "lectum-video-invalid-"));
  try {
    const path = join(dir, "source");
    await writeFile(path, "original");
    const file = await openAsBlob(path);
    await writeFile(path, "alterado-no-disco");
    const out = await open(join(dir, "copy"), "w");
    try {
      await assert.rejects(
        copyVideoSource(
          file,
          Promise.resolve({
            async write(bytes) {
              await out.write(bytes);
            },
          }),
          new AbortController().signal,
        ),
      );
    } finally {
      await out.close();
    }
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
test("sem OPFS usa capacidade direta validada; não promete cópia privada", async () => {
  const original = new File([new Uint8Array(32)], "video.mp4", { type: "video/mp4" });
  const result = await prepareVideoSource(original);
  assert.equal(result.file, original);
  assert.equal(result.storage, "direct");
  await result.cleanup();
  await assert.rejects(prepareVideoSource(new File([], "empty.mp4", { type: "video/mp4" })), {
    code: "read_failed",
  });
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(prepareVideoSource(original, { signal: controller.signal }), {
    name: "AbortError",
  });
});
test("retenção reconhece apenas namespace nominal próprio expirado e erros não guardam causas", () => {
  const now = Date.now(),
    id = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa.video";
  assert.equal(
    isExpiredVideoStagingFile(`${now - VIDEO_STAGING_RETENTION_MS - 1}-${id}`, now),
    true,
  );
  assert.equal(isExpiredVideoStagingFile(`${now}-${id}`, now), false);
  assert.equal(isExpiredVideoStagingFile("video-pessoal.mp4", now), false);
  assert.equal(isExpiredVideoStagingFile(`0-${id}`, now), false);
  const e = new VideoPreparationFailure("storage_full");
  assert.equal(e.cause, undefined);
  assert.match(e.message, /espaço/);
});

test("cancelamento agendado como task interrompe escrita síncrona sem depender de microtasks", async () => {
  const dir = await mkdtemp(join(tmpdir(), "lectum-video-task-cancel-"));
  const out = await open(join(dir, "copy"), "w");
  const controller = new AbortController();
  let written = 0;
  try {
    await assert.rejects(
      copyVideoSource(
        new Blob([new Uint8Array(VIDEO_COPY_CHUNK_BYTES * 8)]),
        Promise.resolve({
          async write(bytes) {
            await out.write(bytes);
            if (!written) setTimeout(() => controller.abort(), 0);
            written += bytes.byteLength;
          },
        }),
        controller.signal,
      ),
      { name: "AbortError" },
    );
    assert.ok(written > 0 && written <= VIDEO_COPY_CHUNK_BYTES);
  } finally {
    await out.close();
    await rm(dir, { recursive: true, force: true });
  }
});
