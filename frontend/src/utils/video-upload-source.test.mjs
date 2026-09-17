import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { openAsBlob } from "node:fs";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import { TUS_CHUNK_SIZE_BYTES } from "./video-stream.ts";
import { tusRequestMethod, VideoUploadFailure } from "./video-upload-diagnostics.ts";
import { createBufferedVideoSource, VideoSourceFailure } from "./video-upload-source.ts";

const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");

describe("leitura real por partes sem alterar os bytes", () => {
  it("preserva hash, limite e EOF, incluindo offsets não alinhados de retomada", async () => {
    const bytes = Buffer.alloc(TUS_CHUNK_SIZE_BYTES * 2 + 17);
    for (let i = 0; i < bytes.length; i++) bytes[i] = i % 251;
    const source = createBufferedVideoSource(new Blob([bytes]), TUS_CHUNK_SIZE_BYTES);
    const output = createHash("sha256");
    for (let start = 0; start < bytes.length; start += TUS_CHUNK_SIZE_BYTES) {
      const end = Math.min(start + TUS_CHUNK_SIZE_BYTES, bytes.length);
      const part = await source.slice(start, end);
      assert.equal(part.value instanceof Blob, true);
      assert.equal(part.value.size, end - start);
      assert.equal(part.done, end === bytes.length);
      output.update(Buffer.from(await part.value.arrayBuffer()));
    }
    assert.equal(output.digest("hex"), digest(bytes));
    const resumed = await source.slice(12345, 12345 + TUS_CHUNK_SIZE_BYTES);
    assert.equal(
      digest(Buffer.from(await resumed.value.arrayBuffer())),
      digest(bytes.subarray(12345, 12345 + TUS_CHUNK_SIZE_BYTES)),
    );
    assert.deepEqual(await source.slice(bytes.length, Infinity), { value: null, done: true });
    source.close();
  });

  it("parte em memória sobrevive à alteração real da origem; próxima leitura falha sem texto externo", async () => {
    const directory = await mkdtemp(join(tmpdir(), "lectum-source-test-"));
    try {
      const path = join(directory, "input.bin");
      await writeFile(path, Buffer.from("original-original"));
      const file = await openAsBlob(path);
      const source = createBufferedVideoSource(file, 8);
      const first = await source.slice(0, 8);
      // Altera o arquivo real: sem substituir FileReader nem endpoint.
      await writeFile(path, Buffer.from("changed-on-disk-and-longer"));
      assert.equal(await first.value.text(), "original");
      assert.equal(await (await source.slice(0, 8)).value.text(), "original");
      assert.equal(await (await source.slice(2, 6)).value.text(), "igin");
      await assert.rejects(source.slice(8, 16), (error) => {
        assert.equal(error instanceof VideoSourceFailure, true);
        assert.ok(["unreadable", "unknown"].includes(error.code));
        assert.equal(error.cause, undefined);
        assert.doesNotMatch(JSON.stringify(error), /input\.bin|changed-on-disk|file:\/\//);
        return true;
      });
      source.close();
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("fecha leitura pendente e cache; cancelamento é idempotente e não reabre a fonte", async () => {
    const source = createBufferedVideoSource(
      new Blob([new Uint8Array(TUS_CHUNK_SIZE_BYTES)]),
      TUS_CHUNK_SIZE_BYTES,
    );
    const pending = source.slice(0, TUS_CHUNK_SIZE_BYTES);
    source.close();
    source.close();
    await assert.rejects(pending, { name: "AbortError" });
    await assert.rejects(source.slice(0, 1), { name: "AbortError" });
  });

  it("recusa intervalo inválido ou maior que a parte, sem materializar o vídeo inteiro", async () => {
    const source = createBufferedVideoSource(new Blob([new Uint8Array(20)]), 8);
    for (const [start, end] of [
      [0, 9],
      [-1, 2],
      [2, 1],
      [0.1, 2],
      [NaN, 8],
      [0, NaN],
      [21, 22],
    ]) {
      await assert.rejects(source.slice(start, end), { code: "invalid_range" });
    }
    source.close();
    for (const size of [0, -1, Infinity, NaN]) {
      assert.throws(() => createBufferedVideoSource(new Blob([]), size), { code: "invalid_range" });
    }
  });

  it("erro público diferencia leitura e conserva apenas diagnóstico fechado", () => {
    const failure = new VideoUploadFailure(0, "transport", {
      request: "PATCH",
      source: "failed",
      sourceFailure: "unreadable",
    });
    assert.match(failure.message, /ler o vídeo selecionado/);
    assert.equal(failure.reason, "transport");
    assert.equal(failure.cause, undefined);
    assert.equal(tusRequestMethod(null), "unknown");
    assert.equal(tusRequestMethod(new Error("texto privado")), "unknown");
  });
});
